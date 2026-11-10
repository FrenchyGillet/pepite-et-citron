import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DIR = 'supabase/migrations';
const files = readdirSync(DIR).filter(f => f.endsWith('.sql')).sort();

describe('supabase/migrations', () => {
  it('names every file YYYYMMNN_name.sql, with no number used twice', () => {
    const versions = files.map(f => f.slice(0, 8));
    for (const f of files) expect(f).toMatch(/^\d{8}_[a-z0-9_]+\.sql$/);
    expect(new Set(versions).size).toBe(versions.length);
  });

  // `npm run db:missing` compares the files with schema_migrations.
  it('records itself in schema_migrations, from 20260027 on', () => {
    for (const f of files.filter(f => f.slice(0, 8) >= '20260027')) {
      const sql = readFileSync(`${DIR}/${f}`, 'utf8');
      expect(sql, f).toContain(`insert into schema_migrations (version) values ('${f.slice(0, 8)}') on conflict (version) do nothing;`);
    }
  });

  it('leaves the transaction to the SQL Editor (begin; … commit; around it)', () => {
    for (const f of files.filter(f => f.slice(0, 8) >= '20260027')) {
      expect(readFileSync(`${DIR}/${f}`, 'utf8'), f).not.toMatch(/^\s*(begin|commit)\s*;/im);
    }
  });
});
