import { describe, expect, it } from 'vitest';
import type { MatchResult } from '@/utils/awards';
import { duel } from './compare';

const r = (present: string[], bestPts: Record<string, number>, pepites: string[], citrons: string[], lemonPts: Record<string, number> = {}): MatchResult =>
  ({ matchId: 1, label: 'M', date: new Date(), present: new Set(present), bestPts, lemonPts, pepites, citrons });

describe('duel', () => {
  it('adds up each side and counts who was ahead when both played', () => {
    const d = duel([
      r(['1', '2'], { 1: 5, 2: 2 }, ['1'], ['2'], { 2: 3 }),
      r(['1', '2'], { 1: 1, 2: 1 }, [], []),
      r(['1', '2'], { 1: 0, 2: 4 }, ['2'], ['1'], { 1: 2 }),
      r(['1'],      { 1: 3 },       ['1'], []),
    ], '1', '2');
    expect(d.together).toBe(3);
    expect([d.aAhead, d.bAhead]).toEqual([1, 1]);
    expect(d.a).toEqual({ played: 4, bestPts: 9, pepites: 2, lemonPts: 2, citrons: 1 });
    expect(d.b).toEqual({ played: 3, bestPts: 7, pepites: 1, lemonPts: 3, citrons: 1 });
  });
});
