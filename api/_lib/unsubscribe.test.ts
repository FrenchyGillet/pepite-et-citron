import { afterEach, describe, expect, it, vi } from 'vitest';
import { unsubscribeToken, unsubscribeUrl, verifyUnsubscribeToken } from './unsubscribe';

afterEach(() => vi.unstubAllEnvs());

describe('unsubscribe links', () => {
  it('a link verifies for its own member and team only', () => {
    vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'secret-1');
    const t = unsubscribeToken('user-1', 'org-1');
    expect(verifyUnsubscribeToken('user-1', 'org-1', t)).toBe(true);
    expect(verifyUnsubscribeToken('user-2', 'org-1', t)).toBe(false);
    expect(verifyUnsubscribeToken('user-1', 'org-2', t)).toBe(false);
    expect(verifyUnsubscribeToken('user-1', 'org-1', t.slice(1))).toBe(false);
    expect(verifyUnsubscribeToken('user-1', 'org-1', '')).toBe(false);
  });

  it('depends on the server secret', () => {
    vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'secret-1');
    const t = unsubscribeToken('user-1', 'org-1');
    vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'secret-2');
    expect(verifyUnsubscribeToken('user-1', 'org-1', t)).toBe(false);
  });

  it('refuses everything when no secret is configured', () => {
    vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect(verifyUnsubscribeToken('user-1', 'org-1', unsubscribeToken('user-1', 'org-1'))).toBe(false);
  });

  it('builds the endpoint URL', () => {
    vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'secret-1');
    const url = new URL(unsubscribeUrl('https://pepite-citron.com', 'user-1', 'org-1'));
    expect(url.pathname).toBe('/api/unsubscribe');
    expect(url.searchParams.get('u')).toBe('user-1');
    expect(url.searchParams.get('o')).toBe('org-1');
    expect(verifyUnsubscribeToken('user-1', 'org-1', url.searchParams.get('t')!)).toBe(true);
  });
});
