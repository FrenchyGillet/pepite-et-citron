import type { OrgRole } from '@/types';

/** Admin or captain: may open, close and reveal a vote (can_run_matches). */
export function canRunMatches(role: OrgRole | null | undefined): boolean {
  return role === 'admin' || role === 'captain';
}

export function roleLabel(role: OrgRole | null | undefined): string {
  if (role === 'admin')   return 'Admin';
  if (role === 'captain') return 'Capitaine';
  return 'Votant';
}
