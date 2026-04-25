import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config';

// Wrap PostgREST data requests (/rest/v1/) so that:
//  1. Requests are aborted after 10 s (prevents indefinite hangs in production;
//     10 s gives breathing room for high-latency regions and cold-start wake-ups).
//  2. Network-level TypeErrors are re-thrown as AbortErrors. The SDK retries GET
//     requests on TypeErrors with 1s+2s+4s backoff (7 s total), which would blow
//     through test timeouts. AbortErrors skip that retry loop entirely, so our
//     own withRetry in api.ts stays in full control of the retry strategy.
//
// Auth requests (/auth/v1/) bypass this wrapper entirely and use native fetch so
// GoTrue's internal session management (refresh, lock, SIGNED_OUT events) is not
// disrupted — preserving the same behaviour as the previous authClient.
function wrappedFetch(url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> {
  const urlStr = String(url);

  // Auth, storage, functions — use native fetch untouched.
  if (!urlStr.includes('/rest/v1/')) {
    return fetch(urlStr, options);
  }

  // PostgREST data calls — add timeout + AbortError conversion.
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
