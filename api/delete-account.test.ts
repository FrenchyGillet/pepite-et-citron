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
  for (const m of ['select', 'update', 'delete', 'eq', 'neq', 'in', 'is']) {
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
 * Wires `from()` for the delete flow and records every chain per table.
 *   adminOrgs     — the caller's admin memberships (first org_members read)
 *   others        — the other members of each of those teams
 *   orgs          — organizations reads (names, subscriptions)
 *   linkedPlayers — players linked to the caller
 *   matches       — matches of a linked player's team
 *   failOn        — table whose queries return a database error
 */
function wireFrom(opts: {
  adminOrgs?: Array<{ org_id: string }>;
  others?: Array<{ user_id: string; role: string }>;
  orgs?: Array<Record<string, unknown>>;
  linkedPlayers?: Array<{ id: number; name: string; org_id: string }>;
  matches?: Array<{ id: number }>;
  failOn?: string;
} = {}) {
  const { adminOrgs = [], others = [], orgs = [], linkedPlayers = [], matches = [], failOn } = opts;
  let orgMembersCall = 0;
  const calls: string[] = [];
  const chains: Record<string, Array<Record<string, any>>> = {};
  mockFrom.mockImplementation((table: string) => {
    calls.push(table);
    let result: unknown = { data: null, error: null };
    if (table === failOn)              result = { data: null, error: { message: 'db down' } };
    else if (table === 'org_members')  result = { data: ++orgMembersCall === 1 ? adminOrgs : others, error: null };
    else if (table === 'organizations') result = { data: orgs, error: null };
    else if (table === 'players')       result = { data: linkedPlayers, error: null };
    else if (table === 'matches')       result = { data: matches, error: null };
    const chain = makeChain(result);
    (chains[table] ??= []).push(chain);
    return chain;
  });
  return { calls, chains };
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

  it('deletes a team only when the caller is its only member', async () => {
    const { calls, chains } = wireFrom({ adminOrgs: [{ org_id: 'org-1' }], others: [] });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(chains.organizations.some(c => c.delete.mock.calls.length > 0)).toBe(true);
    // memberships are deleted last, after the team
    expect(calls.lastIndexOf('org_members')).toBeGreaterThan(calls.lastIndexOf('organizations'));
  });

  it('keeps the team when another admin remains', async () => {
    const { calls } = wireFrom({ adminOrgs: [{ org_id: 'org-1' }], others: [{ user_id: 'u2', role: 'admin' }] });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(calls).not.toContain('organizations');
  });

  // RGPD 1.3: the sole admin's deletion used to wipe the team for everyone.
  it('refuses with 409 when the caller is the only admin of a team other members use', async () => {
    const { calls } = wireFrom({
      adminOrgs: [{ org_id: 'org-1' }],
      others: [{ user_id: 'u2', role: 'voter' }],
      orgs: [{ name: 'Les Lions' }],
    });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'sole_admin', error: expect.stringContaining('Les Lions') });
    expect(mockAuth.admin.deleteUser).not.toHaveBeenCalled();
    expect(calls).not.toContain('votes');
    expect(mockStripe.subscriptions.cancel).not.toHaveBeenCalled();
  });

  it('cancels the Stripe subscription of a deleted team', async () => {
    wireFrom({ adminOrgs: [{ org_id: 'org-1' }], orgs: [{ id: 'org-1', stripe_subscription_id: 'sub_123' }] });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
  });

  it('still deletes the account when Stripe cancellation throws', async () => {
    mockStripe.subscriptions.cancel.mockRejectedValue(new Error('No such subscription'));
    wireFrom({ adminOrgs: [{ org_id: 'org-1' }], orgs: [{ id: 'org-1', stripe_subscription_id: 'sub_123' }] });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(mockAuth.admin.deleteUser).toHaveBeenCalled();
  });

  it('anonymizes the caller\'s ballots instead of deleting them, and unlinks their player', async () => {
    const { chains } = wireFrom({
      linkedPlayers: [{ id: 10, name: 'Thomas', org_id: 'org-1' }],
      matches: [{ id: 1 }, { id: 2 }],
    });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(200);

    const [byPlayer, legacy] = chains.votes;
    const anonymized = expect.objectContaining({ voter_player_id: null, voter_name: 'Ancien joueur', best1_comment: null, lemon_comment: null });
    expect(byPlayer.update).toHaveBeenCalledWith(anonymized);
    expect(byPlayer.eq).toHaveBeenCalledWith('voter_player_id', 10);
    // ballots cast by first name only, before voter_player_id existed
    expect(legacy.update).toHaveBeenCalledWith(anonymized);
    expect(legacy.in).toHaveBeenCalledWith('match_id', [1, 2]);
    expect(legacy.is).toHaveBeenCalledWith('voter_player_id', null);
    expect(legacy.eq).toHaveBeenCalledWith('voter_name', 'Thomas');
    expect(chains.votes.every(c => c.delete.mock.calls.length === 0)).toBe(true);

    const unlink = chains.players.find(c => c.update.mock.calls.length > 0);
    expect(unlink?.update).toHaveBeenCalledWith({ user_id: null, avatar_url: null, nickname: null });
  });

  it('skips ballots when the user has no linked player', async () => {
    const { calls } = wireFrom({ linkedPlayers: [] });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(calls).not.toContain('votes');
  });

  it('stops before deleting the user when a database step fails', async () => {
    wireFrom({ failOn: 'players' });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(500);
    expect(mockAuth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('returns a generic 500 when deleteUser fails, without leaking the raw error', async () => {
    mockAuth.admin.deleteUser.mockResolvedValue({ error: new Error('Cannot delete user') });
    const res = makeRes();
    await handler(makeReq() as any, res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ error: expect.stringMatching(/La suppression du compte a échoué/) });
    expect(JSON.stringify(res.body)).not.toContain('Cannot delete user');
  });
});
