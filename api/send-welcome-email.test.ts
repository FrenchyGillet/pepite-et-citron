import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL         = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.BREVO_API_KEY             = 'test-brevo-key';
  process.env.VITE_APP_URL              = 'https://pepite-citron.com';
});

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: { getUser: vi.fn(), admin: { getUserById: vi.fn() } },
  mockFrom: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: mockAuth, from: mockFrom }),
}));

import { makeReq, makeRes, makeFrom } from './_lib/testUtils';
import handler from './send-welcome-email';

const req = (o: Record<string, unknown> = {}) => makeReq({ body: { orgId: 'org-1' }, ...o });
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const withOrg = (createdAt: string, role: 'admin' | 'captain' | 'voter' | null = 'admin') =>
  mockFrom.mockImplementation(makeFrom({
    role,
    tables: { organizations: { data: { id: 'org-1', name: 'Les <Lions>', slug: 'lions', created_at: createdAt }, error: null } },
  }));
const sentBody = () => JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);

describe('POST /api/send-welcome-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue('') }));
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockAuth.admin.getUserById.mockResolvedValue({ data: { user: { id: 'user-1', email: 'coach@club.fr' } }, error: null });
    withOrg(minutesAgo(2));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('returns 405 for non-POST', async () => {
    const res = makeRes();
    await handler(req({ method: 'GET' }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it('returns 401 without a token', async () => {
    const res = makeRes();
    await handler(req({ headers: {} }) as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 without an orgId', async () => {
    const res = makeRes();
    await handler(req({ body: {} }) as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 403 to a member who is not admin', async () => {
    withOrg(minutesAgo(2), 'voter');
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends the vote link, the reveal steps and the app link to the caller's own address", async () => {
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.body).toEqual({ sent: 1 });
    const body = sentBody();
    expect(body.to).toEqual([{ email: 'coach@club.fr' }]);
    expect(body.subject).toBe('⭐ Les <Lions> est prête sur Pépite & Citron');
    expect(body.htmlContent).toContain('https://pepite-citron.com/vote?org=lions');
    expect(body.htmlContent).toContain('Lancer le dépouillement');
    expect(body.htmlContent).toContain('https://pepite-citron.com/admin');
    // Team name is escaped in the HTML
    expect(body.htmlContent).toContain('Les &lt;Lions&gt;');
    expect(body.htmlContent).not.toContain('Les <Lions>');
  });

  it('sends nothing for a team created more than an hour ago', async () => {
    withOrg(minutesAgo(90));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.body).toEqual({ sent: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('skips quietly when no email provider is configured', async () => {
    const key = process.env.BREVO_API_KEY;
    delete process.env.BREVO_API_KEY;
    const res = makeRes();
    await handler(req() as any, res as any);
    process.env.BREVO_API_KEY = key;
    expect(res.body).toEqual({ skipped: true });
  });
});
