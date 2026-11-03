import { describe, expect, it } from 'vitest';
import type { Vote } from '@/types';
import { lockedVoterIds, minVoters, voterEditProblem } from './voters';

const vote = (o: Partial<Vote>): Vote => ({
  match_id: 1, voter_name: 'A', best1_id: 2, best2_id: 3, lemon_id: 4, ...o,
} as Vote);

describe('lockedVoterIds', () => {
  it('locks the voter and the pépites, not the citron', () => {
    expect(lockedVoterIds([vote({ voter_player_id: 1, best3_id: 5 })]))
      .toEqual(new Set(['1', '2', '3', '5']));
  });

  it('a guest vote locks only its pépites', () => {
    expect(lockedVoterIds([vote({ voter_player_id: null })])).toEqual(new Set(['2', '3']));
  });
});

describe('voterEditProblem', () => {
  const votes = [vote({ voter_player_id: 1 })];

  it('accepts adding and removing free players', () => {
    expect(voterEditProblem([1, 2, 3, 6], votes)).toBeNull();
    expect(voterEditProblem(['1', '2', '3'], votes)).toBeNull();
  });

  it('refuses removing a voter or a pépite', () => {
    expect(voterEditProblem([2, 3, 4], votes)).toBe('locked');
    expect(voterEditProblem([1, 3, 4], votes)).toBe('locked');
  });

  it('keeps enough players for the mode', () => {
    expect(minVoters(3)).toBe(4);
    expect(voterEditProblem([1, 2, 3], [], 3)).toBe('tooFew');
    expect(voterEditProblem([1, 2], [])).toBe('tooFew');
  });
});
