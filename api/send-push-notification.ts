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
 *   VAPID_PUBLIC_KEY   — base64url VAPID public key
 *   VAPID_PRIVATE_KEY  — base64url VAPID private key
 *   VAPID_SUBJECT      — mailto: or https: URI (contact for push servers)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_URL
 *   VITE_APP_URL       — defaults to https://pepite-citron.com
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { supabaseAdmin as supabase } from './_lib/supabaseAdmin';
import { requireOrgAdmin } from './_lib/auth';
import { pushNotificationSchema } from './_lib/validation';

const APP_URL = process.env.VITE_APP_URL || 'https://pepite-citron.com';

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT || `mailto:francois@pepite-citron.com`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Require VAPID keys — skip gracefully if not configured
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('send-push-notification: VAPID keys not set, skipping');
    return res.status(200).json({ skipped: true });
  }

  const parsed = pushNotificationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Requête invalide' });
  const { orgId, type, matchLabel, matchId } = parsed.data;

  // Only an admin of this org may push to its subscribers.
  const auth = await requireOrgAdmin(req, orgId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  // A reminder only goes to present players who have not voted yet and whose
  // player is linked to an account (push subscriptions are per user).
  let targetUserIds: string[] | null = null;
  if (type === 'vote_reminder') {
    targetUserIds = await pendingVoterUserIds(orgId, matchId as string);
    if (targetUserIds.length === 0) return res.status(200).json({ sent: 0 });
  }

  // Fetch the org's push subscriptions (only the targeted users for a reminder)
  let subsQuery = supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
    .eq('org_id', orgId);
  if (targetUserIds) subsQuery = subsQuery.in('user_id', targetUserIds);
  const { data: subs, error: subsErr } = await subsQuery;

  if (subsErr) {
    console.error('fetch push_subscriptions error:', subsErr);
    return res.status(200).json({ sent: 0 });
  }

  if (!subs || subs.length === 0) {
    return res.status(200).json({ sent: 0 });
  }

  // Build notification payload
  const content = {
    vote_open:     { title: '🗳️ Vote ouvert !',         body: `Désigne la pépite et le citron de ${matchLabel}` },
    vote_reminder: { title: '⏰ Il manque ton vote !',   body: `Désigne la pépite et le citron de ${matchLabel} avant la fermeture` },
    results_ready: { title: '🏆 Résultats disponibles !', body: `Les résultats de ${matchLabel} sont prêts` },
  }[type];
  const payload = JSON.stringify({
    type,
    ...content,
    // Never the bare APP_URL: "/" is the marketing landing (vercel.json), not
    // the app. Subscribers are always signed in (push_subscriptions.user_id),
    // so the plain app routes are enough.
    url: type === 'results_ready'
      ? `${APP_URL}/results`
      : `${APP_URL}/vote`,
    icon:  '/icon-192x192.png',
    badge: '/icon-192x192.png',
  });

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  // Fan-out to all subscribers (parallel, best-effort)
  const staleEndpoints: string[] = [];

  await Promise.allSettled(
    (subs as Array<{ endpoint: string; p256dh: string; auth: string; user_id: string }>)
      .map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 60 * 60 }, // 1 hour TTL — discard if device is offline > 1 h
          );
        } catch (err) {
          // 410 Gone or 404 Not Found → subscription expired, remove it
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            staleEndpoints.push(sub.endpoint);
          } else {
            console.error('push delivery error:', err);
          }
        }
      }),
  );

  // Clean up expired subscriptions
  if (staleEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', staleEndpoints);
  }

  const sent = subs.length - staleEndpoints.length;
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
