import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed, per-member unsubscribe links for the team emails (audit F10).
 * The link works without signing in, so it carries an HMAC of
 * (user, team): nobody can unsubscribe someone else by editing the URL.
 * Key: EMAIL_UNSUBSCRIBE_SECRET, falling back to the service-role key (both
 * server-only).
 */
function secret(): string {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function unsubscribeToken(userId: string, orgId: string): string {
  return createHmac('sha256', secret()).update(`unsubscribe:${userId}:${orgId}`).digest('base64url');
}

export function verifyUnsubscribeToken(userId: string, orgId: string, token: string): boolean {
  if (!secret() || !userId || !orgId || !token) return false;
  const expected = Buffer.from(unsubscribeToken(userId, orgId));
  const given    = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(appUrl: string, userId: string, orgId: string): string {
  const query = new URLSearchParams({ u: userId, o: orgId, t: unsubscribeToken(userId, orgId) });
  return `${appUrl}/api/unsubscribe?${query.toString()}`;
}
