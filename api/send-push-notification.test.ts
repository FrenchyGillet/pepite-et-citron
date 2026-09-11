import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL         = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.VAPID_PUBLIC_KEY          = 'test-vapid-public';
  process.env.VAPID_PRIVATE_KEY         = 'test-vapid-private';
  process.env.VITE_APP_URL              = 'https://pepite-citron.com';
});

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: { getUser: vi.fn() },
  mockFrom: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: mockAuth, from: mockFrom }),
}));

const { sendNotification } = vi.hoisted(() => ({ sendNotification: vi.fn() }));
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification },
}));

import { makeReq, makeRes, makeFrom } from './_lib/testUtils';
import handler from './send-push-notification';

const req = (o: Record<string, unknown> = {}) =>
  makeReq({ body: { orgId: 'org-1', type: 'vote_open', matchLabel: 'PSG vs OM' }, ...o });

describe('POST /api/send-push-notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    sendNotification.mockResolvedValue(undefined);
    mockFrom.mockImplementation(makeFrom({
      role: 'admin',
      tables: {
        push_subscriptions: {
          data: [{ endpoint: 'https://push/1', p256dh: 'k', auth: 'a', user_id: 'user-2' }],
          error: null,
        },
      },
    }));
  });

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

  it('returns 403 when the caller is not a member', async () => {
    mockFrom.mockImplementation(makeFrom({ role: null }));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(403);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('returns 403 for a voter', async () => {
    mockFrom.mockImplementation(makeFrom({ role: 'voter' }));
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(403);
  });

  it('returns 400 on an invalid type', async () => {
    const res = makeRes();
    await handler(req({ body: { orgId: 'org-1', type: 'nope', matchLabel: 'x' } }) as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it('fans out to subscribers for an admin caller', async () => {
    const res = makeRes();
    await handler(req() as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ sent: 1 });
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  // B4: "/" is the marketing landing page — the vote push must open the app.
  it('"vote ouvert" opens the vote screen, not the landing page', async () => {
    await handler(req() as any, makeRes() as any);
    const payload = JSON.parse(sendNotification.mock.calls[0][1]);
    expect(payload.url).toBe('https://pepite-citron.com/vote');
  });

  it('"résultats disponibles" opens the results screen', async () => {
    await handler(req({ body: { orgId: 'org-1', type: 'results_ready', matchLabel: 'PSG vs OM' } }) as any, makeRes() as any);
    const payload = JSON.parse(sendNotification.mock.calls[0][1]);
    expect(payload.url).toBe('https://pepite-citron.com/results');
  });
});
