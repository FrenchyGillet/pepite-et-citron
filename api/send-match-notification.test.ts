import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Env vars set before module import (module reads BREVO_API_KEY at init) ──

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL         = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.BREVO_API_KEY             = 'test-brevo-key';
  process.env.VITE_APP_URL              = 'https://pepite-citron.com';
  process.env.EMAIL_UNSUBSCRIBE_SECRET  = 'test-unsub-secret';
});

const { mockAuth, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockAuth: { getUser: vi.fn() },
  mockFrom: vi.fn(),
  mockRpc:  vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: mockAuth, from: mockFrom, rpc: mockRpc }),
}));

import { makeReq, makeRes, makeFrom, makeChain } from './_lib/testUtils';
import { verifyUnsubscribeToken } from './_lib/unsubscribe';
import handler from './send-match-notification';

const req = (o: Record<string, unknown> = {}) =>
  makeReq({ body: { orgId: 'org-1', matchLabel: 'PSG vs OM' }, ...o });

// get_org_members RPC — returns { user_id, email, role }; user-1 is the caller
const withMembers = (rows: Array<{ user_id: string; email: string | null }>) =>
  mockRpc.mockResolvedValue({ data: rows, error: null });

describe('POST /api/send-match-notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());

    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom.mockImplementation(makeFrom({
      role: 'admin',
      tables: { organizations: { data: { id: 'org-1', name: 'Les Lions', slug: 'lions' }, error: null } },
    }));
    withMembers([
      { user_id: 'user-1', email: 'caller@example.com' },
      { user_id: 'user-2', email: 'alice@example.com' },
      { user_id: 'user-3', email: 'bob@example.com' },
    ]);

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, text: vi.fn().mockResolvedValue(''),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('returns 405 for non-POST', async () => {
    const res = makeRes();
    await handler(req({ method: 'GET' }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it('returns 401 when the token is missing', async () => {
    const res = makeRes();
    await handler(req({ headers: {} }) as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when the token is invalid', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Bad') });
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when the caller is not a member of the org', async () => {
    mockFrom.mockImplementation(makeFrom({ role: null }));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is only a voter', async () => {
    mockFrom.mockImplementation(makeFrom({
      role: 'voter',
      tables: { organizations: { data: { id: 'org-1', name: 'Les Lions', slug: 'lions' }, error: null } },
    }));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(403);
  });

  it('returns 400 when matchLabel is missing', async () => {
    const res = makeRes();
    await handler(req({ body: { orgId: 'org-1' } }) as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns {sent: 0} when the caller is the only member', async () => {
    withMembers([{ user_id: 'user-1', email: 'caller@example.com' }]);
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.body).toMatchObject({ sent: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns {sent: 0} when the RPC errors', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.body).toMatchObject({ sent: 0 });
  });

  const brevoCalls = () =>
    (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(c => JSON.parse(c[1].body));

  it('sends one email per member (the caller excluded) and returns {sent: N}', async () => {
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ sent: 2 });
    const calls = brevoCalls();
    expect(calls.map(c => c.to)).toEqual([[{ email: 'alice@example.com' }], [{ email: 'bob@example.com' }]]);
    expect(calls[0].subject).toContain('PSG vs OM');
  });

  it('escapes HTML in matchLabel before sending', async () => {
    const res = makeRes();
    await handler(req({ body: { orgId: 'org-1', matchLabel: '<img src=x onerror=alert(1)>' } }) as any, res as any);
    const [call] = brevoCalls();
    expect(call.htmlContent).not.toContain('<img src=x');
    expect(call.htmlContent).toContain('&lt;img src=x');
  });

  // S11: no personal sender address.
  it('sends from the no-reply address, not a personal one', async () => {
    await handler(req() as any, makeRes() as any);
    expect(brevoCalls()[0].sender).toEqual({ name: 'Pépite & Citron', email: 'noreply@pepite-citron.com' });
  });

  // "/" is the marketing landing page — the button must open the vote screen.
  it('links the vote screen of the team', async () => {
    await handler(req() as any, makeRes() as any);
    expect(brevoCalls()[0].htmlContent).toContain('https://pepite-citron.com/vote?org=lions');
  });

  // F10: every email carries the member's own signed unsubscribe link.
  it('adds a personal one-click unsubscribe link', async () => {
    await handler(req() as any, makeRes() as any);
    const [alice] = brevoCalls();
    const link = alice.headers['List-Unsubscribe'].slice(1, -1);
    const url = new URL(link);
    expect(url.pathname).toBe('/api/unsubscribe');
    expect(url.searchParams.get('u')).toBe('user-2');
    expect(verifyUnsubscribeToken('user-2', 'org-1', url.searchParams.get('t')!)).toBe(true);
    expect(alice.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(alice.htmlContent).toContain(link.replace(/&/g, '&'));
    expect(alice.htmlContent).toContain('Ne plus recevoir ces emails');
  });

  it('skips members who unsubscribed', async () => {
    mockFrom.mockImplementation(makeFrom({
      role: 'admin',
      members: [{ user_id: 'user-3' }], // opted out
      tables: { organizations: { data: { id: 'org-1', name: 'Les Lions', slug: 'lions' }, error: null } },
    }));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.body).toMatchObject({ sent: 1 });
    expect(brevoCalls().map(c => c.to[0].email)).toEqual(['alice@example.com']);
  });

  it('sends nothing when the preferences cannot be read (fail closed)', async () => {
    const base = makeFrom({
      role: 'admin',
      tables: { organizations: { data: { id: 'org-1', name: 'Les Lions', slug: 'lions' }, error: null } },
    });
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t: string) => {
      // 1st org_members read = the caller's role (requireOrgAdmin), 2nd = preferences
      if (t === 'org_members' && ++orgMembersCalls === 2) return makeChain({ data: null, error: { message: 'column does not exist' } });
      return base(t);
    });
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.body).toMatchObject({ sent: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not echo the Brevo error body to the client', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, status: 401, text: vi.fn().mockResolvedValue('{"code":"unauthorized","message":"Key not found"}'),
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.body).toEqual({ sent: 0 });
  });

  it('rejects an over-long matchLabel (zod max 100)', async () => {
    const res = makeRes();
    await handler(req({ body: { orgId: 'org-1', matchLabel: 'x'.repeat(101) } }) as any, res as any);
    expect(res.statusCode).toBe(400);
  });
});
