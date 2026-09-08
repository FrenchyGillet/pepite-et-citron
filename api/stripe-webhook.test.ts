import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (hoisted so they are ready before module imports) ──────────────────

const { mockStripe, mockFrom } = vi.hoisted(() => {
  const mockStripe = {
    webhooks:      { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn() },
  };
  const mockFrom = vi.fn();
  return { mockStripe, mockFrom };
});

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(function () { return mockStripe; }),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Chainable Supabase query mock that resolves to `result` when awaited. */
function makeChain(result: unknown = { error: null }) {
  const c: Record<string, unknown> = {
    then: (f: (v: unknown) => unknown, r?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(f, r),
  };
  for (const m of ['select', 'update', 'delete', 'eq', 'neq']) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  return c;
}

/**
 * Mock VercelRequest that behaves like a Node.js readable stream.
 * Call req.deliver(body) after starting the handler to resolve getRawBody().
 */
function makeStreamReq(method = 'POST', extraHeaders: Record<string, string> = {}) {
  const cbs: Record<string, Array<(arg?: unknown) => void>> = {};
  const req = {
    method,
    headers: { 'stripe-signature': 'test-sig', ...extraHeaders },
    on(ev: string, cb: (arg?: unknown) => void) {
      (cbs[ev] ??= []).push(cb);
      return req;
    },
    /** Synchronously fires 'data' then 'end' — call after handler has registered listeners. */
    deliver(body: Buffer) {
      cbs['data']?.forEach(fn => fn(body));
      cbs['end']?.forEach(fn => fn());
    },
  };
  return req;
}

function makeRes() {
  const r = { statusCode: 200, body: undefined as unknown };
  return Object.assign(r, {
    status: vi.fn((c: number)  => { r.statusCode = c; return r; }),
    json:   vi.fn((b: unknown) => { r.body = b;       return r; }),
    end:    vi.fn(() => r),
  });
}

import handler from './stripe-webhook';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/stripe-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeChain({ error: null }));
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub-1',
      status: 'active',
      cancel_at_period_end: false,
      current_period_end: 1_800_000_000,
    });
  });

  it('returns 405 for non-POST', async () => {
    const req = makeStreamReq('GET');
    const res = makeRes();
    // Method check fires before getRawBody — no stream delivery needed
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it('returns 400 when Stripe signature is invalid', async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('No signatures found');
    });
    const req = makeStreamReq();
    const res = makeRes();
    const p = handler(req as any, res as any);
    req.deliver(Buffer.from('{}'));
    await p;
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: 'Invalid signature' });
  });

  it('checkout.session.completed upgrades org to Pro', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata:     { orgId: 'org-1' },
          customer:     'cus-1',
          subscription: 'sub-1',
        },
      },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    const req = makeStreamReq();
    const res = makeRes();
    const p = handler(req as any, res as any);
    req.deliver(Buffer.from(JSON.stringify(event)));
    await p;

    expect(res.statusCode).toBe(200);
    expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub-1');
    expect(mockFrom).toHaveBeenCalledWith('organizations');
    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'pro', stripe_customer_id: 'cus-1' }),
    );
  });

  it('customer.subscription.updated with active status keeps Pro', async () => {
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub-1', status: 'active',
          cancel_at_period_end: false,
          current_period_end: 1_800_000_000,
        },
      },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    const req = makeStreamReq();
    const res = makeRes();
    const p = handler(req as any, res as any);
    req.deliver(Buffer.from(JSON.stringify(event)));
    await p;

    expect(res.statusCode).toBe(200);
    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ plan: 'pro' }));
  });

  it('customer.subscription.updated with canceled status downgrades to Free', async () => {
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub-1', status: 'canceled',
          cancel_at_period_end: false,
          current_period_end: null,
        },
      },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    const req = makeStreamReq();
    const res = makeRes();
    const p = handler(req as any, res as any);
    req.deliver(Buffer.from(JSON.stringify(event)));
    await p;

    expect(res.statusCode).toBe(200);
    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ plan: 'free' }));
  });

  it('customer.subscription.deleted downgrades org to Free', async () => {
    const event = {
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub-1' } },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    const req = makeStreamReq();
    const res = makeRes();
    const p = handler(req as any, res as any);
    req.deliver(Buffer.from(JSON.stringify(event)));
    await p;

    expect(res.statusCode).toBe(200);
    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'free', stripe_subscription_id: null }),
    );
  });

  it('invoice.paid re-confirms Pro and clears payment failure', async () => {
    const event = {
      type: 'invoice.paid',
      data: {
        object: {
          parent: { subscription_details: { subscription: 'sub-1' } },
        },
      },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    const req = makeStreamReq();
    const res = makeRes();
    const p = handler(req as any, res as any);
    req.deliver(Buffer.from(JSON.stringify(event)));
    await p;

    expect(res.statusCode).toBe(200);
    expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub-1');
    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'pro', last_payment_failed_at: null }),
    );
  });

  it('invoice.payment_failed records failure timestamp without downgrading', async () => {
    const event = {
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus-1', attempt_count: 1,
          amount_due: 299, currency: 'eur',
          parent: { subscription_details: { subscription: 'sub-1' } },
        },
      },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    const req = makeStreamReq();
    const res = makeRes();
    const p = handler(req as any, res as any);
    req.deliver(Buffer.from(JSON.stringify(event)));
    await p;

    expect(res.statusCode).toBe(200);
    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ last_payment_failed_at: expect.any(String) }),
    );
    // plan must NOT be changed — no plan key in the update call
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArg).not.toHaveProperty('plan');
  });

  it('unknown event type returns 200 without touching the DB', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'some.future.event',
      data: { object: {} },
    });

    const req = makeStreamReq();
    const res = makeRes();
    const p = handler(req as any, res as any);
    req.deliver(Buffer.from('{}'));
    await p;

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ received: true });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
