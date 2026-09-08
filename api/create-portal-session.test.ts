import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL         = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.STRIPE_SECRET_KEY         = 'sk_test';
  process.env.VITE_APP_URL              = 'https://pepite-citron.com';
});

const { mockStripe, mockAuth, mockFrom } = vi.hoisted(() => ({
  mockStripe: { billingPortal: { sessions: { create: vi.fn() } } },
  mockAuth:   { getUser: vi.fn() },
  mockFrom:   vi.fn(),
}));

vi.mock('stripe', () => ({ default: vi.fn().mockImplementation(function () { return mockStripe; }) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: mockAuth, from: mockFrom }) }));

import { makeReq, makeRes, makeFrom } from './_lib/testUtils';
import handler from './create-portal-session';

const req = (o: Record<string, unknown> = {}) => makeReq({ body: { orgId: 'org-1' }, ...o });

describe('POST /api/create-portal-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockStripe.billingPortal.sessions.create.mockResolvedValue({ url: 'https://portal' });
    mockFrom.mockImplementation(makeFrom({
      role: 'admin',
      tables: { organizations: { data: { stripe_customer_id: 'cus_123' }, error: null } },
    }));
  });

  it('returns 405 for non-POST', async () => {
    const res = makeRes();
    await handler(req({ method: 'GET' }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it('returns 400 without an orgId', async () => {
    const res = makeRes();
    await handler(req({ body: {} }) as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = makeRes();
    await handler(req({ headers: {} }) as any, res as any);
    expect(res.statusCode).toBe(401);
    expect(mockStripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not a member', async () => {
    mockFrom.mockImplementation(makeFrom({ role: null }));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(403);
    expect(mockStripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is only a voter', async () => {
    mockFrom.mockImplementation(makeFrom({ role: 'voter' }));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(403);
  });

  it('returns the portal URL for an admin', async () => {
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ url: 'https://portal' });
  });

  it('returns 404 when the org has no Stripe customer', async () => {
    mockFrom.mockImplementation(makeFrom({
      role: 'admin',
      tables: { organizations: { data: { stripe_customer_id: null }, error: null } },
    }));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(404);
  });
});
