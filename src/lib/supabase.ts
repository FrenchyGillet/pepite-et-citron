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
// 2. Add a 10 s abort timeout to PostgREST/RPC calls to prevent indefinite
//    hangs on cold-start or bad connections.
// 3. Auth paths use native fetch (no extra timeout) so GoTrue's internal
//    session management (refresh, lock, SIGNED_OUT events) is not disrupted.
function wrappedFetch(url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> {
  const urlStr = proxyUrl(String(url));

  // Auth, storage, realtime handshake — native fetch, just rewrite the URL.
  if (!urlStr.includes('/rest/v1/')) {
    return fetch(urlStr, options);
  }

  // PostgREST data + RPC calls — abort after 10 s, convert TypeErrors to
  // AbortErrors so withRetry() in api.ts stays in control of retry logic.
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
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
