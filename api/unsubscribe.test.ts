import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL         = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.EMAIL_UNSUBSCRIBE_SECRET  = 'test-unsub-secret';
  process.env.VITE_APP_URL              = 'https://pepite-citron.com';
});

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mockFrom }) }));

import { makeChain } from './_lib/testUtils';
import { unsubscribeToken } from './_lib/unsubscribe';
import handler from './unsubscribe';

function makeRes() {
  const r = { statusCode: 200, body: '' as string, headers: {} as Record<string, string> };
  return Object.assign(r, {
    status:    vi.fn((c: number) => { r.statusCode = c; return r; }),
    send:      vi.fn((b: string) => { r.body = b; return r; }),
    end:       vi.fn(() => r),
    setHeader: vi.fn((k: string, v: string) => { r.headers[k] = v; }),
  });
}

const query = (o: Record<string, string> = {}) =>
  ({ u: 'user-2', o: 'org-1', t: unsubscribeToken('user-2', 'org-1'), ...o });

let members: ReturnType<typeof makeChain>;

beforeEach(() => {
  vi.clearAllMocks();
  members = makeChain({ error: null });
  mockFrom.mockImplementation((table: string) =>
    table === 'org_members' ? members : makeChain({ data: { name: 'Les <Lions>' }, error: null }));
});

describe('/api/unsubscribe', () => {
  it('GET shows a confirmation form and changes nothing (mail scanners open links)', async () => {
    const res = makeRes();
    await handler({ method: 'GET', query: query() } as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<form method="post"');
    expect(res.body).toContain('Les &lt;Lions&gt;'); // team name escaped
    expect(members.update).not.toHaveBeenCalled();
  });

  it('POST turns off the member\'s emails for that team', async () => {
    const res = makeRes();
    await handler({ method: 'POST', query: query() } as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(members.update).toHaveBeenCalledWith({ email_notifications: false });
    expect(members.eq).toHaveBeenCalledWith('user_id', 'user-2');
    expect(members.eq).toHaveBeenCalledWith('org_id', 'org-1');
    expect(res.body).toContain('C&#39;est noté'.replace('&#39;', "'"));
  });

  it('refuses a tampered link', async () => {
    const res = makeRes();
    await handler({ method: 'POST', query: query({ u: 'user-3' }) } as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(members.update).not.toHaveBeenCalled();
  });

  it('reports a database failure', async () => {
    members = makeChain({ error: { message: 'down' } });
    const res = makeRes();
    await handler({ method: 'POST', query: query() } as any, res as any);
    expect(res.statusCode).toBe(500);
  });

  it('returns 405 for other methods', async () => {
    const res = makeRes();
    await handler({ method: 'PUT', query: query() } as any, res as any);
    expect(res.statusCode).toBe(405);
  });
});
