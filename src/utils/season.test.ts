import { describe, it, expect } from 'vitest';
import { computeSeasonStats } from './season';
import type { Player, Match, Vote } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const p = (id: number, name: string): Player => ({ id, name });

const alice   = p(1, 'Alice');
const bob     = p(2, 'Bob');
const charlie = p(3, 'Charlie');
const allPlayers = [alice, bob, charlie];

const makeMatch = (id: number, presentIds: number[]): Match => ({
  id,
  label: `Match ${id}`,
  is_open: false,
  phase: 'closed',
  present_ids: presentIds,
  reveal_order: [],
  revealed_count: 0,
  season: 1,
  team_id: null,
  created_at: '2024-01-01T00:00:00Z',
});

const makeVote = (id: number, matchId: number, overrides: Partial<Vote> = {}): Vote => ({
  id,
  match_id: matchId,
  voter_name: 'V',
  ...overrides,
});

// ── computeSeasonStats ────────────────────────────────────────────────────────

describe('computeSeasonStats', () => {
  it('returns empty ranked lists when there are no matches', () => {
    const { rankedBest, rankedLemon } = computeSeasonStats(allPlayers, [], [], []);
    expect(rankedBest).toEqual([]);
    expect(rankedLemon).toEqual([]);
  });

  it('returns empty lists when there are matches but no votes', () => {
    const matches = [makeMatch(1, [1, 2, 3])];
    const { rankedBest, rankedLemon } = computeSeasonStats(allPlayers, matches, [], []);
    expect(rankedBest).toEqual([]);
    expect(rankedLemon).toEqual([]);
  });

  it('accumulates pepite pts across multiple matches', () => {
    const matches = [makeMatch(1, [1, 2, 3]), makeMatch(2, [1, 2, 3])];
    const votes = [
      makeVote(1, 1, { best1_id: 1 }), // alice +2 in match 1
      makeVote(2, 2, { best1_id: 1 }), // alice +2 in match 2
      makeVote(3, 2, { best2_id: 2 }), // bob +1 in match 2
    ];
    const { rankedBest } = computeSeasonStats(allPlayers, matches, votes, []);
    const alice = rankedBest.find(s => s.name === 'Alice');
    const bob   = rankedBest.find(s => s.name === 'Bob');
    expect(alice?.bestPts).toBe(4);
    expect(bob?.bestPts).toBe(1);
  });

  it('accumulates lemon pts across multiple matches', () => {
    const matches = [makeMatch(1, [1, 2, 3]), makeMatch(2, [1, 2, 3])];
    const votes = [
      makeVote(1, 1, { lemon_id: 3 }),
      makeVote(2, 2, { lemon_id: 3 }),
      makeVote(3, 2, { lemon_id: 1 }),
    ];
    const { rankedLemon } = computeSeasonStats(allPlayers, matches, votes, []);
    const charlie = rankedLemon.find(s => s.name === 'Charlie');
    const alice   = rankedLemon.find(s => s.name === 'Alice');
    expect(charlie?.lemonPts).toBe(2);
    expect(alice?.lemonPts).toBe(1);
  });

  it('sorts rankedBest by bestPts descending', () => {
    const matches = [makeMatch(1, [1, 2, 3])];
    const votes = [
      makeVote(1, 1, { best1_id: 2, best2_id: 1 }),
      makeVote(2, 1, { best1_id: 2, best2_id: 3 }),
    ];
    const { rankedBest } = computeSeasonStats(allPlayers, matches, votes, []);
    expect(rankedBest[0].name).toBe('Bob');   // 4 pts
    expect(rankedBest[1].name).toBe('Alice');  // 1 pt
    expect(rankedBest[2].name).toBe('Charlie'); // 1 pt
  });

  it('sorts rankedLemon by lemonPts descending', () => {
    const matches = [makeMatch(1, [1, 2, 3])];
    const votes = [
      makeVote(1, 1, { lemon_id: 1 }),
      makeVote(2, 1, { lemon_id: 1 }),
      makeVote(3, 1, { lemon_id: 3 }),
    ];
    const { rankedLemon } = computeSeasonStats(allPlayers, matches, votes, []);
    expect(rankedLemon[0].name).toBe('Alice');   // 2 pts
    expect(rankedLemon[1].name).toBe('Charlie'); // 1 pt
  });

  it('counts wins — player with most pepite pts in a match gets a win', () => {
    const matches = [makeMatch(1, [1, 2, 3]), makeMatch(2, [1, 2, 3])];
    const votes = [
      makeVote(1, 1, { best1_id: 1 }),   // alice wins match 1
      makeVote(2, 1, { best1_id: 2 }),   // draw? no, alice has 2 bob has 2 — each 2pts... let's do 3 votes
      makeVote(3, 2, { best1_id: 2 }),   // bob wins match 2
      makeVote(4, 2, { best1_id: 2 }),
    ];
    const { rankedBest } = computeSeasonStats(allPlayers, matches, votes, []);
    // match 1: alice=2, bob=2 → tie, bW is last assigned so bob wins (implementation detail)
    // match 2: bob=4 → bob wins
    const bob = rankedBest.find(s => s.name === 'Bob');
    expect(bob).toBeDefined();
    expect(bob!.wins).toBeGreaterThanOrEqual(1);
  });

  it('counts lemons — player with most lemon pts in a match gets a lemon', () => {
    const matches = [makeMatch(1, [1, 2, 3])];
    const votes = [
      makeVote(1, 1, { lemon_id: 3 }),
      makeVote(2, 1, { lemon_id: 3 }),
      makeVote(3, 1, { lemon_id: 1 }),
    ];
    const { rankedLemon } = computeSeasonStats(allPlayers, matches, votes, []);
    const charlie = rankedLemon.find(s => s.name === 'Charlie');
    expect(charlie?.lemons).toBe(1);
  });

  it('only counts players who participated in that match for pepite', () => {
    const matches = [makeMatch(1, [1, 2])]; // charlie absent
    const votes = [makeVote(1, 1, { best1_id: 1 })];
    const { rankedBest } = computeSeasonStats(allPlayers, matches, votes, []);
    const charlie = rankedBest.find(s => s.name === 'Charlie');
    expect(charlie).toBeUndefined(); // 0 pts → excluded from ranking
  });

  it('credits every player tied at the top score with a win', () => {
    const matches = [makeMatch(1, [1, 2, 3])];
    const votes = [
      makeVote(1, 1, { best1_id: 1 }), // alice 2
      makeVote(2, 1, { best1_id: 2 }), // bob 2 → tie
    ];
    const { rankedBest } = computeSeasonStats(allPlayers, matches, votes, []);
    expect(rankedBest.find(s => s.name === 'Alice')?.wins).toBe(1);
    expect(rankedBest.find(s => s.name === 'Bob')?.wins).toBe(1);
  });

  it('honours a match tiebreaker for the win instead of crediting both', () => {
    const matches = [{ ...makeMatch(1, [1, 2, 3]), tiebreakers: { best_id: 2 } }];
    const votes = [
      makeVote(1, 1, { best1_id: 1 }),
      makeVote(2, 1, { best1_id: 2 }),
    ];
    const { rankedBest } = computeSeasonStats(allPlayers, matches, votes, []);
    expect(rankedBest.find(s => s.name === 'Bob')?.wins).toBe(1);
    expect(rankedBest.find(s => s.name === 'Alice')?.wins).toBe(0);
  });

  it('lemonHistory is consistent with lemonPts even for an absent player', () => {
    const matches = [makeMatch(1, [1, 2])]; // charlie absent
    const votes = [
      makeVote(1, 1, { lemon_id: 3 }), // absent charlie still gets a citron
      makeVote(2, 1, { lemon_id: 3 }),
    ];
    const { rankedLemon } = computeSeasonStats(allPlayers, matches, votes, []);
    const charlie = rankedLemon.find(s => s.name === 'Charlie');
    expect(charlie?.lemonPts).toBe(2);
    expect(charlie?.lemonHistory.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('returns maxPts=1 as floor when there are no votes (avoids division by zero)', () => {
    const matches = [makeMatch(1, [1, 2])];
    const { maxPts, maxLemonPts } = computeSeasonStats(allPlayers, matches, [], []);
    expect(maxPts).toBe(1);
    expect(maxLemonPts).toBe(1);
  });

  it('returns correct maxPts', () => {
    const matches = [makeMatch(1, [1, 2, 3])];
    const votes = [
      makeVote(1, 1, { best1_id: 1 }),
      makeVote(2, 1, { best1_id: 1 }),
    ];
    const { maxPts } = computeSeasonStats(allPlayers, matches, votes, []);
    expect(maxPts).toBe(4); // alice: 2+2
  });
});

// ── Hand-entered results (no ballots) ─────────────────────────────────────────

describe('computeSeasonStats — manual results', () => {
  const manualMatch = (id: number, presentIds: number[], manual_result: Match['manual_result']): Match => ({
    ...makeMatch(id, presentIds), manual_result,
  });

  it('counts the titles and the attendance, without points when no totals', () => {
    const { rankedBest, rankedLemon, rankedAttendance } = computeSeasonStats(
      allPlayers, [manualMatch(1, [1, 2, 3], { best_ids: [1, 2], lemon_id: 3 })], [], [],
    );
    expect(rankedBest.map(s => [s.name, s.bestPts, s.wins])).toEqual([['Alice', 0, 1]]);
    expect(rankedLemon.map(s => [s.name, s.lemonPts, s.lemons])).toEqual([['Charlie', 0, 1]]);
    expect(rankedAttendance).toHaveLength(3);
  });

  it('adds the totals when they were entered', () => {
    const { rankedBest, rankedLemon } = computeSeasonStats(allPlayers, [
      manualMatch(1, [1, 2, 3], { best_ids: [1], lemon_id: 3, best_pts: { '1': 9, '2': 4 }, lemon_pts: { '3': 6 } }),
    ], [], []);
    expect(rankedBest.map(s => [s.name, s.bestPts])).toEqual([['Alice', 9], ['Bob', 4]]);
    expect(rankedLemon.map(s => [s.name, s.lemonPts])).toEqual([['Charlie', 6]]);
  });

  it('ignores stray ballots on a manual match and mixes with voted matches', () => {
    const voted = makeMatch(2, [1, 2, 3]);
    const { rankedBest } = computeSeasonStats(allPlayers, [
      manualMatch(1, [1, 2, 3], { best_ids: [2], lemon_id: 3 }),
      voted,
    ], [
      makeVote(10, 1, { best1_id: 1 }),
      makeVote(11, 2, { best1_id: 1, best2_id: 3, lemon_id: 2 }),
    ], []);
    const alice = rankedBest.find(s => s.name === 'Alice');
    const bob = rankedBest.find(s => s.name === 'Bob');
    expect(alice).toMatchObject({ bestPts: 2, wins: 1 }); // only the voted match
    expect(bob).toMatchObject({ bestPts: 0, wins: 1 });   // the manual title
    // points first, then titles
    expect(rankedBest.map(s => s.name)).toEqual(['Alice', 'Charlie', 'Bob']);
  });
});
