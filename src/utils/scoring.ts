import type { Player, Vote, EntityId } from '@/types';
import { computeScores } from '@/utils';

export interface RankedPlayer {
  id: EntityId;
  name: string;
  nickname?: string | null;
  pts: number;
  /** Competition rank from rankWithTies (ex-aequo share it). */
  rank?: number;
}

export interface RankedLemonPlayer extends RankedPlayer {
  absent: boolean;
}

/** Admin's pick after a « concours de bière » (stored on matches.tiebreakers). */
export interface Tiebreakers {
  best_id?: EntityId | null;
  lemon_id?: EntityId | null;
}

export interface RankGroup<T> {
  /** Standard competition rank: tied players share it (1, 1, 3…). */
  rank: number;
  pts: number;
  players: T[];
}

/**
 * THE ranking rule — used by the podium, the share text/image and the season
 * stats, so a match has the same winner on every screen.
 *
 * Players with 0 pts are left out. Equal scores share a rank. The admin's
 * tiebreaker, when set and part of the top group, wins that group alone and
 * the other tied players take the next rank. Without a tiebreaker, a tie at the
 * top means several winners (ex-aequo), never an arbitrary one.
 */
export function rankWithTies<T extends { id: EntityId; pts: number }>(
  entries: T[],
  tiebreakerId?: EntityId | null,
): RankGroup<T>[] {
  const byPts = new Map<number, T[]>();
  for (const e of entries) {
    if (e.pts > 0) byPts.set(e.pts, [...(byPts.get(e.pts) ?? []), e]);
  }
  const groups = [...byPts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([pts, players]) => ({ pts, players }));

  const top = groups[0];
  if (top && top.players.length > 1 && tiebreakerId != null) {
    const winner = top.players.find(p => String(p.id) === String(tiebreakerId));
    if (winner) {
      groups.splice(0, 1,
        { pts: top.pts, players: [winner] },
        { pts: top.pts, players: top.players.filter(p => p !== winner) },
      );
    }
  }

  let rank = 1;
  return groups.map(g => {
    const group = { rank, pts: g.pts, players: g.players };
    rank += g.players.length;
    return group;
  });
}

/** The match winner(s): one player, or every ex-aequo while the tie is open. */
export function resolveWinners<T extends { id: EntityId; pts: number }>(
  entries: T[],
  tiebreakerId?: EntityId | null,
): T[] {
  return rankWithTies(entries, tiebreakerId)[0]?.players ?? [];
}

export interface ResultsSummary {
  /** Best first; a tiebreaker winner comes before the players they beat. */
  pepiteRanked:     RankedPlayer[];
  lemonRanked:      RankedLemonPlayer[];
  pepiteWinners:    RankedPlayer[];
  lemonWinners:     RankedLemonPlayer[];
  ghosts:           Player[];
  bestTied:         boolean;
  lemonTied:        boolean;
  bestTiedPlayers:  Player[];
  lemonTiedPlayers: Player[];
}

export function computeResultsSummary(
  votes: Vote[],
  present: Player[],
  allPlayers: Player[],
  pepiteCount: 2 | 3 = 2,
  tiebreakers: Tiebreakers = {},
): ResultsSummary {
  const { best: bestScores, lemon: lemonScores } = computeScores(votes, present, allPlayers, pepiteCount);
  const everyone   = allPlayers.length ? allPlayers : present;
  const presentIds = new Set(present.map(p => p.id));

  const topBestPts  = present.length  ? Math.max(...present.map(p  => bestScores[p.id]?.pts  || 0)) : 0;
  const topLemonPts = everyone.length ? Math.max(...everyone.map(p => lemonScores[p.id]?.pts || 0)) : 0;

  const bestTied  = topBestPts  > 0 && present.filter(p  => (bestScores[p.id]?.pts  || 0) === topBestPts).length  > 1;
  const lemonTied = topLemonPts > 0 && everyone.filter(p => (lemonScores[p.id]?.pts || 0) === topLemonPts).length > 1;

  const bestTiedPlayers  = present.filter(p  => (bestScores[p.id]?.pts  || 0) === topBestPts);
  const lemonTiedPlayers = everyone.filter(p => (lemonScores[p.id]?.pts || 0) === topLemonPts);

  const ghosts = present.filter(p =>
    (bestScores[p.id]?.pts  || 0) === 0 &&
    (lemonScores[p.id]?.pts || 0) === 0,
  );

  const pepiteGroups = rankWithTies(
    present.map(p => ({ id: p.id, name: p.name, nickname: p.nickname, pts: bestScores[p.id]?.pts || 0 })),
    tiebreakers.best_id,
  );
  const lemonGroups = rankWithTies(
    everyone.map(p => ({ id: p.id, name: p.name, nickname: p.nickname, pts: lemonScores[p.id]?.pts || 0, absent: !presentIds.has(p.id) })),
    tiebreakers.lemon_id,
  );

  const pepiteRanked = pepiteGroups.flatMap(g => g.players.map(p => ({ ...p, rank: g.rank })));
  const lemonRanked  = lemonGroups.flatMap(g => g.players.map(p => ({ ...p, rank: g.rank })));

  return {
    pepiteRanked,
    lemonRanked,
    pepiteWinners: pepiteRanked.filter(p => p.rank === 1),
    lemonWinners:  lemonRanked.filter(p => p.rank === 1),
    ghosts, bestTied, lemonTied, bestTiedPlayers, lemonTiedPlayers,
  };
}
