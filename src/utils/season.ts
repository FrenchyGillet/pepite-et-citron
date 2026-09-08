import type { Player, Match, Vote, Team, EntityId } from '@/types';
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
  teams: Team[],
): SeasonStats {
  const stats: Record<string, PlayerStat> = {};
  players.forEach(p => {
    stats[String(p.id)] = {
      name: p.name, bestPts: 0, lemonPts: 0, wins: 0, lemons: 0,
      matchesPlayed: 0, absences: 0,
      bestHistory: [], lemonHistory: [],
    };
  });

  const teamsById = new Map(teams.map(t => [String(t.id), t]));

  // Chronological order so sparkline data points are in the right sequence.
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  sortedMatches.forEach(match => {
    const mv = allVotes.filter(v => v.match_id === match.id);
    const pp = players.filter(p => (match.present_ids || []).includes(p.id));
    const { best, lemon } = computeScores(mv, pp, players, match.pepite_count ?? 2);
    let maxB = 0, maxL = 0;

    const presentSet = new Set((match.present_ids || []).map(String));

    // Team roster for this match — absent = in team but not in present_ids.
    // If the match has no team_id, absence tracking is skipped (no reference roster).
    const team = match.team_id ? teamsById.get(String(match.team_id)) : null;
    const teamMemberSet = team
      ? new Set(team.player_ids.map(String))
      : null;

    pp.forEach(p => {
      const s = stats[String(p.id)];
      if (!s) return;
      const bp = best[p.id]?.pts || 0;
      s.bestPts += bp;
      s.matchesPlayed++;
      s.bestHistory.push(bp);
      if (bp > maxB) maxB = bp;
    });

    players.forEach(p => {
      const s = stats[String(p.id)];
      if (!s) return;
      const lp = lemon[p.id]?.pts || 0;
      // Lemon pts accumulate for all (absent players can still receive citron
      // votes). History follows the same rule so sum(lemonHistory) === lemonPts.
      s.lemonPts += lp;
      s.lemonHistory.push(lp);
      if (lp > maxL) maxL = lp;

      // Absence: only for players who belong to this match's team and weren't called up.
      if (teamMemberSet && teamMemberSet.has(String(p.id)) && !presentSet.has(String(p.id))) {
        s.absences++;
      }
    });

    // Match winner(s): honour an admin tiebreaker if set, otherwise credit
    // every player tied at the top score (a `>` comparison silently dropped
    // all but the first tied player).
    const tb = match.tiebreakers || {};
    const creditWin = (id: EntityId) => { const s = stats[String(id)]; if (s) s.wins++; };
    const creditLemon = (id: EntityId) => { const s = stats[String(id)]; if (s) s.lemons++; };

    if (maxB > 0) {
      if (tb.best_id != null) creditWin(tb.best_id);
      else pp.filter(p => (best[p.id]?.pts || 0) === maxB).forEach(p => creditWin(p.id));
    }
    if (maxL > 0) {
      if (tb.lemon_id != null) creditLemon(tb.lemon_id);
      else players.filter(p => (lemon[p.id]?.pts || 0) === maxL).forEach(p => creditLemon(p.id));
    }
  });

  // Players who scored, played, or were absent from at least one team match.
  const allStats = Object.values(stats).filter(
    s => s.bestPts > 0 || s.lemonPts > 0 || s.matchesPlayed > 0 || s.absences > 0
  );

  const rankedBest  = [...allStats].filter(s => s.bestPts  > 0).sort((a, b) => b.bestPts  - a.bestPts);
  const rankedLemon = [...allStats].filter(s => s.lemonPts > 0).sort((a, b) => b.lemonPts - a.lemonPts);

  // Attendance: fewest absences first, most games played as tiebreaker.
  const rankedAttendance = [...allStats]
    .filter(s => s.matchesPlayed > 0 || s.absences > 0)
    .sort((a, b) => a.absences - b.absences || b.matchesPlayed - a.matchesPlayed);

  const maxPts      = rankedBest[0]?.bestPts   || 1;
  const maxLemonPts = rankedLemon[0]?.lemonPts || 1;

  return { rankedBest, rankedLemon, rankedAttendance, maxPts, maxLemonPts, totalMatches: sortedMatches.length };
}
