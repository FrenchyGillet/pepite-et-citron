import type { Player, Match, Vote, EntityId } from '../types';
import { computeScores } from '../utils';

export interface PlayerStat {
  name: string;
  bestPts: number;
  lemonPts: number;
  wins: number;
  lemons: number;
}

export interface SeasonStats {
  rankedBest:   PlayerStat[];
  rankedLemon:  PlayerStat[];
  maxPts:       number;
  maxLemonPts:  number;
}

export function computeSeasonStats(
  players: Player[],
  matches: Match[],
  allVotes: Vote[],
): SeasonStats {
  const stats: Record<string, PlayerStat> = {};
  players.forEach(p => { stats[String(p.id)] = { name: p.name, bestPts: 0, lemonPts: 0, wins: 0, lemons: 0 }; });

  matches.forEach(match => {
    const mv = allVotes.filter(v => v.match_id === match.id);
    const pp = players.filter(p => (match.present_ids || []).includes(p.id));
    const { best, lemon } = computeScores(mv, pp, players);
    let maxB = 0, maxL = 0;
    let bW: EntityId | null = null, lW: EntityId | null = null;

    pp.forEach(p => {
      const s = stats[String(p.id)];
      if (!s) return;
      const bp = best[p.id]?.pts || 0;
      s.bestPts += bp;
      if (bp > maxB) { maxB = bp; bW = p.id; }
    });
    players.forEach(p => {
      const s = stats[String(p.id)];
      if (!s) return;
      const lp = lemon[p.id]?.pts || 0;
      s.lemonPts += lp;
      if (lp > maxL) { maxL = lp; lW = p.id; }
    });

    if (bW != null && stats[String(bW)]) stats[String(bW)].wins++;
    if (lW != null && stats[String(lW)]) stats[String(lW)].lemons++;
  });

  const allStats    = Object.values(stats).filter(s => s.bestPts > 0 || s.lemonPts > 0);
  const rankedBest  = [...allStats].filter(s => s.bestPts  > 0).sort((a, b) => b.bestPts  - a.bestPts);
  const rankedLemon = [...allStats].filter(s => s.lemonPts > 0).sort((a, b) => b.lemonPts - a.lemonPts);
  const maxPts      = rankedBest[0]?.bestPts   || 1;
  const maxLemonPts = rankedLemon[0]?.lemonPts || 1;

  return { rankedBest, rankedLemon, maxPts, maxLemonPts };
}
