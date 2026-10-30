import type { Records, SeasonTitles, Streak } from '@/utils/awards';

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
  | 'pepiteStreak'    // Saison → palmarès, a pépite streak running
  | 'citronStreak'    // Saison → palmarès, a citron streak running
  | 'seasonRecord'    // Saison → palmarès, the season's best score
  | 'seasonPepite'    // Saison → Pépite tab, a single Pépite de la saison
  | 'seasonCitron'    // Saison → Citron tab, a single Citron de la saison
  | 'attendanceLeader'   // Saison → Assiduité tab, a single most present player
  | 'attendancePerfect'  // … who played every match
  | 'attendanceTie';  // … several players share the top

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

export interface MascotCue {
  situations: MascotSituation[];
  vars: Record<string, string | number>;
}

/**
 * Saison → palmarès: the running streaks (the longest of each kind) and the
 * season's best score. null when there is nothing to comment.
 */
export function palmaresMascot(streaks: Streak[], records: Records, nameOf: (id: string) => string): MascotCue | null {
  const pepite = streaks.find(s => s.kind === 'pepite');
  const citron = streaks.find(s => s.kind === 'citron');
  const situations: MascotSituation[] = [
    ...(pepite ? ['pepiteStreak' as const] : []),
    ...(citron ? ['citronStreak' as const] : []),
    ...(records.bestMatch ? ['seasonRecord' as const] : []),
  ];
  if (situations.length === 0) return null;
  return {
    situations,
    vars: {
      pepite: pepite ? nameOf(pepite.id) : '', pepiteRun: pepite?.length ?? 0,
      citron: citron ? nameOf(citron.id) : '', citronRun: citron?.length ?? 0,
    },
  };
}

export type RankingTab = 'pepite' | 'citron' | 'attendance';

/**
 * Saison → one ranking tab: its title holder. A title shared by several
 * players gets no line (they are written in the singular), except the
 * attendance tie, which has its own.
 */
export function rankingMascot(tab: RankingTab, season: SeasonTitles, nameOf: (id: string) => string): MascotCue | null {
  if (tab === 'pepite' || tab === 'citron') {
    const title = season[tab];
    if (title?.ids.length !== 1) return null;
    return tab === 'pepite'
      ? { situations: ['seasonPepite'], vars: { pepite: nameOf(title.ids[0]), pepitePts: title.value } }
      : { situations: ['seasonCitron'], vars: { citron: nameOf(title.ids[0]), citronPts: title.value } };
  }
  const title = season.attendance;
  if (!title) return null;
  if (title.ids.length > 1) return { situations: ['attendanceTie'], vars: { count: title.ids.length } };
  const perfect = title.value === season.matches;
  return {
    situations: perfect ? ['attendancePerfect', 'attendanceLeader'] : ['attendanceLeader'],
    vars: { name: nameOf(title.ids[0]), played: title.value, total: season.matches },
  };
}
