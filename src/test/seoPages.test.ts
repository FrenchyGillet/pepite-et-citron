/// <reference types="node" />
/**
 * Static SEO pages are wired in four places (sitemap, robots.txt, vercel.json
 * rewrites, the HTML itself). A page missing from any of them is silently
 * invisible to Google or served as the SPA — keep them consistent.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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

const seoPages = sitemapUrls
  .filter(url => url.pathname === '/' || url.pathname.startsWith('/homme-du-match'))
  .map(url => ({ url, html: read(fileFor(url.pathname)) }));

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

describe('SEO static pages', () => {
  it.each(sitemapUrls.map(u => [u.pathname, u] as const))('%s is crawlable and served', (pathname, url) => {
    expect(url.origin).toBe('https://pepite-citron.com');
    expect(isAllowed(pathname)).toBe(true);
    expect(fs.existsSync(path.join(root, fileFor(pathname)))).toBe(true);

    const rewrite = rewrites.findIndex(r => r.source === pathname);
    if (rewrite !== -1) expect(rewrite).toBeLessThan(catchAll);
  });

  it.each(seoPages.map(p => [p.url.pathname, p] as const))('%s has consistent metadata', (_pathname, { url, html }) => {
    expect(html).toContain(`<link rel="canonical" href="${url.href}" />`);
    expect(html).toMatch(/cloud\.umami\.is\/script\.js"[^>]*data-domains="pepite-citron\.com"/);

    // Valid JSON-LD, and the FAQ rich result mirrors the visible FAQ exactly.
    const blocks = jsonLdBlocks(html);
    expect(blocks.length).toBeGreaterThan(0);
    const summaries = [...html.matchAll(/<summary>([^<]+)<\/summary>/g)].map(m => m[1].trim());
    expect(faqQuestions(blocks)).toEqual(summaries);
  });

  it('gives every page its own title', () => {
    const titles = seoPages.map(p => p.html.match(/<title>([^<]+)<\/title>/)?.[1]);
    expect(titles.every(Boolean)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('only links to guide pages that exist', () => {
    const known = new Set(sitemapUrls.map(u => u.pathname));
    const linked = seoPages.flatMap(p => [...p.html.matchAll(/href="(\/homme-du-match[^"#?]*)"/g)].map(m => m[1]));
    expect(linked.length).toBeGreaterThan(0);
    for (const href of linked) expect(known).toContain(href);
  });
});
