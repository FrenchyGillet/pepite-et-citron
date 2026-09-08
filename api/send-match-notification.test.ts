import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Env vars set before module import (module reads BREVO_API_KEY at init) ──

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL         = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.BREVO_API_KEY             = 'test-brevo-key';
  process.env.VITE_APP_URL              = 'https://pepite-citron.com';
});

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: { getUser: vi.fn() },
  mockFrom: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: mockAuth, from: mockFrom }),
}));

import { makeReq, makeRes, makeFrom } from './_lib/testUtils';
import handler from './send-match-notification';

const req = (o: Record<string, unknown> = {}) =>
  makeReq({ body: { orgId: 'org-1', matchLabel: 'PSG vs OM' }, ...o });

describe('POST /api/send-match-notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());

    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom.mockImplementation(makeFrom({
      role: 'admin',
      members: [{ email: 'alice@example.com' }, { email: 'bob@example.com' }],
      tables: { organizations: { data: { id: 'org-1', name: 'Les Lions', slug: 'lions' }, error: null } },
    }));

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

  it('returns {sent: 0} when there are no other members', async () => {
    mockFrom.mockImplementation(makeFrom({
      role: 'admin',
      members: [],
      tables: { organizations: { data: { id: 'org-1', name: 'Les Lions', slug: 'lions' }, error: null } },
    }));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.body).toMatchObject({ sent: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls Brevo and returns {sent: N} for an admin caller', async () => {
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ sent: 2 });
    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.subject).toContain('PSG vs OM');
  });

  it('escapes HTML in matchLabel before sending', async () => {
    const res = makeRes();
    await handler(req({ body: { orgId: 'org-1', matchLabel: '<img src=x onerror=alert(1)>' } }) as any, res as any);
    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.htmlContent).not.toContain('<img src=x');
    expect(callBody.htmlContent).toContain('&lt;img src=x');
  });

  it('rejects an over-long matchLabel (zod max 100)', async () => {
    const res = makeRes();
    await handler(req({ body: { orgId: 'org-1', matchLabel: 'x'.repeat(101) } }) as any, res as any);
    expect(res.statusCode).toBe(400);
  });
});
