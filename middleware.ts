/**
 * Vercel Edge Middleware — Rate limiting for /api/* routes
 *
 * Uses an in-memory sliding window per IP. Resets on cold starts, which is
 * acceptable for a small SaaS without a Redis dependency.
 * Limits:
 *   - /api/create-checkout-session  → 5 req / minute
 *   - /api/send-match-notification  → 10 req / minute
 *   - /api/delete-account           → 3 req / minute
 *   - All other /api/*              → 60 req / minute
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface Window {
  count:     number;
  resetAt:   number;
}

const store = new Map<string, Window>();

const LIMITS: Record<string, number> = {
  '/api/create-checkout-session': 5,
  '/api/send-match-notification': 10,
  '/api/delete-account':          3,
};
const DEFAULT_LIMIT  = 60;
const WINDOW_MS      = 60_000; // 1 minute

function getLimit(pathname: string): number {
  return LIMITS[pathname] ?? DEFAULT_LIMIT;
}

function rateLimit(key: string, limit: number): { ok: boolean; remaining: number; resetAt: number } {
  const now  = Date.now();
  let   win  = store.get(key);

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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  // Stripe webhook must never be rate-limited (Stripe retries are legitimate)
  if (pathname === '/api/stripe-webhook') return NextResponse.next();

  const ip    = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const key   = `${ip}:${pathname}`;
  const limit = getLimit(pathname);

  maybeCleanup();

  const { ok, remaining, resetAt } = rateLimit(key, limit);

  const headers = {
    'X-RateLimit-Limit':     String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset':     String(Math.ceil(resetAt / 1000)),
  };

  if (!ok) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessaie dans quelques secondes.' },
      { status: 429, headers },
    );
  }

  const res = NextResponse.next();
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
