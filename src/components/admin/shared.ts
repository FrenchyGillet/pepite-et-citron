import type { useConfirm } from '@/hooks/useConfirm';
import type { EntityId, Player } from '@/types';

/** Shared plumbing handed down by AdminView to its sections. */
export type ConfirmFn = ReturnType<typeof useConfirm>['confirm'];
export type Notify    = (message: string) => void;

/** A team's players minus the archived ones (archived players leave every picker). */
export function activeTeamPlayerIds(team: { player_ids: EntityId[] }, activePlayers: Player[]): EntityId[] {
  const activeIds = new Set(activePlayers.map(p => p.id));
  return team.player_ids.filter(id => activeIds.has(id));
}

export const sectionLabelStyle = {
  fontSize: 13, fontWeight: 600, color: 'var(--label3)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10,
} as const;
