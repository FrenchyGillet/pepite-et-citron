import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = {
  async from(table) {
    const base = `${SUPABASE_URL}/rest/v1/${table}`;
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
    return {
      async select(cols = "*", opts = {}) {
        let url = `${base}?select=${cols}`;
        if (opts.filter) url += `&${opts.filter}`;
        if (opts.order) url += `&order=${opts.order}`;
        const r = await fetch(url, { headers });
        return r.json();
      },
      async insert(data) {
        const r = await fetch(base, { method: "POST", headers, body: JSON.stringify(data) });
        return r.json();
      },
      async update(data, filter) {
        const r = await fetch(`${base}?${filter}`, { method: "PATCH", headers, body: JSON.stringify(data) });
        return r.json();
      },
      async delete(filter) {
        const r = await fetch(`${base}?${filter}`, { method: "DELETE", headers });
        return r.ok;
      },
    };
  },
};
