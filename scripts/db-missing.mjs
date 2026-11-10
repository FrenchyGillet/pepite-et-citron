// Prints a one-statement query for the Supabase SQL Editor: the migrations of
// supabase/migrations/ that the database has not recorded in
// schema_migrations (20260027). Empty result: the database is up to date.
import { readdirSync } from 'node:fs';

const versions = readdirSync(new URL('../supabase/migrations/', import.meta.url))
  .filter(f => /^\d{8}_.*\.sql$/.test(f))
  .map(f => f.slice(0, 8))
  .sort();

const list = versions.map(v => `('${v}')`).join(', ');
console.log(
  `select v.version as missing from (values ${list}) as v(version)\n` +
  `where v.version not in (select version from schema_migrations) order by 1;`,
);
