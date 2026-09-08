import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Service role bypasses RLS — required to delete auth user server-side
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // The caller must supply a valid JWT (their own session token)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const token = authHeader.slice(7);

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const userId = user.id;

  try {
    // ── 1. Determine which orgs would be left without an admin ────────────────
    //    MUST run before any membership is deleted.
    const { data: adminMemberships } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId)
      .eq('role', 'admin');

    const soloOrgIds: string[] = [];
    for (const { org_id } of adminMemberships ?? []) {
      const { count } = await supabase
        .from('org_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org_id)
        .eq('role', 'admin')
        .neq('user_id', userId);
      if ((count ?? 0) === 0) soloOrgIds.push(org_id);
    }

    // ── 2. Cancel the Stripe subscription of every org about to be deleted ────
    if (stripe && soloOrgIds.length > 0) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, stripe_subscription_id')
        .in('id', soloOrgIds);

      for (const org of orgs ?? []) {
        if (!org.stripe_subscription_id) continue;
        try {
          await stripe.subscriptions.cancel(org.stripe_subscription_id);
        } catch (err) {
          // Already cancelled / unknown — log and continue, deletion must proceed
          console.error('[delete-account] stripe cancel failed', org.id, err);
        }
      }
    }

    // ── 3. Delete the sole-admin orgs (cascade removes their matches, players,
    //       teams, votes, guest_tokens and org_members rows) ──────────────────
    if (soloOrgIds.length > 0) {
      await supabase.from('organizations').delete().in('id', soloOrgIds);
    }

    // ── 4. Remove the user's personal data from orgs that still exist ─────────
    //    Their votes are linked through their claimed player records.
    const { data: linkedPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', userId);

    const playerIds = (linkedPlayers ?? []).map(p => p.id);
    if (playerIds.length > 0) {
      await supabase.from('votes').delete().in('voter_player_id', playerIds);
      // Keep the roster entry for match-history integrity, but strip the link
      // and any profile data that belongs to the person.
      await supabase
        .from('players')
        .update({ user_id: null, avatar_url: null, nickname: null })
        .in('id', playerIds);
    }

    // ── 5. Remaining memberships, then the auth user (must be last) ───────────
    await supabase.from('org_members').delete().eq('user_id', userId);

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[delete-account]', message);
    return res.status(500).json({ error: message });
  }
}
