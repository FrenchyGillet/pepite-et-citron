/**
 * Vercel Edge Middleware — printed-QR redirects + rate limiting for /api/* routes
 *
 * Uses the native Web Request/Response APIs (no next/server dependency).
 * In-memory sliding window per IP — resets on cold starts, acceptable for
 * a small SaaS without a Redis dependency.
 *
 * Limits:
 *   - /api/create-checkout-session  → 5 req / minute
 *   - /api/send-match-notification  → 10 req / minute
 *   - /api/delete-account           → 3 req / minute
 *   - All other /api/*              → 60 req / minute
 */

// ── Printed QR codes ─────────────────────────────────────────────────────────
// ⚠️ https://pepite-citron.com/sweat is PRINTED on promotional sweatshirts (QR
// code): it must keep working forever. Change the destination here, never the
// path. 302 on purpose (not 301): phones must not cache the destination, so it
// can change later. /start has no language prefix: the app picks the language
// (device choice, else browser), so the redirect never forces French.
export const SWEAT_DESTINATION = '/start?utm_source=sweat&utm_medium=qr&utm_campaign=sweat';

// /sweat, /sweat/, /SWEAT, /Sweat/… (also listed in config.matcher below).
const SWEAT_PATH = /^\/sweat\/?$/i;

/**
 * 302 to SWEAT_DESTINATION for /sweat (any case, optional trailing slash).
 * Query parameters already on the scanned URL are kept, and win over the
 * destination's (e.g. /sweat?utm_campaign=sweat2 for a second batch).
 */
export function sweatRedirect(url: URL): Response | undefined {
  if (!SWEAT_PATH.test(url.pathname)) return undefined;
  const target = new URL(SWEAT_DESTINATION, url.origin);
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  return new Response(null, {
    status: 302,
    headers: {
      Location:        target.pathname + target.search,
      'Cache-Control': 'no-store',
      'X-Robots-Tag':  'noindex',
    },
  });
}

// ── Rate limiting ────────────────────────────────────────────────────────────

interface RateWindow {
  count:   number;
  resetAt: number;
}

const store = new Map<string, RateWindow>();

const LIMITS: Record<string, number> = {
  '/api/create-checkout-session': 5,
  '/api/send-match-notification': 10,
  '/api/delete-account':          3,
};
const DEFAULT_LIMIT = 60;
const WINDOW_MS     = 60_000; // 1 minute

function getLimit(pathname: string): number {
  return LIMITS[pathname] ?? DEFAULT_LIMIT;
}

function rateLimit(key: string, limit: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let   win = store.get(key);

  if (!win || win.resetAt <= now) {
    win = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, win);
  }

  win.count++;
  const remaining = Math.max(0, limit - win.count);
  return { ok: win.count <= limit, remaining, resetAt: win.resetAt };
}

// Clean up stale entries periodically (every 500 requests)
let cleanupCounter = 0;
function maybeCleanup() {
  if (++cleanupCounter < 500) return;
  cleanupCounter = 0;
  const now = Date.now();
  for (const [key, win] of store.entries()) {
    if (win.resetAt <= now) store.delete(key);
  }
}

export default function middleware(req: Request): Response | undefined {
  const url = new URL(req.url);
  const { pathname } = url;

  const redirect = sweatRedirect(url);
  if (redirect) return redirect;

  if (!pathname.startsWith('/api/')) return undefined;

  // Stripe webhook must never be rate-limited (Stripe retries are legitimate)
  if (pathname === '/api/stripe-webhook') return undefined;

  const ip    = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const key   = `${ip}:${pathname}`;
  const limit = getLimit(pathname);

  maybeCleanup();

  const { ok, resetAt } = rateLimit(key, limit);

  if (!ok) {
    return new Response(
      JSON.stringify({ error: 'Trop de requêtes. Réessaie dans quelques secondes.' }),
      {
        status: 429,
        headers: {
          'Content-Type':          'application/json',
          'X-RateLimit-Limit':     String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  }

  // Returning undefined lets the request pass through to the handler
  return undefined;
}

export const config = {
  // The sweat paths are spelled out (any case, with or without the trailing
  // slash) so the middleware never runs on the other pages.
  matcher: [
    '/api/:path*',
    '/:sweat([sS][wW][eE][aA][tT])',
    '/:sweat([sS][wW][eE][aA][tT])/',
  ],
};
