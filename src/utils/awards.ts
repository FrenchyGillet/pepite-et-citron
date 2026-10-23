import type { EntityId, Match, Player, Vote } from '@/types';
import { computeScores } from '@/utils';
import { resolveWinners } from '@/utils/scoring';
import { manualScores } from '@/utils/manualResult';

/**
 * Season awards, computed from the matches already played (no storage):
 * season titles, titles of the month, streaks and records, plus what to
 * announce right after a reveal.
 *
 * Only revealed matches count (or results entered by hand): a vote closed
 * without a reveal "ne compte pas dans la saison". Ties share a title.
 */

export interface MatchResult {
  matchId: EntityId;
  label: string;
  date: Date;
  present: Set<string>;
  /** Pépite / Citron of the match (several when tied, tiebreaker applied). */
  pepites: string[];
  citrons: string[];
  bestPts: Record<string, number>;
  lemonPts: Record<string, number>;
}

/** A match counts once revealed (reveal started or done) or entered by hand. */
export function countsForAwards(m: Match): boolean {
  return !!m.manual_result || ((m.reveal_order?.length ?? 0) > 0 && m.phase !== 'voting');
}

/** The counted matches, oldest first, with their scores and title holders. */
export function matchResults(players: Player[], matches: Match[], votes: Vote[]): MatchResult[] {
  return matches
    .filter(countsForAwards)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(match => {
      const present = players.filter(p => (match.present_ids || []).includes(p.id));
      const { best, lemon } = match.manual_result
        ? manualScores(match.manual_result, present, players)
        : computeScores(votes.filter(v => v.match_id === match.id), present, players, match.pepite_count ?? 2);
      const bestPts: Record<string, number> = {};
      const lemonPts: Record<string, number> = {};
      present.forEach(p => { bestPts[String(p.id)] = best[p.id]?.pts ?? 0; });
      players.forEach(p => { lemonPts[String(p.id)] = lemon[p.id]?.pts ?? 0; });

      let pepites: string[];
      let citrons: string[];
      if (match.manual_result) {
        pepites = [String(match.manual_result.best_ids[0])];
        citrons = [String(match.manual_result.lemon_id)];
      } else {
        const tb = match.tiebreakers || {};
        const winners = (pts: Record<string, number>, tie?: EntityId) => {
          const entries = Object.entries(pts).map(([id, p]) => ({ id, pts: p }));
          if (!entries.some(e => e.pts > 0)) return [];
          return resolveWinners(entries, tie != null ? String(tie) : null).map(w => w.id);
        };
        pepites = winners(bestPts, tb.best_id);
        citrons = winners(lemonPts, tb.lemon_id);
      }
      return {
        matchId: match.id, label: match.label, date: new Date(match.created_at),
        present: new Set(present.map(p => String(p.id))), pepites, citrons, bestPts, lemonPts,
      };
    });
}

export interface Title {
  /** Player ids sharing the title. */
  ids: string[];
  /** Points (pépite / citron) or matches played (attendance). */
  value: number;
}

/** Highest total, ties share it; null when nobody scored. */
function topOf(totals: Map<string, number>): Title | null {
  let value = 0;
  totals.forEach(v => { if (v > value) value = v; });
  if (value <= 0) return null;
  return { ids: [...totals].filter(([, v]) => v === value).map(([id]) => id), value };
}

function sum(results: MatchResult[], pick: (r: MatchResult) => Record<string, number>): Map<string, number> {
  const totals = new Map<string, number>();
  results.forEach(r => Object.entries(pick(r)).forEach(([id, v]) => totals.set(id, (totals.get(id) ?? 0) + v)));
  return totals;
}

export interface SeasonTitles {
  pepite: Title | null;
  citron: Title | null;
  /** Most matches played. */
  attendance: Title | null;
  matches: number;
}

export function seasonTitles(results: MatchResult[]): SeasonTitles {
  const played = new Map<string, number>();
  results.forEach(r => r.present.forEach(id => played.set(id, (played.get(id) ?? 0) + 1)));
  return {
    pepite: topOf(sum(results, r => r.bestPts)),
    citron: topOf(sum(results, r => r.lemonPts)),
    attendance: topOf(played),
    matches: results.length,
  };
}

/** "2026-10" in device time. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface MonthTitles {
  month: string;
  pepite: Title | null;
  citron: Title | null;
  matches: number;
}

/** Titles of each month with a counted match, most recent first. */
export function monthlyTitles(results: MatchResult[]): MonthTitles[] {
  const byMonth = new Map<string, MatchResult[]>();
  results.forEach(r => {
    const key = monthKey(r.date);
    byMonth.set(key, [...(byMonth.get(key) ?? []), r]);
  });
  return [...byMonth].sort(([a], [b]) => b.localeCompare(a)).map(([month, rs]) => ({
    month,
    pepite: topOf(sum(rs, r => r.bestPts)),
    citron: topOf(sum(rs, r => r.lemonPts)),
    matches: rs.length,
  }));
}

