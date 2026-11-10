import type { Records, SeasonTitles, Streak } from '@/utils/awards';
import type { EntityId, Vote } from '@/types';

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
  | 'waitingNone'     // Résultats during the vote, no vote in yet
  | 'waiting'         // Résultats during the vote, some votes in
  | 'waitingAll'      // Résultats during the vote, every present player voted
  | 'seasonHidden'    // Saison during the vote, rankings hidden
  | 'pepiteStreak'    // Saison → palmarès, a pépite streak running
  | 'citronStreak'    // Saison → palmarès, a citron streak running
  | 'seasonRecord'    // Saison → palmarès, the season's best score
  | 'seasonPepite'    // Saison → Pépite tab, a single Pépite de la saison
  | 'seasonCitron'    // Saison → Citron tab, a single Citron de la saison
  | 'attendanceLeader'   // Saison → Assiduité tab, a single most present player
  | 'attendancePerfect'  // … who played every match
  | 'attendanceTie'   // … several players share the top
  | 'revealPepite' | 'revealCitron' // podium revealed: the night's Pépite / Citron
  | 'revealUnanimous' // … every ballot had the same Pépite
  | 'revealTie'       // … a tie at the top (settled by the organiser)
  | 'revealClose'     // … one point between the first two
  | 'revealMixed'     // … the Pépite also got citron votes
  | 'revealFew'       // … a handful of ballots
  | 'startIntro'      // /start, nothing typed yet
  | 'startFew'        // /start, not enough players to vote
  | 'startReady'      // /start, enough players
  | 'startMany'       // /start, a long list
  | 'startAccount'    // /start, filling the organiser account
  | 'startStepAccount' | 'startStepTeam' | 'startStepPlayers' | 'startStepMatch'; // /start, launching

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

/**
 * Résultats while the vote is open: the mascots play on the wait, from the
 * empty ballot box to the full one waiting for an organiser to close it.
 */
export function waitingMascot(count: number, present: number): MascotCue {
  const situation: MascotSituation =
    count === 0 ? 'waitingNone' : present > 0 && count >= present ? 'waitingAll' : 'waiting';
  return { situations: [situation], vars: { count, present } };
}

/**
 * Podium revealed (Résultats, and the shared story image): the most telling
 * fact of the night, else a line on the Pépite or the Citron.
 */
export function revealMascot(r: {
  votes: Vote[];
  /** Tiebreaker-aware, best first. */
  pepiteRanked: Array<{ id: EntityId; pts: number }>;
  lemonWinners: Array<{ id: EntityId }>;
  bestTied: boolean;
  nameOf: (id: EntityId) => string;
}): MascotCue | null {
  const [first, second] = r.pepiteRanked;
  if (!first || first.pts === 0) return null;
  const vars = {
    pepite: r.nameOf(first.id),
    citron: r.lemonWinners.length === 1 ? r.nameOf(r.lemonWinners[0].id) : '',
    n: r.votes.length,
  };
  const ballots = r.votes.length;
  const situation: MascotSituation | null =
    ballots >= 3 && r.votes.every(v => v.best1_id === first.id) ? 'revealUnanimous'
    : r.bestTied ? 'revealTie'
    : second && first.pts - second.pts === 1 ? 'revealClose'
    : r.votes.some(v => v.lemon_id === first.id) ? 'revealMixed'
    // Two or three: the lines say « {n} votes », plural in every language.
    : ballots >= 2 && ballots <= 3 ? 'revealFew'
    : null;
  if (situation) return { situations: [situation], vars };
  // A tie for the citron has no single name to put in the lines.
  return { situations: vars.citron ? ['revealPepite', 'revealCitron'] : ['revealPepite'], vars };
}

/** A list this long gets its own line on /start. */
export const START_MANY_PLAYERS = 15;

export type StartSpot = 'intro' | 'players' | 'account' | 'launch';
export type StartStep = 'account' | 'team' | 'players' | 'match';

const START_STEPS: Record<StartStep, MascotSituation> = {
  account: 'startStepAccount', team: 'startStepTeam', players: 'startStepPlayers', match: 'startStepMatch',
};

/**
 * /start shows one bubble, reacting to where the organiser is: the intro
 * until players are typed, then the player count, the account while they
 * fill it, and the launch steps.
 */
export function startMascot(s: {
  players: number; minPlayers: number; pepites: number; accountFocused: boolean; step: StartStep | null;
}): MascotCue & { spot: StartSpot } {
  const vars = { count: s.players, pepites: s.pepites };
  if (s.step) return { spot: 'launch', situations: [START_STEPS[s.step]], vars };
  if (s.accountFocused) return { spot: 'account', situations: ['startAccount'], vars };
  if (s.players === 0) return { spot: 'intro', situations: ['startIntro'], vars };
  return {
    spot: 'players',
    situations: [s.players < s.minPlayers ? 'startFew' : s.players >= START_MANY_PLAYERS ? 'startMany' : 'startReady'],
    vars,
  };
}
