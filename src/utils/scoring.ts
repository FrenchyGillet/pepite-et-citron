import type { Player, Vote, EntityId } from '../types';
import { computeScores } from '../utils';

export interface RankedPlayer {
  id: EntityId;
  name: string;
  pts: number;
}

export interface RankedLemonPlayer extends RankedPlayer {
  absent: boolean;
}

export interface ResultsSummary {
  pepiteRanked:     RankedPlayer[];
  lemonRanked:      RankedLemonPlayer[];
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
): ResultsSummary {
  const { best: bestScores, lemon: lemonScores } = computeScores(votes, present, allPlayers);
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

  const pepiteRanked: RankedPlayer[] = present
    .map(p => ({ id: p.id, name: p.name, pts: bestScores[p.id]?.pts || 0 }))
    .filter(p => p.pts > 0)
    .sort((a, b) => b.pts - a.pts);

  const lemonRanked: RankedLemonPlayer[] = everyone
    .map(p => ({ id: p.id, name: p.name, pts: lemonScores[p.id]?.pts || 0, absent: !presentIds.has(p.id) }))
    .filter(p => p.pts > 0)
    .sort((a, b) => b.pts - a.pts);

  return { pepiteRanked, lemonRanked, ghosts, bestTied, lemonTied, bestTiedPlayers, lemonTiedPlayers };
}
