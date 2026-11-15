import fs from 'fs';
import path from 'path';
import { pathToRegexp } from 'path-to-regexp';
import { describe, expect, it } from 'vitest';
import middleware, { SWEAT_DESTINATION, config } from './middleware';

// https://pepite-citron.com/sweat is printed on sweatshirts (QR code).
const ORIGIN = 'https://pepite-citron.com';
const hit = (pathAndQuery: string) => middleware(new Request(ORIGIN + pathAndQuery));

describe('/sweat (printed QR code)', () => {
  it.each(['/sweat', '/sweat/', '/SWEAT', '/SWEAT/', '/Sweat'])('%s → 302 to /start with the utm tags', (p) => {
    const res = hit(p);
    expect(res?.status).toBe(302);
    expect(res?.headers.get('Location')).toBe('/start?utm_source=sweat&utm_medium=qr&utm_campaign=sweat');
    expect(res?.headers.get('Location')).toBe(SWEAT_DESTINATION);
    expect(res?.headers.get('Cache-Control')).toBe('no-store');
    expect(res?.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('keeps the query parameters already on the URL (they win)', () => {
    const loc = hit('/sweat?ref=paris&utm_campaign=sweat2')?.headers.get('Location') ?? '';
    const target = new URL(loc, ORIGIN);
    expect(target.pathname).toBe('/start');
    expect(Object.fromEntries(target.searchParams)).toEqual({
      utm_source: 'sweat', utm_medium: 'qr', utm_campaign: 'sweat2', ref: 'paris',
    });
  });

  it('does not force a language (no /fr, /en, /nl prefix)', () => {
    expect(new URL(SWEAT_DESTINATION, ORIGIN).pathname).toBe('/start');
  });

  it('leaves other pages alone', () => {
    for (const p of ['/start', '/sweatshirt', '/sweat/x', '/en/sweat', '/']) expect(hit(p)).toBeUndefined();
  });

  it('runs the middleware on every spelling of /sweat', () => {
    // Same compiler and options as Vercel (path-to-regexp 6, via @vercel/node):
    // strict and case-sensitive, hence the spelled-out variants.
    const matchers = config.matcher.map(m => pathToRegexp(m, [], { strict: true, sensitive: true }));
    for (const p of ['/sweat', '/sweat/', '/SWEAT', '/SWEAT/', '/SwEaT']) {
      expect(matchers.some(r => r.test(p)), p).toBe(true);
    }
    expect(matchers.some(r => r.test('/start'))).toBe(false);
  });

  it('is not in the sitemap nor allowed in robots.txt', () => {
    const read = (f: string) => fs.readFileSync(path.resolve(__dirname, 'public', f), 'utf8');
    expect(read('sitemap.xml')).not.toMatch(/sweat/i);
    expect(read('robots.txt')).not.toMatch(/sweat/i);
    expect(read('robots.txt')).toMatch(/^Disallow: \/$/m);
  });
});
