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

/**
 * What remains of a deleted person's ballot: the picks still count for the
 * team's history, but nothing identifies the voter any more.
 */
const ANONYMIZED_BALLOT = {
  voter_player_id: null,
  voter_name:      'Ancien joueur',
  best1_comment:   null,
  best2_comment:   null,
  best3_comment:   null,
  lemon_comment:   null,
};

type QueryResult = { data: unknown; error: { message: string } | null };

/** Awaits a query and throws on error — no step may fail silently. */
async function must<T>(label: string, query: PromiseLike<QueryResult>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data as T;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // The caller must supply a valid JWT (their own session token)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Session expirée, reconnecte-toi.' });
  }
  const token = authHeader.slice(7);

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'Session expirée, reconnecte-toi.' });
  }
  const userId = user.id;

  try {
    // ── 1. Teams where the caller is the only admin ───────────────────────────
    //    MUST run before any membership is deleted.
    const adminOf = await must<Array<{ org_id: string }> | null>('admin memberships',
      supabase.from('org_members').select('org_id').eq('user_id', userId).eq('role', 'admin'));

    const soloOrgIds: string[] = [];     // nobody else has an account: delete
    const blockedOrgIds: string[] = [];  // other members, no other admin: refuse
    for (const { org_id } of adminOf ?? []) {
      const others = await must<Array<{ role: string }> | null>('other members',
        supabase.from('org_members').select('user_id, role').eq('org_id', org_id).neq('user_id', userId)) ?? [];
      if (others.some(m => m.role === 'admin')) continue;
      if (others.length > 0) blockedOrgIds.push(org_id);
      else soloOrgIds.push(org_id);
    }

    // ── 2. Never wipe a team other people still use ───────────────────────────
    //    The admin names a successor first (Admin → Paramètres → Membres).
    if (blockedOrgIds.length > 0) {
      const orgs = await must<Array<{ name: string }> | null>('blocked team names',
        supabase.from('organizations').select('name').in('id', blockedOrgIds)) ?? [];
      const names = orgs.map(o => o.name).join(', ') || 'ton équipe';
      return res.status(409).json({
        code:  'sole_admin',
        error: `Tu es le seul administrateur de ${names}. Nomme un autre admin (Admin → Paramètres → Membres) avant de supprimer ton compte.`,
      });
    }

    // ── 3. Cancel the Stripe subscription of every team about to be deleted ───
    if (stripe && soloOrgIds.length > 0) {
      const orgs = await must<Array<{ id: string; stripe_subscription_id: string | null }> | null>('team subscriptions',
        supabase.from('organizations').select('id, stripe_subscription_id').in('id', soloOrgIds)) ?? [];
      for (const org of orgs) {
        if (!org.stripe_subscription_id) continue;
        try {
          await stripe.subscriptions.cancel(org.stripe_subscription_id);
        } catch (err) {
          // Already cancelled / unknown — log and continue, deletion must proceed
          console.error('[delete-account] stripe cancel failed', org.id, err);
        }
      }
    }

    // ── 4. Delete the teams only the caller used (cascade removes their
    //       matches, players, teams, votes, guest links and memberships) ──────
    if (soloOrgIds.length > 0) {
      await must('delete teams', supabase.from('organizations').delete().in('id', soloOrgIds));
    }

    // ── 5. Anonymize the caller's ballots in the teams that remain ────────────
    //    Deleting them would change teammates' results and season stats.
    const linked = await must<Array<{ id: number; name: string; org_id: string }> | null>('linked players',
      supabase.from('players').select('id, name, org_id').eq('user_id', userId)) ?? [];
    for (const player of linked) {
      await must('anonymize ballots',
        supabase.from('votes').update(ANONYMIZED_BALLOT).eq('voter_player_id', player.id));
      // Ballots cast before voter_player_id existed carry only the first name
      // (unique within a team roster).
      const matches = await must<Array<{ id: number }> | null>('team matches',
        supabase.from('matches').select('id').eq('org_id', player.org_id)) ?? [];
      if (matches.length > 0) {
        await must('anonymize legacy ballots',
          supabase.from('votes').update(ANONYMIZED_BALLOT)
            .in('match_id', matches.map(m => m.id))
            .is('voter_player_id', null)
            .eq('voter_name', player.name));
      }
    }
    if (linked.length > 0) {
      // Keep the roster entry for match-history integrity, but strip the link
      // and any profile data that belongs to the person.
      await must('unlink players',
        supabase.from('players').update({ user_id: null, avatar_url: null, nickname: null })
          .in('id', linked.map(p => p.id)));
    }

    // ── 6. Remaining memberships, then the auth user (must be last; push
    //       subscriptions cascade with it) ──────────────────────────────────
    await must('memberships', supabase.from('org_members').delete().eq('user_id', userId));

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    console.error('[delete-account]', err);
    return res.status(500).json({ error: "La suppression du compte a échoué. Réessaie, ou écris-nous si ça persiste." });
  }
}
