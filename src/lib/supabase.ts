import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config';

// ── Safari ITP proxy ──────────────────────────────────────────────────────────
// Safari's Intelligent Tracking Prevention classifies supabase.co as a
// cross-site tracker and silently times out all requests from our domain.
// Fix: in production, route every Supabase HTTP call through /sb-api on our
// own domain. Vercel proxies /sb-api/:path* → supabase.co/:path*, so the
// browser sees same-origin requests and ITP never fires.
// In dev (localhost), the real Supabase URL is used directly.
const PROXY = import.meta.env.PROD ? '/sb-api' : SUPABASE_URL;

function proxyUrl(url: string): string {
  return PROXY !== SUPABASE_URL ? url.replace(SUPABASE_URL, PROXY) : url;
}

// ── Custom fetch wrapper ──────────────────────────────────────────────────────
// 1. Rewrite URLs to the proxy (fixes Safari ITP).
// 2. Add a 6 s abort timeout to PostgREST/RPC calls to prevent indefinite
//    hangs on cold-start or bad connections. withRetry() in api.ts owns the
//    retry budget on top (1 retry), so worst case ≈ 2 × 6 s per query.
// 3. Auth paths get a longer 15 s abort. They used to have none, but every
//    data request awaits GoTrue's session lock BEFORE it is sent, so a token
//    refresh hanging on a dead socket (iOS PWA back from the background) held
//    the lock — and every screen — forever. An aborted refresh surfaces as a
//    retryable network error to GoTrue, which releases the lock and retries.
function wrappedFetch(url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> {
  const urlStr = proxyUrl(String(url));

  if (urlStr.includes('/auth/v1/')) {
    if (options.signal) return fetch(urlStr, options); // caller manages its own abort
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    return fetch(urlStr, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
  }

  // Storage, realtime handshake — native fetch, just rewrite the URL.
  if (!urlStr.includes('/rest/v1/')) {
    return fetch(urlStr, options);
  }

  // PostgREST data + RPC calls — abort after 10 s, convert TypeErrors to
  // AbortErrors so withRetry() in api.ts stays in control of retry logic.
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  return fetch(urlStr, { ...options, signal: ctrl.signal })
    .catch((err: unknown) => {
      const e = err instanceof Error ? err : new Error(String(err));
      if (e.name === 'AbortError' || (e as { code?: string }).code === 'ABORT_ERR') throw e;
      throw new DOMException(e.message, 'AbortError');
    })
    .finally(() => clearTimeout(timer));
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: (url, options = {}) => wrappedFetch(url, options) },
});
