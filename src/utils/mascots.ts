/**
 * Pépite (the star) and Citron (the lemon) comment on the screens with a
 * line picked from a catalogue (src/i18n/mascots.ts, see docs/mascottes.md).
 *
 * The pick is deterministic: the same seed (a match id, a day…) gives the same
 * line, so the whole team reads the same joke and can talk about it.
 */

export type MascotName = 'pepite' | 'citron';

export const MASCOT_MOODS = {
  pepite: ['ravie', 'fiere', 'emerveillee', 'clin-doeil', 'lassee', 'bienveillante'],
  citron: ['impassible', 'sourire-en-coin', 'soupconneux', 'outre', 'triomphant', 'emu'],
} as const;

export type PepiteMood = typeof MASCOT_MOODS.pepite[number];
export type CitronMood = typeof MASCOT_MOODS.citron[number];

export type MascotBubble =
  | { who: 'pepite'; mood: PepiteMood; text: string }
  | { who: 'citron'; mood: CitronMood; text: string };

/** One bubble, or a short exchange between the two. */
export type MascotLine = MascotBubble[];

export type MascotSituation =
  | 'upcoming'        // next match scheduled, vote not open yet
  | 'noMatch'         // nothing scheduled, nothing open
  | 'voted'           // vote saved, waiting for the reveal
  | 'closedNotVoted'  // vote just closed, this device did not vote
  | 'noResults'       // Résultats, no match yet
  | 'seasonPepite'    // Saison, a single Pépite de la saison
  | 'seasonCitron'    // Saison, a single Citron de la saison
  | 'attendanceTie';  // Saison, several players share "le plus assidu"

export type MascotCatalogue = Record<MascotSituation, MascotLine[]>;

/** FNV-1a: a stable, well-spread number from any string. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The line for these situations (their lines pooled), with `{vars}` filled.
 * null when the language has no catalogue yet or the pool is empty: the
 * screen then shows no mascot.
 */
export function pickMascotLine(
  catalogue: MascotCatalogue | undefined,
  situations: MascotSituation[],
  seed: string,
  vars: Record<string, string | number> = {},
): MascotLine | null {
  if (!catalogue) return null;
  const pool = situations.flatMap(s => catalogue[s]);
  if (pool.length === 0) return null;
  const line = pool[hashSeed(seed) % pool.length];
  return line.map(b => ({
    ...b,
    text: b.text.replace(/\{(\w+)\}/g, (match, name: string) => name in vars ? String(vars[name]) : match),
  }));
}
