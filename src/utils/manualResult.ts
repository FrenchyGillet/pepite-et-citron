import type { EntityId, ManualResult, Match, Player, Scores } from '@/types';

/** What the history form collects before it becomes a ManualResult. */
export interface ManualResultDraft {
  /** Podium slots, first = the Pépite; null = not filled in. */
  bestIds: (EntityId | null)[];
  lemonId: EntityId | null;
  /** Typed totals by player id ('' = unknown). */
  bestPts: Record<string, string>;
  lemonPts: Record<string, string>;
}

export function isManualMatch(match: Pick<Match, 'manual_result'>): match is { manual_result: ManualResult } {
  return match.manual_result != null;
}

/** True when the result carries at least one point total. */
export function hasManualPoints(result: ManualResult): boolean {
  return Object.keys(result.best_pts ?? {}).length > 0 || Object.keys(result.lemon_pts ?? {}).length > 0;
}

/**
 * Season points of a hand-entered match: the totals typed in, 0 for everyone
 * else. Without totals the match adds no points, only titles and attendance.
 */
export function manualScores(result: ManualResult, present: Player[], allPlayers: Player[]): Scores {
  const best: Scores['best'] = {};
  const lemon: Scores['lemon'] = {};
  present.forEach(p => { best[p.id] = { pts: result.best_pts?.[String(p.id)] ?? 0, comments: [] }; });
  (allPlayers.length ? allPlayers : present).forEach(p => {
    lemon[p.id] = { pts: result.lemon_pts?.[String(p.id)] ?? 0, comments: [] };
  });
  return { best, lemon };
}

function parsePoints(raw: Record<string, string>, label: string): { pts: Record<string, number>; error: string | null } {
  const pts: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw)) {
    const trimmed = value.trim();
    if (trimmed === '') continue;
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n < 0 || n > 999) {
      return { pts, error: `Les points ${label} doivent être des nombres entiers positifs.` };
    }
    pts[id] = n;
  }
  return { pts, error: null };
}

/**
 * Checks the form and builds the stored result. The Pépite and the Citron are
 * required; the other podium places and the totals are optional.
 */
export function buildManualResult(
  draft: ManualResultDraft,
  presentIds: EntityId[],
): { result: ManualResult | null; error: string | null } {
  const present = new Set(presentIds.map(String));
  if (present.size === 0) return { result: null, error: 'Sélectionne les joueurs présents.' };

  const [pepite, ...others] = draft.bestIds;
  if (pepite == null) return { result: null, error: 'Choisis la Pépite du match.' };
  if (draft.lemonId == null) return { result: null, error: 'Choisis le Citron du match.' };

  // Podium places are filled in order: a 3rd without a 2nd is a typo.
  const firstGap = others.findIndex(id => id == null);
  if (firstGap !== -1 && others.slice(firstGap).some(id => id != null)) {
    return { result: null, error: 'Remplis la 2e place avant la 3e.' };
  }
  const filledOthers = others.filter((id): id is EntityId => id != null);
  const bestIds = [pepite, ...filledOthers];
  if (new Set(bestIds.map(String)).size !== bestIds.length) {
    return { result: null, error: 'Un joueur ne peut occuper qu’une place du podium.' };
  }
  if (bestIds.some(id => !present.has(String(id)))) {
    return { result: null, error: 'Le podium ne peut contenir que des joueurs présents.' };
  }

  const best = parsePoints(draft.bestPts, 'Pépite');
  if (best.error) return { result: null, error: best.error };
  const lemon = parsePoints(draft.lemonPts, 'Citron');
  if (lemon.error) return { result: null, error: lemon.error };

  // Points only for players who were there (Pépite) — a citron can be absent.
  for (const id of Object.keys(best.pts)) {
    if (!present.has(id)) delete best.pts[id];
  }

  return {
    result: {
      best_ids: bestIds,
      lemon_id: draft.lemonId,
      ...(Object.keys(best.pts).length ? { best_pts: best.pts } : {}),
      ...(Object.keys(lemon.pts).length ? { lemon_pts: lemon.pts } : {}),
    },
    error: null,
  };
}

/** Form values back from a stored result (editing a hand-entered match). */
export function draftFromManualResult(result: ManualResult, pepiteCount: 2 | 3): ManualResultDraft {
  const toText = (pts?: Record<string, number>) =>
    Object.fromEntries(Object.entries(pts ?? {}).map(([id, n]) => [id, String(n)]));
  return {
    bestIds: Array.from({ length: pepiteCount }, (_, i) => result.best_ids[i] ?? null),
    lemonId: result.lemon_id,
    bestPts: toText(result.best_pts),
    lemonPts: toText(result.lemon_pts),
  };
}

/**
 * created_at of a match entered afterwards: now when it was played today (so
 * it sorts after the day's earlier matches), noon of that day otherwise.
 */
export function manualPlayedAt(date: string, now: Date = new Date()): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return now.toISOString();
  if (y === now.getFullYear() && m === now.getMonth() + 1 && d === now.getDate()) {
    return now.toISOString();
  }
  return new Date(y, m - 1, d, 12).toISOString();
}

/** Local YYYY-MM-DD for a date input. */
export function toDateInputValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
