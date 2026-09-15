import { describe, expect, it } from 'vitest';
import { sharedLandingUrl } from '@/utils/share';

describe('sharedLandingUrl', () => {
  it('points at the landing with a campaign tag', () => {
    const url = new URL(sharedLandingUrl('podium'));
    expect(url.origin).toBe('https://pepite-citron.com');
    expect(url.pathname).toBe('/');
    expect(url.searchParams.get('utm_source')).toBe('share');
    expect(url.searchParams.get('utm_campaign')).toBe('podium');
    // "/?org=" / "/?guest=" open the app instead of the landing (vercel.json)
    expect(url.searchParams.has('org')).toBe(false);
    expect(url.searchParams.has('guest')).toBe(false);
  });
});
