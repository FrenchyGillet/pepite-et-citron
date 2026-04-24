import { describe, it, expect } from 'vitest';
import { computeScores, formatDate } from '../utils';
import type { Player, Vote } from '../types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const players: Player[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

const makeVote = (overrides: Partial<Vote>): Vote => ({
  id: 1,
  match_id: 10,
  voter_name: 'Voter',
  ...overrides,
});

// ── computeScores ─────────────────────────────────────────────────────────────

describe('computeScores', () => {
  it('returns zero scores for all players when there are no votes', () => {
    const { best, lemon } = computeScores([], players);
    expect(best[1].pts).toBe(0);
    expect(best[2].pts).toBe(0);
    expect(lemon[1].pts).toBe(0);
  });

  it('returns empty maps when players list is empty', () => {
    const vote = makeVote({ best1_id: 1, lemon_id: 2 });
    const { best, lemon } = computeScores([vote], []);
    expect(Object.keys(best)).toHaveLength(0);
    expect(Object.keys(lemon)).toHaveLength(0);
  });

  it('awards 2 pts to best1 and 1 pt to best2', () => {
    const vote = makeVote({ best1_id: 1, best2_id: 2 });
    const { best } = computeScores([vote], players);
    expect(best[1].pts).toBe(2);
    expect(best[2].pts).toBe(1);
    expect(best[3].pts).toBe(0);
  });

  it('awards 1 pt to lemon', () => {
    const vote = makeVote({ lemon_id: 3 });
    const { lemon } = computeScores([vote], players);
    expect(lemon[3].pts).toBe(1);
    expect(lemon[1].pts).toBe(0);
  });

  it('accumulates points from multiple votes', () => {
    const votes = [
      makeVote({ id: 1, best1_id: 1, best2_id: 2, lemon_id: 3 }),
      makeVote({ id: 2, best1_id: 1, best2_id: 3, lemon_id: 2 }),
      makeVote({ id: 3, best1_id: 2, best2_id: 1, lemon_id: 3 }),
    ];
    const { best, lemon } = computeScores(votes, players);
    expect(best[1].pts).toBe(5);  // 2+2+1
    expect(best[2].pts).toBe(3);  // 1+2
    expect(best[3].pts).toBe(1);  // 1
    expect(lemon[3].pts).toBe(2); // 1+1
    expect(lemon[2].pts).toBe(1);
  });

  it('sorts ranking by pepite pts descending', () => {
    const votes = [
      makeVote({ id: 1, best1_id: 2, best2_id: 1 }),
      makeVote({ id: 2, best1_id: 2, best2_id: 3 }),
    ];
    const { best } = computeScores(votes, players);
    const sorted = Object.entries(best)
      .sort(([, a], [, b]) => b.pts - a.pts)
      .map(([id]) => Number(id));
    expect(sorted[0]).toBe(2); // 4 pts
    expect(sorted[1]).toBe(1); // 1 pt
    expect(sorted[2]).toBe(3); // 1 pt
  });

  it('does not award best pts for votes pointing to absent players', () => {
    // Player 99 is not in present list
    const vote = makeVote({ best1_id: 99, lemon_id: 1 });
    const { best } = computeScores([vote], players);
    expect(best[99]).toBeUndefined();
    expect(best[1].pts).toBe(0);
  });

  it('allows absent players to receive lemon votes via allPlayers', () => {
    const absent: Player = { id: 99, name: 'Absent' };
    const vote = makeVote({ lemon_id: 99 });
    const { lemon } = computeScores([vote], players, [...players, absent]);
    expect(lemon[99].pts).toBe(1);
  });

  it('does not award lemon pts for players absent from allPlayers', () => {
    const vote = makeVote({ lemon_id: 99 });
    const { lemon } = computeScores([vote], players);
    expect(lemon[99]).toBeUndefined();
  });

  it('collects best1 comments', () => {
    const votes = [
      makeVote({ id: 1, best1_id: 1, best1_comment: 'Super match !' }),
      makeVote({ id: 2, best1_id: 1, best1_comment: 'Incroyable' }),
      makeVote({ id: 3, best1_id: 1 }), // no comment
    ];
    const { best } = computeScores(votes, players);
    expect(best[1].comments).toEqual(['Super match !', 'Incroyable']);
  });

  it('collects lemon comments', () => {
    const vote = makeVote({ lemon_id: 2, lemon_comment: 'Raté tous ses tirs' });
    const { lemon } = computeScores([vote], players);
    expect(lemon[2].comments).toEqual(['Raté tous ses tirs']);
  });

  it('uses presentPlayers as allPlayers when allPlayers is omitted', () => {
    const vote = makeVote({ lemon_id: 1 });
    const { lemon } = computeScores([vote], players);
    expect(lemon[1].pts).toBe(1);
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2024-06-15T18:30:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes the 4-digit year', () => {
    const result = formatDate('2024-06-15T18:30:00Z');
    expect(result).toMatch(/2024/);
  });

  it('includes the day number', () => {
    const result = formatDate('2024-06-15T18:30:00Z');
    expect(result).toMatch(/15/);
  });

  it('returns different strings for different dates', () => {
    expect(formatDate('2024-01-01T00:00:00Z')).not.toBe(formatDate('2024-12-31T00:00:00Z'));
  });
});
