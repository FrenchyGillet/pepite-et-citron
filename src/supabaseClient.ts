import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config';

// Auth client (Supabase JS SDK — gère le refresh de token automatiquement)
export const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Cache du JWT ─────────────────────────────────────────────────────────────
// buildHeaders() appelait authClient.auth.getSession() à chaque requête REST.
// Si le SDK était en train de rafraîchir le token sur réseau lent, toute la
// chaîne gelait pendant plusieurs secondes.
//
// Solution : on cache le token en mémoire dès le démarrage et on le met à jour
// via onAuthStateChange (login, logout, TOKEN_REFRESHED).
// buildHeaders() est maintenant synchrone et instantané.

let _cachedToken = SUPABASE_ANON_KEY;

authClient.auth.getSession()
  .then(({ data: { session } }) => {
    if (session?.access_token) _cachedToken = session.access_token;
  })
  .catch(() => {});

authClient.auth.onAuthStateChange((_event, session) => {
  _cachedToken = session?.access_token ?? SUPABASE_ANON_KEY;
});

function buildHeaders(): Record<string, string> {
  return {
    apikey:         SUPABASE_ANON_KEY,
    Authorization:  `Bearer ${_cachedToken}`,
    "Content-Type": "application/json",
    Prefer:         "return=representation",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function parseResponse(r: Response): Promise<unknown> {
  const text = await r.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function fetchWithTimeout(url: string, options: RequestInit, ms = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

interface SelectOptions {
  filter?: string;
  order?: string;
}

// ─── Client REST ──────────────────────────────────────────────────────────────
export const supabase = {
  from(table: string) {
    const base = `${SUPABASE_URL}/rest/v1/${table}`;
    return {
      async select(cols = "*", opts: SelectOptions = {}): Promise<unknown[]> {
        const headers = buildHeaders();
        let url = `${base}?select=${cols}`;
        if (opts.filter) url += `&${opts.filter}`;
        if (opts.order)  url += `&order=${opts.order}`;
        const r = await fetchWithTimeout(url, { headers });
        const json = await parseResponse(r) as Record<string, string> | null;
        if (!r.ok) throw new Error(json?.message || json?.error || `Erreur ${r.status}`);
        return (json ?? []) as unknown[];
      },
      async insert(data: unknown): Promise<unknown> {
        const headers = buildHeaders();
        const r = await fetchWithTimeout(base, { method: "POST", headers, body: JSON.stringify(data) });
        const json = await parseResponse(r) as Record<string, string> | null;
        if (!r.ok) throw new Error(json?.message || json?.error || `Erreur ${r.status}`);
        return json;
      },
      async update(data: unknown, filter: string): Promise<unknown> {
        const headers = buildHeaders();
        const r = await fetchWithTimeout(`${base}?${filter}`, { method: "PATCH", headers, body: JSON.stringify(data) });
        const json = await parseResponse(r) as Record<string, string> | null;
        if (!r.ok) throw new Error(json?.message || json?.error || `Erreur ${r.status}`);
        return json;
      },
      async delete(filter: string): Promise<true> {
        const headers = buildHeaders();
        const r = await fetchWithTimeout(`${base}?${filter}`, { method: "DELETE", headers });
        if (!r.ok) {
          const json = await parseResponse(r) as Record<string, string> | null;
          throw new Error(json?.message || json?.error || `Erreur ${r.status}`);
        }
        return true;
      },
    };
  },
};
