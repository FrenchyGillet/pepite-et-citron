/**
 * POST /api/send-push-notification
 *
 * Fans out a Web Push notification to all subscribers of an org.
 * Called fire-and-forget from mutations.ts (useCreateMatch, useStartCounting).
 *
 * Body: { orgId: string; type: 'vote_open' | 'results_ready'; matchLabel: string; matchId?: string }
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
import { createClient } from '@supabase/supabase-js';

const APP_URL = process.env.VITE_APP_URL || 'https://pepite-citron.com';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

  // Verify caller JWT
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { orgId, type, matchLabel, matchId } = req.body as {
    orgId?: string;
    type?: 'vote_open' | 'results_ready';
    matchLabel?: string;
    matchId?: string;
  };

  if (!orgId || !type || !matchLabel) {
    return res.status(400).json({ error: 'Missing params' });
  }

  // Fetch all push subscriptions for this org
  const { data: subs, error: subsErr } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
    .eq('org_id', orgId);

  if (subsErr) {
    console.error('fetch push_subscriptions error:', subsErr);
    return res.status(200).json({ sent: 0 });
  }

  if (!subs || subs.length === 0) {
    return res.status(200).json({ sent: 0 });
  }

  // Build notification payload
  const isVoteOpen = type === 'vote_open';
  const payload = JSON.stringify({
    type,
    title: isVoteOpen ? '🗳️ Vote ouvert !' : '🏆 Résultats disponibles !',
    body:  isVoteOpen
      ? `Désigne la pépite et le citron de ${matchLabel}`
      : `Les résultats de ${matchLabel} sont prêts`,
    url: isVoteOpen
      ? APP_URL
      : `${APP_URL}/results`,
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
