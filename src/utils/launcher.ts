import type { EntityId, Match, Player, Team } from '@/types';

/**
 * Admin → « Maintenant »: the line-up a vote opens with, before the
 * organiser touches anything.
 */

/** The line-up of the last vote, while that team still exists; else the whole squad (null). */
export function defaultLaunchTeam(teams: Team[], matches: Match[]): EntityId | null {
  const last = [...matches]
    .filter(m => !m.manual_result)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (last?.team_id == null) return null;
  return teams.find(tm => String(tm.id) === String(last.team_id))?.id ?? null;
}

/** Who votes for this choice: the team's active players, or every active player. */
export function launchPlayerIds(teamId: EntityId | null, teams: Team[], activePlayers: Player[]): EntityId[] {
  const team = teamId == null ? null : teams.find(tm => String(tm.id) === String(teamId));
  if (!team) return activePlayers.map(p => p.id);
  const ids = new Set(team.player_ids.map(String));
  return activePlayers.filter(p => ids.has(String(p.id))).map(p => p.id);
}
