/* Test-only helpers for the serverless endpoint suites. Never imported by a route. */
import { vi } from 'vitest';

/** A chainable PostgREST query-builder stub that resolves to `result`. */
export function makeChain(result: unknown = { error: null }) {
  const c: Record<string, unknown> = {
    then: (f: (v: unknown) => unknown, r?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(f, r),
  };
  for (const m of ['select', 'update', 'insert', 'upsert', 'delete', 'eq', 'neq', 'in', 'order', 'limit']) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  return c;
}

export const makeReq = (overrides: Record<string, unknown> = {}) => ({
  method:  'POST',
  headers: { authorization: 'Bearer valid-token' },
  body:    {},
  ...overrides,
});

export function makeRes() {
  const r = { statusCode: 200, body: undefined as unknown };
  return Object.assign(r, {
    status: vi.fn((c: number)  => { r.statusCode = c; return r; }),
    json:   vi.fn((b: unknown) => { r.body = b;       return r; }),
    end:    vi.fn(() => r),
  });
}

/**
 * Builds a `from()` implementation covering the requireOrgMember / requireOrgAdmin
 * path. For `org_members`:
 *   - `.maybeSingle()` (the role lookup) resolves to `{ data: { role } }`
 *   - `.then()`        (a member list)  resolves to `{ data: members }`
 * `role: null` simulates a non-member (403). Other tables come from `tables`.
 */
export function makeFrom(opts: {
  role?: 'admin' | 'voter' | null;
  members?: unknown[];
  tables?: Record<string, unknown>;
} = {}) {
  const { role = 'admin', members = [], tables = {} } = opts;
  return (table: string) => {
    if (table === 'org_members') {
      const c = makeChain({ data: members, error: null });
      c.maybeSingle = vi.fn().mockResolvedValue({
        data: role === null ? null : { role }, error: null,
      });
      return c;
    }
    if (table in tables) return makeChain(tables[table]);
    return makeChain({ error: null });
  };
}
