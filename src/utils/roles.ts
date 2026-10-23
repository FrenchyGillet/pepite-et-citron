import type { OrgRole } from '@/types';
import { t } from '@/i18n';

/** Admin or captain: may open, close and reveal a vote (can_run_matches). */
export function canRunMatches(role: OrgRole | null | undefined): boolean {
  return role === 'admin' || role === 'captain';
}

export function roleLabel(role: OrgRole | null | undefined): string {
  if (role === 'admin')   return t('roles.admin');
  if (role === 'captain') return t('roles.captain');
  return t('roles.voter');
}
