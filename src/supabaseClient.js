import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Auth client (Supabase JS SDK — gère le refresh de token automatiquement)
export const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Construit les headers avec le JWT de session si disponible
async function buildHeaders() {
  const { data: { session } } = await authClient.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    apikey:        SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer:        "return=representation",
  };
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
        const r = await fetch(url, { headers });
        const json = await r.json();
        if (!r.ok) throw new Error(json?.message || `Erreur ${r.status}`);
        return json;
      },
      async insert(data) {
        const headers = await buildHeaders();
        const r = await fetch(base, { method: "POST", headers, body: JSON.stringify(data) });
        const json = await r.json();
        if (!r.ok) throw new Error(json?.message || `Erreur ${r.status}`);
        return json;
      },
      async update(data, filter) {
        const headers = await buildHeaders();
        const r = await fetch(`${base}?${filter}`, { method: "PATCH", headers, body: JSON.stringify(data) });
        const json = await r.json();
        if (!r.ok) throw new Error(json?.message || `Erreur ${r.status}`);
        return json;
      },
      async delete(filter) {
        const headers = await buildHeaders();
        const r = await fetch(`${base}?${filter}`, { method: "DELETE", headers });
        if (!r.ok) { const json = await r.json().catch(() => ({})); throw new Error(json?.message || `Erreur ${r.status}`); }
        return true;
      },
    };
  },
};
