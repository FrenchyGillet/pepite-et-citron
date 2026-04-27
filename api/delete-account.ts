import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Service role bypasses RLS — required to delete auth user server-side
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // The caller must supply a valid JWT (their own session token)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  // Verify the token and get the user's identity
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const userId = user.id;

  try {
    // 1. Delete the user's votes
    await supabase.from('votes').delete().eq('voter_id', userId);

    // 2. Remove from org memberships
    await supabase.from('org_members').delete().eq('user_id', userId);

    // 3. Delete orgs where the user is the sole admin (cascade will handle related data)
    //    Find orgs where this user is admin
    const { data: adminOrgs } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId)
      .eq('role', 'admin');

    if (adminOrgs && adminOrgs.length > 0) {
      for (const { org_id } of adminOrgs) {
        // Check if there are other admins
        const { count } = await supabase
          .from('org_members')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org_id)
          .eq('role', 'admin')
          .neq('user_id', userId);

        if ((count ?? 0) === 0) {
          // Sole admin → delete the org (cascade handles matches, players, teams, votes)
          await supabase.from('organizations').delete().eq('id', org_id);
        }
      }
    }

    // 4. Delete the auth user (must be last)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[delete-account]', message);
    return res.status(500).json({ error: message });
  }
}
