import type { VercelRequest } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin.js';

export type OrgRole = 'admin' | 'voter';

type AuthOk = { ok: true; userId: string };
type AuthFail = { ok: false; status: 401 | 403; error: string };

type MemberOk = { ok: true; userId: string; role: OrgRole };

/** Extract and verify the caller's Supabase JWT from the Authorization header. */
export async function authenticate(req: VercelRequest): Promise<AuthOk | AuthFail> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return { ok: false, status: 401, error: 'Authentification requise' };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: 'Session invalide' };

  return { ok: true, userId: data.user.id };
}

/** Verify the caller is authenticated AND a member of `orgId`. */
export async function requireOrgMember(
  req: VercelRequest,
  orgId: string,
): Promise<MemberOk | AuthFail> {
  const auth = await authenticate(req);
  if (!auth.ok) return auth;

  const { data: membership } = await supabaseAdmin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!membership) {
    return { ok: false, status: 403, error: "Accès refusé à cette organisation" };
  }

  return { ok: true, userId: auth.userId, role: (membership.role as OrgRole) ?? 'voter' };
}

/** Verify the caller is authenticated AND an admin of `orgId`. */
export async function requireOrgAdmin(
  req: VercelRequest,
  orgId: string,
): Promise<MemberOk | AuthFail> {
  const result = await requireOrgMember(req, orgId);
  if (!result.ok) return result;
  if (result.role !== 'admin') {
    return { ok: false, status: 403, error: 'Réservé aux administrateurs' };
  }
  return result;
}
