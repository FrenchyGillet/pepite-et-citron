import webpush from 'web-push';
import { supabaseAdmin as supabase } from './supabaseAdmin.js';

/**
 * Web Push fan-out shared by /api/send-push-notification and the scheduled
 * matches cron. Env is read at call time: VAPID_PUBLIC_KEY (or
 * VITE_VAPID_PUBLIC_KEY), VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 */
export interface PushContent {
  type: string;
  title: string;
  body: string;
  url: string;
}

export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY) && !!process.env.VAPID_PRIVATE_KEY;
}

/**
 * Sends to the org's subscribers (all of them, or only `userIds` / all but
 * `exceptUserIds`). Never throws; expired subscriptions are removed. Returns
 * the number of devices reached.
 */
export async function pushToOrg(
  orgId: string,
  content: PushContent,
  opts: { userIds?: string[]; exceptUserIds?: string[] } = {},
): Promise<number> {
  if (!pushConfigured()) return 0;
  if (opts.userIds && opts.userIds.length === 0) return 0;

  let query = supabase.from('push_subscriptions').select('endpoint, p256dh, auth, user_id').eq('org_id', orgId);
  if (opts.userIds) query = query.in('user_id', opts.userIds);
  const { data, error } = await query;
  if (error) {
    console.error('fetch push_subscriptions error:', error);
    return 0;
  }
  const except = new Set(opts.exceptUserIds ?? []);
  const subs = ((data ?? []) as Array<{ endpoint: string; p256dh: string; auth: string; user_id: string }>)
    .filter(s => !except.has(s.user_id));
  if (subs.length === 0) return 0;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:francois@pepite-citron.com',
    (process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY) as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
  const payload = JSON.stringify({ ...content, icon: '/icon-192x192.png', badge: '/icon-192x192.png' });

  const stale: string[] = [];
  await Promise.allSettled(subs.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 * 60 }, // 1 hour: discard if the device is offline longer
      );
    } catch (err) {
      // 410 Gone / 404 Not Found: the subscription expired, remove it.
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) stale.push(sub.endpoint);
      else console.error('push delivery error:', err);
    }
  }));

  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', stale);
  }
  return subs.length - stale.length;
}
