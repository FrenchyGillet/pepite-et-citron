/**
 * POST /api/send-push-notification
 *
 * Fans out a Web Push notification to all subscribers of an org.
 * Called fire-and-forget from mutations.ts (useCreateMatch, useStartCounting),
 * and by the admin's "Relancer" button (vote_reminder: pending voters only).
 *
 * Body: { orgId: string; type: 'vote_open' | 'results_ready' | 'vote_reminder'; matchLabel: string; matchId?: string (required for vote_reminder) }
 * Auth: Bearer <user JWT>
 *
 * Requires env vars:
 *   VAPID_PUBLIC_KEY   — base64url VAPID public key (or VITE_VAPID_PUBLIC_KEY)
 *   VAPID_PRIVATE_KEY  — base64url VAPID private key
 *   VAPID_SUBJECT      — mailto: or https: URI (contact for push servers)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_URL
 *   VITE_APP_URL       — defaults to https://pepite-citron.com
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin as supabase } from './_lib/supabaseAdmin.js';
import { requireOrgMatchRunner } from './_lib/auth.js';
import { pushNotificationSchema } from './_lib/validation.js';
import { pushConfigured, pushToOrg } from './_lib/push.js';

const APP_URL = process.env.VITE_APP_URL || 'https://pepite-citron.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Require VAPID keys — skip gracefully if not configured
  if (!pushConfigured()) {
    console.warn('send-push-notification: VAPID keys not set, skipping');
    return res.status(200).json({ skipped: true });
  }

  const parsed = pushNotificationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Requête invalide' });
  const { orgId, type, matchLabel, matchId } = parsed.data;

  // Only an admin or captain of this org may push to its subscribers.
  const auth = await requireOrgMatchRunner(req, orgId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  // A reminder only goes to present players who have not voted yet and whose
  // player is linked to an account (push subscriptions are per user).
  let targetUserIds: string[] | undefined;
  if (type === 'vote_reminder') {
    targetUserIds = await pendingVoterUserIds(orgId, matchId as string);
    if (targetUserIds.length === 0) return res.status(200).json({ sent: 0 });
  }

  const content = {
    vote_open:     { title: '🗳️ Vote ouvert !',         body: `Désigne la pépite et le citron de ${matchLabel}` },
    vote_reminder: { title: '⏰ Il manque ton vote !',   body: `Désigne la pépite et le citron de ${matchLabel} avant la fermeture` },
    results_ready: { title: '🏆 Résultats disponibles !', body: `Les résultats de ${matchLabel} sont prêts` },
  }[type];

  const sent = await pushToOrg(orgId, {
    type,
    ...content,
    // Never the bare APP_URL: "/" is the marketing landing (vercel.json), not
    // the app. Subscribers are always signed in (push_subscriptions.user_id),
    // so the plain app routes are enough.
    url: type === 'results_ready' ? `${APP_URL}/results` : `${APP_URL}/vote`,
  }, { userIds: targetUserIds });
  return res.status(200).json({ sent });
}

/**
 * Account ids of the match's present players who have not voted yet. Read with
 * the service role: ballots are not readable through RLS. A vote counts for a
 * player by id, or by first name for ballots cast before voter_player_id.
 */
async function pendingVoterUserIds(orgId: string, matchId: string): Promise<string[]> {
  const { data: match } = await supabase
    .from('matches')
    .select('org_id, phase, present_ids')
    .eq('id', matchId)
    .maybeSingle();
  const m = match as { org_id: string; phase: string; present_ids: Array<string | number> } | null;
  if (!m || m.org_id !== orgId || m.phase !== 'voting' || !m.present_ids?.length) return [];

  const [{ data: players }, { data: votes }] = await Promise.all([
    supabase.from('players').select('id, name, user_id').in('id', m.present_ids),
    supabase.from('votes').select('voter_player_id, voter_name').eq('match_id', matchId),
  ]);
  const ballots = (votes ?? []) as Array<{ voter_player_id: string | number | null; voter_name: string }>;
  const votedIds   = new Set(ballots.map(v => String(v.voter_player_id)));
  const votedNames = new Set(ballots.map(v => v.voter_name));
  return ((players ?? []) as Array<{ id: string | number; name: string; user_id: string | null }>)
    .filter(p => p.user_id && !votedIds.has(String(p.id)) && !votedNames.has(p.name))
    .map(p => p.user_id as string);
}
