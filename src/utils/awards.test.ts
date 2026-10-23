import { describe, expect, it } from 'vitest';
import type { Match, Player, Vote } from '@/types';
import {
  countsForAwards, currentStreaks, matchResults, monthlyTitles, revealAnnouncements, seasonRecords, seasonTitles,
} from './awards';

const players: Player[] = [1, 2, 3, 4].map(id => ({ id, name: ['Ana', 'Ben', 'Cid', 'Dan'][id - 1] }));
let nextVote = 1;

/** A revealed 2-pépite match: each ballot = [best1, best2, lemon]. */
function match(id: number, day: string, ballots: Array<[number, number, number]>, extra: Partial<Match> = {}): { m: Match; v: Vote[] } {
  return {
    m: {
      id, label: `M${id}`, is_open: false, phase: 'closed', present_ids: [1, 2, 3, 4],
      reveal_order: ballots.map(() => nextVote), revealed_count: ballots.length, season: 1, team_id: null,
      created_at: `${day}T20:00:00`, pepite_count: 2, ...extra,
    },
    v: ballots.map(([b1, b2, l]) => ({ id: nextVote++, match_id: id, voter_name: 'x', best1_id: b1, best2_id: b2, lemon_id: l })),
  };
}

function season(...ms: Array<{ m: Match; v: Vote[] }>) {
  return matchResults(players, ms.map(x => x.m), ms.flatMap(x => x.v));
}

// Ana wins three in a row; Dan is the citron twice in a row (M2, M3).
const M1 = match(1, '2026-09-29', [[1, 2, 3], [1, 3, 4], [1, 2, 3]]);       // Ana 6, citron Cid
const M2 = match(2, '2026-10-06', [[1, 2, 4], [1, 3, 4]]);                  // Ana 4, citron Dan
const M3 = match(3, '2026-10-13', [[1, 2, 4], [1, 2, 4], [2, 1, 4], [1, 4, 3]]); // Ana 7, citron Dan

describe('which matches count', () => {
  it('revealed or entered by hand, never a vote closed without a reveal', () => {
    expect(countsForAwards(M1.m)).toBe(true);
    expect(countsForAwards({ ...M1.m, reveal_order: [] })).toBe(false);
    expect(countsForAwards({ ...M1.m, phase: 'voting', is_open: true })).toBe(false);
    expect(countsForAwards({ ...M1.m, reveal_order: null as never, manual_result: { best_ids: [2], lemon_id: 3 } })).toBe(true);
  });
});

describe('season titles and records', () => {
  const results = season(M1, M3, M2); // order given does not matter

  it('Pépite, Citron and most matches played of the season', () => {
    const t = seasonTitles(results);
    expect(t.pepite).toEqual({ ids: ['1'], value: 17 });
    expect(t.citron).toEqual({ ids: ['4'], value: 6 });
    expect(t.attendance).toEqual({ ids: ['1', '2', '3', '4'], value: 3 });
    expect(t.matches).toBe(3);
  });

  it('titles of the month, most recent first', () => {
    const months = monthlyTitles(results);
    expect(months.map(m => m.month)).toEqual(['2026-10', '2026-09']);
    expect(months[0]).toMatchObject({ pepite: { ids: ['1'], value: 11 }, citron: { ids: ['4'], value: 5 }, matches: 2 });
  });

  it('streaks still running and records', () => {
    expect(currentStreaks(results)).toEqual([
      { id: '1', kind: 'pepite', length: 3 },
      { id: '4', kind: 'citron', length: 2 },
    ]);
    expect(seasonRecords(results)).toEqual({
      bestMatch: { ids: ['1'], value: 7, label: 'M3' },
      pepiteStreak: { ids: ['1'], value: 3 },
      citronStreak: { ids: ['4'], value: 2 },
    });
  });

  it('a match without the title breaks the streak', () => {
    const M4 = match(4, '2026-10-20', [[2, 3, 1], [2, 3, 1]]); // Ben, citron Ana
    expect(currentStreaks(season(M1, M2, M3, M4))).toEqual([]);
  });
});

describe('what the reveal announces', () => {
  it('a streak that goes on, a new record, nothing about the month on its first match', () => {
    expect(revealAnnouncements(season(M1, M2, M3), 3)).toEqual([
      { kind: 'pepiteStreak', id: '1', count: 3 },
      { kind: 'citronStreak', id: '4', count: 2 },
      { kind: 'record', id: '1', count: 7 },
    ]);
  });

  it('a new leader of the month', () => {
    const M4 = match(4, '2026-10-20', [[2, 3, 1], [2, 3, 1], [2, 1, 3], [2, 3, 1], [2, 1, 3], [2, 3, 4]]); // Ben 12
    const announced = revealAnnouncements(season(M1, M2, M3, M4), 4);
    expect(announced).toContainEqual({ kind: 'monthLeader', id: '2' });
    expect(announced).toContainEqual({ kind: 'record', id: '2', count: 12 });
  });

  it('nothing for a match that does not count', () => {
    expect(revealAnnouncements(season(M1, M2), 99)).toEqual([]);
  });
});
