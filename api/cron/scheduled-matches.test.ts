import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL         = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.VAPID_PUBLIC_KEY          = 'test-vapid-public';
  process.env.VAPID_PRIVATE_KEY         = 'test-vapid-private';
  process.env.BREVO_API_KEY             = 'test-brevo-key';
  process.env.VITE_APP_URL              = 'https://pepite-citron.com';
  process.env.EMAIL_UNSUBSCRIBE_SECRET  = 'test-unsub-secret';
  process.env.CRON_SECRET               = 'cron-secret-123';
});

const { mockFrom, mockRpc, sendNotification } = vi.hoisted(() => ({
  mockFrom: vi.fn(), mockRpc: vi.fn(), sendNotification: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: vi.fn() }, from: mockFrom, rpc: mockRpc }),
}));
vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification } }));

import { makeReq, makeRes, makeChain } from '../_lib/testUtils';
import handler from './scheduled-matches';

const SUBS = [
  { endpoint: 'https://push/admin', p256dh: 'k', auth: 'a', user_id: 'admin-1' },
  { endpoint: 'https://push/voter', p256dh: 'k', auth: 'a', user_id: 'voter-1' },
];
const MEMBERS = [
  { user_id: 'admin-1', email: 'coach@club.fr', role: 'admin' },
  { user_id: 'voter-1', email: 'ana@club.fr', role: 'voter' },
  { user_id: 'voter-2', email: 'ben@club.fr', role: 'voter' },
];
const opened = { status: 'opened', org_id: 'org-1', match_id: 7, label: 'vs Dragons', kick_off: '2026-10-27T19:00:00Z', timezone: 'Europe/Brussels' };
const blocked = { ...opened, status: 'blocked', match_id: null, label: null };

const cronReq = (o: Record<string, unknown> = {}) =>
  makeReq({ headers: { authorization: 'Bearer cron-secret-123' }, ...o });

/** push_subscriptions honours .in('user_id', …); the rest are plain chains. */
function from(table: string) {
  if (table === 'push_subscriptions') {
    let rows = SUBS;
    const c = makeChain({ data: rows, error: null }) as Record<string, any>;
    c.in = vi.fn((col: string, ids: string[]) => {
      if (col === 'user_id') rows = SUBS.filter(s => ids.includes(s.user_id));
      return c;
    });
    c.then = (f: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(f);
    return c;
  }
  if (table === 'organizations') return makeChain({ data: { name: 'Les Lions', slug: 'lions' }, error: null });
  if (table === 'org_members') return makeChain({ data: [{ user_id: 'voter-2' }], error: null }); // opted out
  return makeChain({ error: null });
}

const sentEmails = () => (global.fetch as ReturnType<typeof vi.fn>).mock.calls
  .map(c => JSON.parse(c[1].body as string) as { to: Array<{ email: string }>; subject: string; htmlContent: string });
const pushedTo = () => sendNotification.mock.calls.map(c => ({ endpoint: c[0].endpoint, ...JSON.parse(c[1]) }));

describe('POST /api/cron/scheduled-matches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue('') }));
    sendNotification.mockResolvedValue(undefined);
    mockFrom.mockImplementation(from);
    mockRpc.mockImplementation((fn: string) =>
      Promise.resolve(fn === 'get_org_members' ? { data: MEMBERS, error: null } : { data: [], error: null }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('refuses anything but a POST with the cron secret', async () => {
    const get = makeRes();
    await handler(cronReq({ method: 'GET' }) as any, get as any);
    expect(get.statusCode).toBe(405);
    for (const headers of [{}, { authorization: 'Bearer wrong' }, { authorization: 'cron-secret-123' }]) {
      const res = makeRes();
      await handler(cronReq({ headers }) as any, res as any);
      expect(res.statusCode).toBe(401);
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('answers 500 when the database job fails', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = makeRes();
    await handler(cronReq() as any, res as any);
    expect(res.statusCode).toBe(500);
  });

  it('nothing due: no push, no email', async () => {
    const res = makeRes();
    await handler(cronReq() as any, res as any);
    expect(res.body).toEqual({ opened: 0, blocked: 0, pushed: 0, emailed: 0 });
    expect(sendNotification).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('an opened vote: the organiser is told to share and reveal, members get the usual vote email', async () => {
    mockRpc.mockImplementation((fn: string) =>
      Promise.resolve(fn === 'get_org_members' ? { data: MEMBERS, error: null } : { data: [opened], error: null }));
    const res = makeRes();
    await handler(cronReq() as any, res as any);

    expect(res.body).toMatchObject({ opened: 1, blocked: 0, pushed: 2, emailed: 2 });
    const pushes = pushedTo();
    expect(pushes.find(p => p.endpoint === 'https://push/admin')).toMatchObject({ title: '🗳️ Vote ouvert : vs Dragons', url: 'https://pepite-citron.com/admin' });
    expect(pushes.find(p => p.endpoint === 'https://push/voter')).toMatchObject({ title: '🗳️ Vote ouvert !', url: 'https://pepite-citron.com/vote' });

    const emails = sentEmails();
    expect(emails.map(e => e.to[0].email).sort()).toEqual(['ana@club.fr', 'coach@club.fr']); // ben unsubscribed
    const organiser = emails.find(e => e.to[0].email === 'coach@club.fr')!;
    expect(organiser.htmlContent).toContain('https://pepite-citron.com/vote?org=lions');
    expect(organiser.htmlContent).toContain('dévoile les résultats');
  });

  it('a blocked occurrence: only the organiser hears about it', async () => {
    mockRpc.mockImplementation((fn: string) =>
      Promise.resolve(fn === 'get_org_members' ? { data: MEMBERS, error: null } : { data: [blocked], error: null }));
    const res = makeRes();
    await handler(cronReq() as any, res as any);

    expect(res.body).toMatchObject({ opened: 0, blocked: 1, pushed: 1, emailed: 1 });
    expect(pushedTo()).toEqual([expect.objectContaining({ endpoint: 'https://push/admin', title: '⏸️ Vote non ouvert' })]);
    const [email] = sentEmails();
    expect(email.to[0].email).toBe('coach@club.fr');
    expect(email.htmlContent).toContain('dévoile ou clos d&#39;abord le vote précédent');
  });
});
