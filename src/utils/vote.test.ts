import { describe, it, expect, beforeEach } from 'vitest';
import { hasVotedLocally, markVotedLocally, classifyVoteError, shuffleRevealOrder } from './vote';
import type { Vote } from '../types';

// localStorage is cleared in afterEach via setup.js

// ── hasVotedLocally ───────────────────────────────────────────────────────────

describe('hasVotedLocally', () => {
  it('returns false when localStorage is empty', () => {
    expect(hasVotedLocally(1)).toBe(false);
  });

  it('returns false when matchId is not in the list', () => {
    localStorage.setItem('pepite_voted', JSON.stringify([2, 3]));
    expect(hasVotedLocally(1)).toBe(false);
  });

  it('returns true when matchId is in the list', () => {
    localStorage.setItem('pepite_voted', JSON.stringify([1, 2, 3]));
    expect(hasVotedLocally(2)).toBe(true);
  });

  it('returns true for string match IDs', () => {
    localStorage.setItem('pepite_voted', JSON.stringify(['abc-uuid']));
    expect(hasVotedLocally('abc-uuid')).toBe(true);
  });

  it('returns false for null matchId', () => {
    localStorage.setItem('pepite_voted', JSON.stringify([1]));
    expect(hasVotedLocally(null)).toBe(false);
  });

  it('returns false for undefined matchId', () => {
    expect(hasVotedLocally(undefined)).toBe(false);
  });
});

// ── markVotedLocally ──────────────────────────────────────────────────────────

describe('markVotedLocally', () => {
  it('writes the matchId to an empty localStorage', () => {
    markVotedLocally(5);
    expect(hasVotedLocally(5)).toBe(true);
  });

  it('appends to an existing list without overwriting', () => {
    markVotedLocally(1);
    markVotedLocally(2);
    expect(hasVotedLocally(1)).toBe(true);
    expect(hasVotedLocally(2)).toBe(true);
  });

  it('does not duplicate if already present', () => {
    markVotedLocally(1);
    markVotedLocally(1);
    const stored = JSON.parse(localStorage.getItem('pepite_voted') || '[]') as unknown[];
    expect(stored.filter(x => x === 1)).toHaveLength(1);
  });

  it('works with string UUIDs', () => {
    markVotedLocally('uuid-abc');
    expect(hasVotedLocally('uuid-abc')).toBe(true);
  });
});

// ── classifyVoteError ─────────────────────────────────────────────────────────

describe('classifyVoteError', () => {
  it('returns network error message when error message contains "network"', () => {
    const err = new Error('network timeout');
    expect(classifyVoteError(err)).toContain('réseau');
  });

  it('returns network error message for AbortError', () => {
    const err = Object.assign(new Error('aborted'), { name: 'AbortError' });
    expect(classifyVoteError(err)).toContain('réseau');
  });

  it('returns the error message for other Error instances', () => {
    const err = new Error('Vote déjà soumis');
    expect(classifyVoteError(err)).toBe('Vote déjà soumis');
  });

  it('returns the default message for non-Error objects', () => {
    expect(classifyVoteError({ code: 500 })).toContain('réessaie');
  });

  it('returns the default message for null', () => {
    expect(classifyVoteError(null)).toContain('réessaie');
  });

  it('returns the default message for a string', () => {
    expect(classifyVoteError('something went wrong')).toContain('réessaie');
  });
});

// ── shuffleRevealOrder ────────────────────────────────────────────────────────

const makeVote = (id: number | undefined): Vote => ({
  id,
  match_id: 10,
  voter_name: 'Voter',
});

describe('shuffleRevealOrder', () => {
  it('returns an empty array for no votes', () => {
    expect(shuffleRevealOrder([])).toEqual([]);
  });

  it('returns all vote IDs', () => {
    const votes = [makeVote(1), makeVote(2), makeVote(3)];
    const order = shuffleRevealOrder(votes);
    expect(order).toHaveLength(3);
    expect(order).toContain(1);
    expect(order).toContain(2);
    expect(order).toContain(3);
  });

  it('filters out votes without an id', () => {
    const votes = [makeVote(1), makeVote(undefined), makeVote(3)];
    const order = shuffleRevealOrder(votes);
    expect(order).toHaveLength(2);
    expect(order).not.toContain(undefined);
  });

  it('does not mutate the original array', () => {
    const votes = [makeVote(1), makeVote(2)];
    const original = [...votes];
    shuffleRevealOrder(votes);
    expect(votes).toEqual(original);
  });
});
