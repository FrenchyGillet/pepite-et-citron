import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { auth } = vi.hoisted(() => ({
  auth: { getSession: vi.fn(), refreshSession: vi.fn() },
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));

import { postToApi } from './serverApi';

const fetchMock = vi.fn();
const response = (status: number) => ({ status, ok: status < 400 }) as Response;
const tokenOf = (call: number) => fetchMock.mock.calls[call][1].headers.Authorization;

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  auth.getSession.mockResolvedValue({ data: { session: { access_token: 'old' } } });
  auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'fresh' } }, error: null });
});
afterEach(() => vi.unstubAllGlobals());

describe('postToApi', () => {
  it('sends the JSON body with the access token', async () => {
    fetchMock.mockResolvedValue(response(200));
    const res = await postToApi('/api/create-checkout-session', { orgId: 'o', plan: 'annual' });
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/create-checkout-session');
    expect(init).toMatchObject({ method: 'POST', body: '{"orgId":"o","plan":"annual"}' });
    expect(tokenOf(0)).toBe('Bearer old');
    expect(auth.refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes an expired session once and retries on 401', async () => {
    fetchMock.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200));
    const res = await postToApi('/api/x', {});
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(tokenOf(1)).toBe('Bearer fresh');
  });

  it('returns the 401 when the session cannot be refreshed', async () => {
    fetchMock.mockResolvedValue(response(401));
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('refresh failed') });
    const res = await postToApi('/api/x', {});
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks to sign in again without a session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(postToApi('/api/x', {})).rejects.toThrow(/reconnecte-toi/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
