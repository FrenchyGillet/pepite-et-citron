import type { Player, Match, Vote, EntityId } from '@/types';
import { computeScores } from '@/utils';

export interface PlayerStat {
  name: string;
  bestPts: number;
  lemonPts: number;
  wins: number;
  lemons: number;
  matchesPlayed: number;
  absences: number;
  /** Best pts earned per match, chronological order, present matches only. */
  bestHistory: number[];
  /** Lemon pts earned per match, chronological order, present matches only. */
  lemonHistory: number[];
}

export interface SeasonStats {
  rankedBest:        PlayerStat[];
  rankedLemon:       PlayerStat[];
  rankedAttendance:  PlayerStat[];
  maxPts:            number;
  maxLemonPts:       number;
  totalMatches:      number;
}

export function computeSeasonStats(
  players: Player[],
  matches: Match[],
  allVotes: Vote[],
): SeasonStats {
  const stats: Record<string, PlayerStat> = {};
  players.forEach(p => {
    stats[String(p.id)] = {
      name: p.name, bestPts: 0, lemonPts: 0, wins: 0, lemons: 0,
      matchesPlayed: 0, absences: 0,
      bestHistory: [], lemonHistory: [],
    };
  });

  // Chronological order so sparkline data points are in the right sequence.
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  sortedMatches.forEach(match => {
    const mv = allVotes.filter(v => v.match_id === match.id);
    const pp = players.filter(p => (match.present_ids || []).includes(p.id));
    const { best, lemon } = computeScores(mv, pp, players, match.pepite_count ?? 2);
    let maxB = 0, maxL = 0;
    let bW: EntityId | null = null, lW: EntityId | null = null;

    const presentSet = new Set((match.present_ids || []).map(String));

    pp.forEach(p => {
      const s = stats[String(p.id)];
      if (!s) return;
      const bp = best[p.id]?.pts || 0;
      s.bestPts += bp;
      s.matchesPlayed++;
      s.bestHistory.push(bp);
      s.lemonHistory.push(lemon[p.id]?.pts || 0);
      if (bp > maxB) { maxB = bp; bW = p.id; }
    });

    // Absences: players known to the team but not in present_ids.
    players.forEach(p => {
      const s = stats[String(p.id)];
      if (!s) return;
      const lp = lemon[p.id]?.pts || 0;
      // Lemon pts accumulate for all (absent players can still receive citron votes).
      s.lemonPts += lp;
      if (lp > maxL) { maxL = lp; lW = p.id; }
      if (!presentSet.has(String(p.id))) s.absences++;
    });

    if (bW != null && stats[String(bW)]) stats[String(bW)].wins++;
    if (lW != null && stats[String(lW)]) stats[String(lW)].lemons++;
  });

  // Players who scored OR who played at least once (to surface attendance data).
  const allStats = Object.values(stats).filter(
    s => s.bestPts > 0 || s.lemonPts > 0 || s.matchesPlayed > 0
  );

  const rankedBest  = [...allStats].filter(s => s.bestPts  > 0).sort((a, b) => b.bestPts  - a.bestPts);
  const rankedLemon = [...allStats].filter(s => s.lemonPts > 0).sort((a, b) => b.lemonPts - a.lemonPts);

  // Attendance: sort by fewest absences first, then most games played as tiebreaker.
  const rankedAttendance = [...allStats]
    .filter(s => s.matchesPlayed > 0 || s.absences > 0)
    .sort((a, b) => a.absences - b.absences || b.matchesPlayed - a.matchesPlayed);

  const maxPts      = rankedBest[0]?.bestPts   || 1;
  const maxLemonPts = rankedLemon[0]?.lemonPts || 1;

  return { rankedBest, rankedLemon, rankedAttendance, maxPts, maxLemonPts, totalMatches: sortedMatches.length };
}
