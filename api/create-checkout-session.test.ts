import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL         = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.STRIPE_SECRET_KEY         = 'sk_test';
  process.env.STRIPE_PRICE_MONTHLY      = 'price_monthly';
  process.env.STRIPE_PRICE_ANNUAL       = 'price_annual';
  process.env.VITE_APP_URL              = 'https://pepite-citron.com';
});

const { mockStripe, mockAuth, mockFrom } = vi.hoisted(() => ({
  mockStripe: { checkout: { sessions: { create: vi.fn() } } },
  mockAuth:   { getUser: vi.fn() },
  mockFrom:   vi.fn(),
}));

vi.mock('stripe', () => ({ default: vi.fn().mockImplementation(function () { return mockStripe; }) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: mockAuth, from: mockFrom }) }));

import { makeReq, makeRes, makeFrom } from './_lib/testUtils';
import handler from './create-checkout-session';

const req = (o: Record<string, unknown> = {}) =>
  makeReq({ body: { orgId: 'org-1', plan: 'annual' }, ...o });

describe('POST /api/create-checkout-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout' });
    mockFrom.mockImplementation(makeFrom({
      role: 'admin',
      tables: { organizations: { data: { id: 'org-1', name: 'Les Lions', stripe_customer_id: null }, error: null } },
    }));
  });

  it('returns 400 on an invalid plan', async () => {
    const res = makeRes();
    await handler(req({ body: { orgId: 'org-1', plan: 'weekly' } }) as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = makeRes();
    await handler(req({ headers: {} }) as any, res as any);
    expect(res.statusCode).toBe(401);
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not an admin', async () => {
    mockFrom.mockImplementation(makeFrom({ role: 'voter' }));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(403);
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('creates a checkout session for an admin', async () => {
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ url: 'https://checkout' });
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_annual', quantity: 1 }],
        metadata: { orgId: 'org-1' },
        subscription_data: { metadata: { orgId: 'org-1' } },
      }),
    );
  });

  // S8: a second checkout would bill the team twice.
  it('returns 409 when the team is already Pro', async () => {
    mockFrom.mockImplementation(makeFrom({
      role: 'admin',
      tables: { organizations: { data: { id: 'org-1', name: 'Les Lions', plan: 'pro', stripe_customer_id: 'cus-1' }, error: null } },
    }));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'already_pro' });
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('returns a readable 502 when Stripe is unavailable', async () => {
    mockStripe.checkout.sessions.create.mockRejectedValue(new Error('api_connection_error'));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(502);
    expect(res.body).toMatchObject({ error: expect.stringMatching(/momentanément indisponible/) });
  });
});