export interface Streak {
  id: string;
  kind: 'pepite' | 'citron';
  length: number;
}

/** Consecutive matches won, per player (a match without the title breaks it). */
function streaks(results: MatchResult[], kind: Streak['kind']): { current: Map<string, number>; longest: Map<string, number> } {
  const current = new Map<string, number>();
  const longest = new Map<string, number>();
  results.forEach(r => {
    const holders = new Set(kind === 'pepite' ? r.pepites : r.citrons);
    // Every player seen so far, plus the title holders of this match.
    const ids = new Set([...current.keys(), ...holders]);
    ids.forEach(id => {
      const n = holders.has(id) ? (current.get(id) ?? 0) + 1 : 0;
      current.set(id, n);
      if (n > (longest.get(id) ?? 0)) longest.set(id, n);
    });
  });
  return { current, longest };
}

/** Streaks still running at the last match, 2 or more, longest first. */
export function currentStreaks(results: MatchResult[]): Streak[] {
  return (['pepite', 'citron'] as const).flatMap(kind =>
    [...streaks(results, kind).current]
      .filter(([, n]) => n >= 2)
      .map(([id, length]) => ({ id, kind, length })))
    .sort((a, b) => b.length - a.length);
}

export interface Records {
  /** Best pépite score on a single match. */
  bestMatch: { ids: string[]; value: number; label: string } | null;
  /** Longest pépite / citron streaks of the season (2 or more). */
  pepiteStreak: Title | null;
  citronStreak: Title | null;
}

export function seasonRecords(results: MatchResult[]): Records {
  let bestMatch: Records['bestMatch'] = null;
  results.forEach(r => {
    Object.entries(r.bestPts).forEach(([id, v]) => {
      if (v <= 0) return;
      if (!bestMatch || v > bestMatch.value) bestMatch = { ids: [id], value: v, label: r.label };
      else if (v === bestMatch.value && !bestMatch.ids.includes(id)) bestMatch.ids.push(id);
    });
  });
  const longest = (kind: Streak['kind']) => {
    const top = topOf(streaks(results, kind).longest);
    return top && top.value >= 2 ? top : null;
  };
  return { bestMatch, pepiteStreak: longest('pepite'), citronStreak: longest('citron') };
}

export type Announcement =
  | { kind: 'pepiteStreak' | 'citronStreak'; id: string; count: number }
  | { kind: 'record'; id: string; count: number }
  | { kind: 'monthLeader'; id: string };

/**
 * What a reveal tells the team about this match (at most 3): a streak that
 * goes on, a new single-match record, a new leader of the month.
 */
export function revealAnnouncements(results: MatchResult[], matchId: EntityId): Announcement[] {
  const idx = results.findIndex(r => String(r.matchId) === String(matchId));
  if (idx === -1) return [];
  const upTo = results.slice(0, idx + 1);
  const before = results.slice(0, idx);
  const match = results[idx];
  const out: Announcement[] = [];

  const pep = streaks(upTo, 'pepite').current;
  match.pepites.forEach(id => { const n = pep.get(id) ?? 0; if (n >= 2) out.push({ kind: 'pepiteStreak', id, count: n }); });
  const cit = streaks(upTo, 'citron').current;
  match.citrons.forEach(id => { const n = cit.get(id) ?? 0; if (n >= 2) out.push({ kind: 'citronStreak', id, count: n }); });

  // A new season record needs a few matches behind it to mean something.
  if (before.length >= 2) {
    const previous = Math.max(0, ...before.flatMap(r => Object.values(r.bestPts)));
    Object.entries(match.bestPts)
      .filter(([, v]) => v > previous)
      .forEach(([id, v]) => out.push({ kind: 'record', id, count: v }));
  }

  // The month's leader changed with this match (from its 2nd match on).
  const month = monthKey(match.date);
  const sameMonth = upTo.filter(r => monthKey(r.date) === month);
  if (sameMonth.length >= 2) {
    const now = topOf(sum(sameMonth, r => r.bestPts));
    const was = topOf(sum(sameMonth.slice(0, -1), r => r.bestPts));
    if (now && now.ids.length === 1 && !(was?.ids.length === 1 && was.ids[0] === now.ids[0])) {
      out.push({ kind: 'monthLeader', id: now.ids[0] });
    }
  }
  return out.slice(0, 3);
}
