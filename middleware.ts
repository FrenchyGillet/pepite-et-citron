/**
 * Vercel Edge Middleware — Rate limiting for /api/* routes
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
  const { pathname } = new URL(req.url);

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
  matcher: '/api/:path*',
};
