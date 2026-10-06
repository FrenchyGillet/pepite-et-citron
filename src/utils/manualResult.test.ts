import { describe, it, expect } from 'vitest';
import {
  buildManualResult, draftFromManualResult, hasManualPoints, manualPlayedAt, manualScores,
  type ManualResultDraft,
} from './manualResult';
import type { Player } from '@/types';

const draft = (overrides: Partial<ManualResultDraft> = {}): ManualResultDraft => ({
  bestIds: [1, null], lemonId: 3, bestPts: {}, lemonPts: {}, ...overrides,
});

describe('buildManualResult', () => {
  it('needs the present players, the Pépite and the Citron', () => {
    expect(buildManualResult(draft(), []).error).toMatch(/présents/);
    expect(buildManualResult(draft({ bestIds: [null, null] }), [1, 2, 3]).error).toMatch(/Pépite/);
    expect(buildManualResult(draft({ lemonId: null }), [1, 2, 3]).error).toMatch(/Citron/);
  });

  it('keeps only the filled podium places, Pépite first', () => {
    expect(buildManualResult(draft({ bestIds: [2, 1, null] }), [1, 2, 3]).result)
      .toEqual({ best_ids: [2, 1], lemon_id: 3 });
  });

  it('refuses a 3rd place without a 2nd, a player twice, or an absent player on the podium', () => {
    expect(buildManualResult(draft({ bestIds: [1, null, 2] }), [1, 2, 3]).error).toMatch(/2e place/);
    expect(buildManualResult(draft({ bestIds: [1, 1] }), [1, 2, 3]).error).toMatch(/une place/);
    expect(buildManualResult(draft({ bestIds: [4, null] }), [1, 2, 3]).error).toMatch(/présents/);
  });

  it('lets the citron be an absent player (like a vote)', () => {
    expect(buildManualResult(draft({ lemonId: 9 }), [1, 2, 3]).result?.lemon_id).toBe(9);
  });

  it('parses the optional totals and drops the blank ones', () => {
    const { result } = buildManualResult(
      draft({ bestPts: { '1': '12', '2': ' ', '3': '0' }, lemonPts: { '3': '5' } }),
      [1, 2, 3],
    );
    expect(result).toEqual({ best_ids: [1], lemon_id: 3, best_pts: { '1': 12, '3': 0 }, lemon_pts: { '3': 5 } });
  });

  it('refuses negative or decimal totals', () => {
    expect(buildManualResult(draft({ bestPts: { '1': '-2' } }), [1, 2, 3]).error).toMatch(/entiers/);
    expect(buildManualResult(draft({ lemonPts: { '3': '1.5' } }), [1, 2, 3]).error).toMatch(/entiers/);
  });

  it('works with uuid ids', () => {
    const { result } = buildManualResult(draft({ bestIds: ['a', 'b'], lemonId: 'c', bestPts: { a: '3' } }), ['a', 'b', 'c']);
    expect(result).toEqual({ best_ids: ['a', 'b'], lemon_id: 'c', best_pts: { a: 3 } });
  });
});

describe('draftFromManualResult', () => {
  it('round-trips through buildManualResult', () => {
    const stored = { best_ids: [2, 1], lemon_id: 3, best_pts: { '2': 7 } };
    const back = draftFromManualResult(stored, 3);
    expect(back.bestIds).toEqual([2, 1, null]);
    expect(buildManualResult(back, [1, 2, 3]).result).toEqual(stored);
  });
});

describe('manualScores', () => {
  const players: Player[] = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }];

  it('uses the totals typed in, 0 for everyone else', () => {
    const { best, lemon } = manualScores(
      { best_ids: [1], lemon_id: 3, best_pts: { '1': 10 }, lemon_pts: { '3': 4 } },
      players.slice(0, 2), players,
    );
    expect(best[1].pts).toBe(10);
    expect(best[2].pts).toBe(0);
    expect(best[3]).toBeUndefined(); // absent: no pépite points
    expect(lemon[3].pts).toBe(4);
  });

  it('adds no points without totals', () => {
    const result = { best_ids: [1], lemon_id: 3 };
    expect(hasManualPoints(result)).toBe(false);
    const { best, lemon } = manualScores(result, players, players);
    expect(Object.values(best).every(s => s.pts === 0)).toBe(true);
    expect(Object.values(lemon).every(s => s.pts === 0)).toBe(true);
  });
});

describe('manualPlayedAt', () => {
  const now = new Date(2026, 9, 6, 21, 30);

  it('is now for a match played today', () => {
    expect(manualPlayedAt('2026-10-06', now)).toBe(now.toISOString());
  });

  it('is noon of that day for an earlier match', () => {
    expect(manualPlayedAt('2026-10-03', now)).toBe(new Date(2026, 9, 3, 12).toISOString());
  });
});
