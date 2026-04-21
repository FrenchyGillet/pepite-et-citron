import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Auth client (Supabase JS SDK — gère le refresh de token automatiquement)
export const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Cache du JWT ─────────────────────────────────────────────────────────────
// Problème précédent : buildHeaders() appelait authClient.auth.getSession() à chaque
// requête REST. Si le SDK était en train de rafraîchir le token sur réseau lent,
// toute la chaîne gelait pendant plusieurs secondes.
//
// Solution : on cache le token en mémoire dès le démarrage et on le met à jour
// via onAuthStateChange (qui se déclenche sur login, logout, et TOKEN_REFRESHED).
// buildHeaders() est maintenant synchrone et instantané — zéro risque de blocage.

let _cachedToken = SUPABASE_ANON_KEY;

// Initialise le cache dès le chargement du module (fire-and-forget)
authClient.auth.getSession()
  .then(({ data: { session } }) => {
    if (session?.access_token) _cachedToken = session.access_token;
  })
  .catch(() => {});

// Maintient le cache à jour : login, logout, refresh automatique du token
authClient.auth.onAuthStateChange((_event, session) => {
  _cachedToken = session?.access_token ?? SUPABASE_ANON_KEY;
});

// Synchrone et instantané — plus jamais de blocage sur getSession()
function buildHeaders() {
  return {
    apikey:         SUPABASE_ANON_KEY,
    Authorization:  `Bearer ${_cachedToken}`,
    "Content-Type": "application/json",
    Prefer:         "return=representation",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Parse la réponse en toute sécurité (gère les corps vides et le non-JSON)
async function parseResponse(r) {
  const text = await r.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

// Fetch avec timeout (évite les hangs réseau indéfinis)
function fetchWithTimeout(url, options, ms = 5000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

// ─── Client REST ──────────────────────────────────────────────────────────────
export const supabase = {
  async from(table) {
    const base = `${SUPABASE_URL}/rest/v1/${table}`;
    return {
      async select(cols = "*", opts = {}) {
        const headers = buildHeaders();   // synchrone
        let url = `${base}?select=${cols}`;
        if (opts.filter) url += `&${opts.filter}`;
        if (opts.order)  url += `&order=${opts.order}`;
        const r = await fetchWithTimeout(url, { headers });
        const json = await parseResponse(r);
        if (!r.ok) throw new Error(json?.message || json?.error || `Erreur ${r.status}`);
        return json ?? [];
      },
      async insert(data) {
        const headers = buildHeaders();
        const r = await fetchWithTimeout(base, { method: "POST", headers, body: JSON.stringify(data) });
        const json = await parseResponse(r);
        if (!r.ok) throw new Error(json?.message || json?.error || `Erreur ${r.status}`);
        return json;
      },
      async update(data, filter) {
        const headers = buildHeaders();
        const r = await fetchWithTimeout(`${base}?${filter}`, { method: "PATCH", headers, body: JSON.stringify(data) });
        const json = await parseResponse(r);
        if (!r.ok) throw new Error(json?.message || json?.error || `Erreur ${r.status}`);
        return json;
      },
      async delete(filter) {
        const headers = buildHeaders();
        const r = await fetchWithTimeout(`${base}?${filter}`, { method: "DELETE", headers });
        if (!r.ok) {
          const json = await parseResponse(r);
          throw new Error(json?.message || json?.error || `Erreur ${r.status}`);
        }
        return true;
      },
    };
  },
};
