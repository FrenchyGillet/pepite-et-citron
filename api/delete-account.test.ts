import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL         = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.STRIPE_SECRET_KEY         = 'sk_test';
});

const { mockAuth, mockFrom, mockStripe } = vi.hoisted(() => ({
  mockAuth: { getUser: vi.fn(), admin: { deleteUser: vi.fn() } },
  mockFrom: vi.fn(),
  mockStripe: { subscriptions: { cancel: vi.fn() } },
}));

vi.mock('stripe', () => ({ default: vi.fn().mockImplementation(function () { return mockStripe; }) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: mockAuth, from: mockFrom }) }));

/** Chainable query stub that resolves to `result` when awaited. */
function makeChain(result: unknown = { error: null }) {
  const c: Record<string, unknown> = {
    then: (f: (v: unknown) => unknown, r?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(f, r),
  };
  for (const m of ['select', 'update', 'delete', 'eq', 'neq', 'in']) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  return c;
}

const makeReq = (overrides: Record<string, unknown> = {}) => ({
  method: 'POST',
  headers: { authorization: 'Bearer valid-token' },
  body: {},
  ...overrides,
});

function makeRes() {
  const r = { statusCode: 200, body: undefined as unknown };
  return Object.assign(r, {
    status: vi.fn((c: number)  => { r.statusCode = c; return r; }),
    json:   vi.fn((b: unknown) => { r.body = b;       return r; }),
    end:    vi.fn(() => r),
  });
}

import handler from './delete-account';

/**
 * Wires `from()` for the delete flow.
 *   adminOrgs      — rows returned for the "my admin memberships" select
 *   otherAdmins    — count returned for "are there other admins?" (per org)
 *   linkedPlayers  — rows returned for players.eq('user_id')
 *   orgSubs        — rows returned for organizations.in(soloOrgIds)
 */
function wireFrom(opts: {
  adminOrgs?: Array<{ org_id: string }>;
  otherAdmins?: number;
  linkedPlayers?: Array<{ id: number }>;
  orgSubs?: Array<{ id: string; stripe_subscription_id: string | null }>;
} = {}) {
  const { adminOrgs = [], otherAdmins = 0, linkedPlayers = [], orgSubs = [] } = opts;
  let orgMembersCall = 0;
  const calls: string[] = [];
  mockFrom.mockImplementation((table: string) => {
    calls.push(table);
    if (table === 'org_members') {
      orgMembersCall++;
      if (orgMembersCall === 1) return makeChain({ data: adminOrgs, error: null });
      return makeChain({ count: otherAdmins, error: null });
    }
    if (table === 'players')       return makeChain({ data: linkedPlayers, error: null });
    if (table === 'organizations') return makeChain({ data: orgSubs, error: null });
    return makeChain({ error: null });
  });
  return calls;
}

describe('POST /api/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockAuth.admin.deleteUser.mockResolvedValue({ error: null });
    mockStripe.subscriptions.cancel.mockResolvedValue({});
    wireFrom();
  });

  it('returns 405 for non-POST', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it('returns 401 without a Bearer header', async () => {
    const res = makeRes();
    await handler(makeReq({ headers: {} }) as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 on an invalid token', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad') });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  it('deletes the auth user on success', async () => {
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(mockAuth.admin.deleteUser).toHaveBeenCalledWith('user-1');
  });

  it('computes sole-admin orgs BEFORE deleting memberships', async () => {
    const calls = wireFrom({ adminOrgs: [{ org_id: 'org-1' }], otherAdmins: 0 });
    const res = makeRes();
    await handler(makeReq() as any, res as any);

    expect(res.statusCode).toBe(200);
    // organizations.delete must have been reached (org is orphaned)
    expect(calls).toContain('organizations');
    // the membership-delete is the LAST org_members touch, after the two reads
    expect(calls.filter(t => t === 'org_members').length).toBeGreaterThanOrEqual(3);
    expect(calls.lastIndexOf('org_members')).toBeGreaterThan(calls.indexOf('organizations'));
  });

  it('keeps the org when another admin remains', async () => {
    const calls = wireFrom({ adminOrgs: [{ org_id: 'org-1' }], otherAdmins: 1 });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(calls).not.toContain('organizations');
  });

  it('cancels the Stripe subscription of a deleted org', async () => {
    wireFrom({
      adminOrgs: [{ org_id: 'org-1' }],
      otherAdmins: 0,
      orgSubs: [{ id: 'org-1', stripe_subscription_id: 'sub_123' }],
    });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
  });

  it('still deletes the account when Stripe cancellation throws', async () => {
    mockStripe.subscriptions.cancel.mockRejectedValue(new Error('No such subscription'));
    wireFrom({
      adminOrgs: [{ org_id: 'org-1' }],
      otherAdmins: 0,
      orgSubs: [{ id: 'org-1', stripe_subscription_id: 'sub_123' }],
    });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(mockAuth.admin.deleteUser).toHaveBeenCalled();
  });

  it('deletes votes linked to the user and unlinks their player records', async () => {
    const calls = wireFrom({ linkedPlayers: [{ id: 10 }, { id: 11 }] });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(calls).toContain('votes');
    expect(calls.filter(t => t === 'players').length).toBeGreaterThanOrEqual(2); // select + update
  });

  it('skips vote deletion when the user has no linked player', async () => {
    const calls = wireFrom({ linkedPlayers: [] });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(calls).not.toContain('votes');
  });

  it('returns 500 when deleteUser fails', async () => {
    mockAuth.admin.deleteUser.mockResolvedValue({ error: new Error('Cannot delete user') });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ error: 'Cannot delete user' });
  });
});
