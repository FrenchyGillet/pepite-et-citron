import { describe, expect, it } from 'vitest';
import type { Match, Player, Team } from '@/types';
import { defaultLaunchTeam, launchPlayerIds } from './launcher';

const teams: Team[] = [{ id: 1, name: 'A', player_ids: [1, 2, 9] }, { id: 2, name: 'B', player_ids: [3] }];
const match = (o: Partial<Match>): Match => ({ id: 1, label: 'm', created_at: '2026-10-01T20:00:00Z', team_id: null, ...o } as Match);
const players: Player[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 3, name: 'c' }];

describe('defaultLaunchTeam', () => {
  it("takes the last vote's team", () => {
    expect(defaultLaunchTeam(teams, [
      match({ team_id: 2, created_at: '2026-10-01T20:00:00Z' }),
      match({ team_id: 1, created_at: '2026-10-08T20:00:00Z' }),
    ])).toBe(1);
  });

  it('ignores hand-entered results and deleted teams', () => {
    expect(defaultLaunchTeam(teams, [
      match({ team_id: 2, created_at: '2026-10-01T20:00:00Z' }),
      match({ team_id: 1, created_at: '2026-10-08T20:00:00Z', manual_result: { best_ids: [1], lemon_id: 2 } }),
    ])).toBe(2);
    expect(defaultLaunchTeam(teams, [match({ team_id: 7 })])).toBeNull();
    expect(defaultLaunchTeam(teams, [])).toBeNull();
  });
});

describe('launchPlayerIds', () => {
  it("lists the team's active players, or the whole squad", () => {
    expect(launchPlayerIds(1, teams, players)).toEqual([1, 2]);
    expect(launchPlayerIds(null, teams, players)).toEqual([1, 2, 3]);
    expect(launchPlayerIds(42, teams, players)).toEqual([1, 2, 3]);
  });
});
