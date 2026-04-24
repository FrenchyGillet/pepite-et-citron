import { describe, it, expect } from 'vitest';
import { computeResultsSummary } from './scoring';
import type { Player, Vote } from '../types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const p = (id: number, name: string): Player => ({ id, name });

const alice   = p(1, 'Alice');
const bob     = p(2, 'Bob');
const charlie = p(3, 'Charlie');
const diana   = p(4, 'Diana');

const allPlayers = [alice, bob, charlie, diana];

const makeVote = (id: number, overrides: Partial<Vote> = {}): Vote => ({
  id,
  match_id: 10,
  voter_name: 'V',
  ...overrides,
});

// ── computeResultsSummary ─────────────────────────────────────────────────────

describe('computeResultsSummary', () => {
  it('returns empty ranked lists and no ties when there are no votes', () => {
    const result = computeResultsSummary([], allPlayers, allPlayers);
    expect(result.pepiteRanked).toEqual([]);
    expect(result.lemonRanked).toEqual([]);
    expect(result.ghosts).toEqual(allPlayers);
    expect(result.bestTied).toBe(false);
    expect(result.lemonTied).toBe(false);
  });

  it('excludes players with 0 pts from pepiteRanked', () => {
    const votes = [makeVote(1, { best1_id: 1 })];
    const { pepiteRanked } = computeResultsSummary(votes, allPlayers, allPlayers);
    expect(pepiteRanked.map(p => p.id)).toEqual([1]);
  });

  it('sorts pepiteRanked by pts descending', () => {
    const votes = [
      makeVote(1, { best1_id: 2, best2_id: 1 }), // bob 2pts, alice 1pt
      makeVote(2, { best1_id: 2, best2_id: 3 }), // bob 2pts, charlie 1pt
      makeVote(3, { best1_id: 1, best2_id: 3 }), // alice 2pts, charlie 1pt
    ];
    const { pepiteRanked } = computeResultsSummary(votes, allPlayers, allPlayers);
    expect(pepiteRanked[0].id).toBe(2); // bob: 4pts
    expect(pepiteRanked[1].id).toBe(1); // alice: 3pts
    expect(pepiteRanked[2].id).toBe(3); // charlie: 2pts
  });

  it('sorts lemonRanked by pts descending', () => {
    const votes = [
      makeVote(1, { lemon_id: 3 }),
      makeVote(2, { lemon_id: 3 }),
      makeVote(3, { lemon_id: 1 }),
    ];
    const { lemonRanked } = computeResultsSummary(votes, allPlayers, allPlayers);
    expect(lemonRanked[0].id).toBe(3); // 2 pts
    expect(lemonRanked[1].id).toBe(1); // 1 pt
  });

  it('identifies ghosts — players with 0 pepite and 0 lemon pts', () => {
    const votes = [makeVote(1, { best1_id: 1, lemon_id: 2 })];
    const { ghosts } = computeResultsSummary(votes, allPlayers, allPlayers);
    const ghostIds = ghosts.map(p => p.id);
    expect(ghostIds).toContain(3); // charlie: 0+0
    expect(ghostIds).toContain(4); // diana: 0+0
    expect(ghostIds).not.toContain(1); // alice: 2pts best
    expect(ghostIds).not.toContain(2); // bob: 1pt lemon
  });

  it('detects a pepite tie between two players', () => {
    const present = [alice, bob];
    const votes = [
      makeVote(1, { best1_id: 1, best2_id: 2 }),
      makeVote(2, { best1_id: 2, best2_id: 1 }),
    ];
    const { bestTied, bestTiedPlayers } = computeResultsSummary(votes, present, allPlayers);
    expect(bestTied).toBe(true);
    expect(bestTiedPlayers.map(p => p.id).sort()).toEqual([1, 2]);
  });

  it('does not flag a tie when one player leads', () => {
    const votes = [
      makeVote(1, { best1_id: 1 }),
      makeVote(2, { best1_id: 1 }),
      makeVote(3, { best1_id: 2 }),
    ];
    const { bestTied } = computeResultsSummary(votes, allPlayers, allPlayers);
    expect(bestTied).toBe(false);
  });

  it('detects a lemon tie between two players', () => {
    const votes = [
      makeVote(1, { lemon_id: 3 }),
      makeVote(2, { lemon_id: 4 }),
    ];
    const { lemonTied, lemonTiedPlayers } = computeResultsSummary(votes, allPlayers, allPlayers);
    expect(lemonTied).toBe(true);
    expect(lemonTiedPlayers.map(p => p.id).sort()).toEqual([3, 4]);
  });

  it('marks absent players in lemonRanked', () => {
    const present = [alice, bob]; // charlie and diana are absent
    const absent  = [charlie, diana];
    const votes = [makeVote(1, { lemon_id: 3 })]; // charlie is absent
    const { lemonRanked } = computeResultsSummary(votes, present, [...present, ...absent]);
    const charlieEntry = lemonRanked.find(r => r.id === 3);
    expect(charlieEntry?.absent).toBe(true);
    const aliceEntry = lemonRanked.find(r => r.id === 1);
    expect(aliceEntry).toBeUndefined(); // 0 pts, not in list
  });

  it('does not flag tie when there are 0 top pts', () => {
    // No best1/best2 votes at all
    const votes = [makeVote(1, { lemon_id: 1 })];
    const { bestTied } = computeResultsSummary(votes, allPlayers, allPlayers);
    expect(bestTied).toBe(false);
  });
});
