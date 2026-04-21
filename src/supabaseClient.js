import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Auth client (Supabase JS SDK — gère le refresh de token automatiquement)
export const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Construit les headers avec le JWT de session si disponible.
// On plafonne à 3 s : si le SDK est en train de rafraîchir le token sur réseau lent,
// on n'attend pas — on tombe sur la clé anonyme plutôt que de bloquer toute la requête.
async function buildHeaders() {
  let token = SUPABASE_ANON_KEY;
  try {
    const result = await Promise.race([
      authClient.auth.getSession(),
      new Promise(resolve => setTimeout(() => resolve({ data: { session: null } }), 3000)),
    ]);
    token = result?.data?.session?.access_token ?? SUPABASE_ANON_KEY;
  } catch {
    // ignore — on utilisera la clé anonyme
  }
  return {
    apikey:        SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer:        "return=representation",
  };
}

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

// Client REST minimal (même API qu'avant, maintenant avec JWT dynamique)
export const supabase = {
  async from(table) {
    const base = `${SUPABASE_URL}/rest/v1/${table}`;
    return {
      async select(cols = "*", opts = {}) {
        const headers = await buildHeaders();
        let url = `${base}?select=${cols}`;
        if (opts.filter) url += `&${opts.filter}`;
        if (opts.order) url += `&order=${opts.order}`;
        const r = await fetchWithTimeout(url, { headers });
        const json = await parseResponse(r);
        if (!r.ok) throw new Error(json?.message || json?.error || `Erreur ${r.status}`);
        return json ?? [];
      },
      async insert(data) {
        const headers = await buildHeaders();
        const r = await fetchWithTimeout(base, { method: "POST", headers, body: JSON.stringify(data) });
        const json = await parseResponse(r);
        if (!r.ok) throw new Error(json?.message || json?.error || `Erreur ${r.status}`);
        return json;
      },
      async update(data, filter) {
        const headers = await buildHeaders();
        const r = await fetchWithTimeout(`${base}?${filter}`, { method: "PATCH", headers, body: JSON.stringify(data) });
        const json = await parseResponse(r);
        if (!r.ok) throw new Error(json?.message || json?.error || `Erreur ${r.status}`);
        return json;
      },
      async delete(filter) {
        const headers = await buildHeaders();
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
