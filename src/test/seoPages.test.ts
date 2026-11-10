/// <reference types="node" />
/**
 * Static SEO pages are wired in four places (sitemap, robots.txt, vercel.json
 * rewrites, the HTML itself). A page missing from any of them is silently
 * invisible to Google or served as the SPA — keep them consistent.
 *
 * Each page exists in French (root URLs), English (/en/…) and Dutch (/nl/…):
 * the three versions point at each other (hreflang + language menu).
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fr } from '@/i18n/fr';
import { en } from '@/i18n/en';
import { nl } from '@/i18n/nl';

const root = path.resolve(__dirname, '../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

interface Rewrite { source: string; destination: string; missing?: unknown }
const rewrites = (JSON.parse(read('vercel.json')) as { rewrites: Rewrite[] }).rewrites;
const catchAll = rewrites.findIndex(r => r.source === '/(.*)');

const sitemapUrls = [...read('public/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]));
const robotsAllow = [...read('public/robots.txt').matchAll(/^Allow:\s*(\S+)/gm)].map(m => m[1]);

const isAllowed = (pathname: string) =>
  robotsAllow.some(rule => rule.endsWith('$') ? pathname === rule.slice(0, -1) : pathname.startsWith(rule));

function fileFor(pathname: string): string {
  if (pathname === '/') return 'public/landing.html';
  const rewrite = rewrites.find(r => r.source === pathname);
  return path.join('public', rewrite ? rewrite.destination : pathname);
}

type Lang = 'fr' | 'en' | 'nl';
const localeOf = (pathname: string): Lang =>
  /^\/en(\/|$)/.test(pathname) ? 'en' : /^\/nl(\/|$)/.test(pathname) ? 'nl' : 'fr';
const OG_LOCALE: Record<Lang, string> = { fr: 'fr_BE', en: 'en_GB', nl: 'nl_BE' };

const LEGAL = /^\/(privacy|terms)\.html$|^\/(en|nl)\/(privacy|terms|voorwaarden)$/;
const pages = sitemapUrls.map(url => ({ url, html: read(fileFor(url.pathname)) }));
const seoPages = pages.filter(p => !LEGAL.test(p.url.pathname));
const known = new Set(sitemapUrls.map(u => u.pathname));

function jsonLdBlocks(html: string): unknown[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(m => JSON.parse(m[1]) as unknown);
}

function faqQuestions(blocks: unknown[]): string[] {
  const nodes = blocks.flatMap(b => {
    const graph = (b as { '@graph'?: unknown[] })['@graph'];
    return graph ?? [b];
  }) as Array<{ '@type'?: string; mainEntity?: Array<{ name: string }> }>;
  return nodes.filter(n => n['@type'] === 'FAQPage').flatMap(n => n.mainEntity ?? []).map(q => q.name);
}

/** hreflang → absolute URL, from the <link rel="alternate"> tags. */
function alternates(html: string): Record<string, string> {
  return Object.fromEntries(
    [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)" \/>/g)].map(m => [m[1], m[2]]),
  );
}

/** Internal links to site pages, the language menu (hreflang links) aside. */
function pageLinks(html: string): string[] {
  return [...html.matchAll(/href="(\/[^"#?]*)[^"]*"(?! hreflang)/g)].map(m => m[1]).filter(href => known.has(href));
}

describe('SEO static pages', () => {
  it.each(sitemapUrls.map(u => [u.pathname, u] as const))('%s is crawlable and served', (pathname, url) => {
    expect(url.origin).toBe('https://pepite-citron.com');
    expect(isAllowed(pathname)).toBe(true);
    expect(fs.existsSync(path.join(root, fileFor(pathname)))).toBe(true);

    const rewrite = rewrites.findIndex(r => r.source === pathname);
    if (rewrite !== -1) expect(rewrite).toBeLessThan(catchAll);
  });

  it.each(pages.map(p => [p.url.pathname, p] as const))('%s has a canonical URL and analytics', (_pathname, { url, html }) => {
    expect(html).toContain(`<link rel="canonical" href="${url.href}" />`);
    expect(html).toMatch(/cloud\.umami\.is\/script\.js"[^>]*data-domains="pepite-citron\.com"/);
  });

  it.each(seoPages.map(p => [p.url.pathname, p] as const))('%s has consistent metadata', (pathname, { html }) => {
    expect(html).toContain(`<meta property="og:locale"`);
    expect(html).toMatch(new RegExp(`property="og:locale"\\s+content="${OG_LOCALE[localeOf(pathname)]}"`));

    // Valid JSON-LD, and the FAQ rich result mirrors the visible FAQ exactly.
    const blocks = jsonLdBlocks(html);
    expect(blocks.length).toBeGreaterThan(0);
    const summaries = [...html.matchAll(/<summary>([^<]+)<\/summary>/g)].map(m => m[1].trim());
    expect(faqQuestions(blocks)).toEqual(summaries);
  });

  it('gives every page its own title', () => {
    const titles = pages.map(p => p.html.match(/<title>([^<]+)<\/title>/)?.[1]);
    expect(titles.every(Boolean)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('only links to guide pages that exist', () => {
    const guide = /href="(\/(?:homme-du-match|en\/man-of-the-match|nl\/man-van-de-match)[^"#?]*)"/g;
    const linked = seoPages.flatMap(p => [...p.html.matchAll(guide)].map(m => m[1]));
    expect(linked.length).toBeGreaterThan(0);
    for (const href of linked) expect(known).toContain(href);
  });
});

describe('Language versions of the static pages', () => {
  it.each(pages.map(p => [p.url.pathname, p] as const))('%s points at its FR, EN and NL versions', (pathname, { url, html }) => {
    const lang = localeOf(pathname);
    expect(html).toMatch(new RegExp(`<html lang="${lang}">`));

    // hreflang: the three languages + x-default (French, the root site), self included.
    const alts = alternates(html);
    expect(Object.keys(alts).sort()).toEqual(['en', 'fr', 'nl', 'x-default']);
    expect(alts[lang]).toBe(url.href);
    expect(alts['x-default']).toBe(alts.fr);

    for (const [hreflang, href] of Object.entries(alts)) {
      const alt = new URL(href);
      expect(known).toContain(alt.pathname);
      if (hreflang !== 'x-default') expect(localeOf(alt.pathname)).toBe(hreflang);
      // Reciprocal: every version lists the very same set.
      expect(alternates(read(fileFor(alt.pathname)))).toEqual(alts);
    }

    // The language menu (nav and footer) leads to those same pages.
    const menu = [...html.matchAll(/<a href="([^"]+)" hreflang="(fr|en|nl)" lang="\2" data-lang="\2"/g)];
    expect(menu.length).toBe(6);
    for (const [, href, l] of menu) expect(new URL(href, url).href).toBe(alts[l]);
    expect(html).toMatch(new RegExp(`<a href="[^"]+" hreflang="${lang}" lang="${lang}" data-lang="${lang}" aria-current="page"`));
    expect(html).toContain('<script defer src="/lang-switch.js"></script>');
  });

  it.each(pages.map(p => [p.url.pathname, p] as const))('%s links to pages in its own language', (pathname, { html }) => {
    const lang = localeOf(pathname);
    const links = pageLinks(html);
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) expect([href, localeOf(href)]).toEqual([href, lang]);
  });

  it('gives the app the legal pages in its own language', () => {
    for (const [lang, messages] of [['fr', fr], ['en', en], ['nl', nl]] as const) {
      for (const href of [messages.common.privacyUrl, messages.common.termsUrl]) {
        expect(known).toContain(href);
        expect(localeOf(href)).toBe(lang);
      }
    }
  });
});
