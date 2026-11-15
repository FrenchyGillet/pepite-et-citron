import { describe, expect, it } from 'vitest';
import { SWEAT_DESTINATION, printedLinkTarget } from '@/utils/printedLinks';

// https://pepite-citron.com/sweat is printed on sweatshirts (QR code).
describe('printedLinkTarget', () => {
  it.each(['/sweat', '/sweat/', '/SWEAT', '/SWEAT/', '/Sweat'])('%s → /start with the utm tags', (p) => {
    expect(printedLinkTarget(p, '')).toBe('/start?utm_source=sweat&utm_medium=qr&utm_campaign=sweat');
    expect(printedLinkTarget(p, '')).toBe(SWEAT_DESTINATION);
  });

  it('keeps the query parameters already on the URL (they win)', () => {
    const target = new URL(printedLinkTarget('/sweat', '?ref=paris&utm_campaign=sweat2') ?? '', 'https://x.test');
    expect(target.pathname).toBe('/start');
    expect(Object.fromEntries(target.searchParams)).toEqual({
      utm_source: 'sweat', utm_medium: 'qr', utm_campaign: 'sweat2', ref: 'paris',
    });
  });

  it('leaves every other path alone', () => {
    for (const p of ['/', '/start', '/login', '/sweatshirt', '/sweat/x', '/en/sweat']) {
      expect(printedLinkTarget(p, '?utm_source=sweat')).toBeNull();
    }
  });
});
