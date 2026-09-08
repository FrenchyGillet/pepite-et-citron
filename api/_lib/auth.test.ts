import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL         = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: { getUser: vi.fn() },
  mockFrom: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: mockAuth, from: mockFrom }),
}));

import { makeFrom } from './testUtils';
import { authenticate, requireOrgMember, requireOrgAdmin } from './auth';

const reqWith = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as any;

describe('api/_lib/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockImplementation(makeFrom({ role: 'admin' }));
  });

  describe('authenticate', () => {
    it('rejects a missing header', async () => {
      expect(await authenticate(reqWith())).toMatchObject({ ok: false, status: 401 });
    });

    it('rejects a non-Bearer header', async () => {
      expect(await authenticate(reqWith('Basic abc'))).toMatchObject({ ok: false, status: 401 });
    });

    it('rejects an invalid token', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad') });
      expect(await authenticate(reqWith('Bearer x'))).toMatchObject({ ok: false, status: 401 });
    });

    it('accepts a valid token', async () => {
      expect(await authenticate(reqWith('Bearer x'))).toEqual({ ok: true, userId: 'user-1' });
    });
  });

  describe('requireOrgMember', () => {
    it('is 403 for a non-member', async () => {
      mockFrom.mockImplementation(makeFrom({ role: null }));
      expect(await requireOrgMember(reqWith('Bearer x'), 'org-1')).toMatchObject({ ok: false, status: 403 });
    });

    it('accepts a voter', async () => {
      mockFrom.mockImplementation(makeFrom({ role: 'voter' }));
      expect(await requireOrgMember(reqWith('Bearer x'), 'org-1')).toMatchObject({ ok: true, role: 'voter' });
    });
  });

  describe('requireOrgAdmin', () => {
    it('is 403 for a voter', async () => {
      mockFrom.mockImplementation(makeFrom({ role: 'voter' }));
      expect(await requireOrgAdmin(reqWith('Bearer x'), 'org-1')).toMatchObject({ ok: false, status: 403 });
    });

    it('accepts an admin', async () => {
      expect(await requireOrgAdmin(reqWith('Bearer x'), 'org-1')).toMatchObject({ ok: true, role: 'admin' });
    });

    it('propagates a 401 from authenticate', async () => {
      expect(await requireOrgAdmin(reqWith(), 'org-1')).toMatchObject({ ok: false, status: 401 });
    });
  });
});
