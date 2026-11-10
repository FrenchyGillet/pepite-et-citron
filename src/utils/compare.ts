import type { MatchResult } from '@/utils/awards';

/** One player's season, on the counted matches (MatchResult). */
export interface DuelSide {
  played: number;
  bestPts: number;
  pepites: number;
  lemonPts: number;
  citrons: number;
}

export interface Duel {
  a: DuelSide;
  b: DuelSide;
  /** Matches where both were present. */
  together: number;
  /** Among those, the matches where one got more pépite points than the other. */
  aAhead: number;
  bAhead: number;
}

function side(results: MatchResult[], id: string): DuelSide {
  const s: DuelSide = { played: 0, bestPts: 0, pepites: 0, lemonPts: 0, citrons: 0 };
  for (const r of results) {
    if (r.present.has(id)) s.played++;
    s.bestPts  += r.bestPts[id] ?? 0;
    s.lemonPts += r.lemonPts[id] ?? 0;
    if (r.pepites.includes(id)) s.pepites++;
    if (r.citrons.includes(id)) s.citrons++;
  }
  return s;
}

/** Two players side by side: their totals, and who was ahead when they played together. */
export function duel(results: MatchResult[], a: string, b: string): Duel {
  let together = 0, aAhead = 0, bAhead = 0;
  for (const r of results) {
    if (!r.present.has(a) || !r.present.has(b)) continue;
    together++;
    const pa = r.bestPts[a] ?? 0, pb = r.bestPts[b] ?? 0;
    if (pa > pb) aAhead++;
    else if (pb > pa) bAhead++;
  }
  return { a: side(results, a), b: side(results, b), together, aAhead, bAhead };
}
