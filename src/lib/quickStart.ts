import { setCurrentOrgId } from '@/api';
import { defaultMatchLabel, quickStartPepiteCount, teamSlug } from '@/utils/quickStart';
import type { API, Match, Org, Player } from '@/types';

export type QuickStartStep = 'account' | 'team' | 'players' | 'match';

export interface QuickStartInput {
  email: string;
  password: string;
  teamName: string;
  /** Validated, de-duplicated first names (validateQuickStart). */
  names: string[];
  /** The organiser's own name in `names`, to link their account to it. */
  meName: string | null;
}

/** What is already done — kept by the caller so a retry resumes there. */
export interface QuickStartProgress {
  signedUp?: boolean;
  org?: Org;
  players?: Player[];
  match?: Match;
}

export interface QuickStartResult {
  org: Org;
  players: Player[];
  match: Match;
}

const sameName = (a: string, b: string) =>
  a.localeCompare(b, 'fr', { sensitivity: 'base' }) === 0;

/**
 * Account → team → players → open vote, in one go.
 *
 * Each step can fail on a bad connection (typically in a locker room), and a
 * write that timed out may still have been committed. So every step first
 * looks for what a previous attempt created and reuses it: tapping the
 * button again never makes a second team, duplicate players or a second
 * match. `progress` is updated in place after each step.
 */
export async function runQuickStart(
  api: API,
  input: QuickStartInput,
  progress: QuickStartProgress,
  onStep: (step: QuickStartStep) => void,
): Promise<QuickStartResult> {
  // ── 1. Account ───────────────────────────────────────────────────────────
  onStep('account');
  if (!progress.signedUp) {
    if (!(await api.getSession())) {
      await api.signUp(input.email, input.password);
      // Email confirmation must stay off in Supabase: no session means the
      // user has to confirm first, and cannot run the rest of this flow.
      if (!(await api.getSession())) {
        throw new Error('Compte créé : confirme ton adresse email puis connecte-toi pour lancer le vote.');
      }
    }
    progress.signedUp = true;
  }

  // ── 2. Team ──────────────────────────────────────────────────────────────
  onStep('team');
  if (!progress.org) {
    const mine = await api.getMyOrgs();
    progress.org = mine.find(o => o.role === 'admin' && sameName(o.name, input.teamName.trim()))
      ?? await api.createOrg(input.teamName.trim(), teamSlug(input.teamName));
  }
  const org = progress.org;
  setCurrentOrgId(org.id);

  // ── 3. Players ───────────────────────────────────────────────────────────
  onStep('players');
  if (!progress.players) {
    const existing = await api.getPlayers();
    const missing  = input.names.filter(n => !existing.some(p => sameName(p.name, n)));
    const added    = missing.length ? await api.addPlayers(missing) : [];
    const all      = [...existing, ...added];
    progress.players = input.names
      .map(n => all.find(p => sameName(p.name, n)))
      .filter((p): p is Player => p != null);
  }
  const players = progress.players;

  // ── 4. Open the vote ─────────────────────────────────────────────────────
  onStep('match');
  if (!progress.match) {
    progress.match = await api.getActiveMatch() ?? await api.createMatch(
      defaultMatchLabel(),
      players.map(p => p.id),
      null,
      await api.getCurrentSeason(),
      quickStartPepiteCount(players.length),
      null,
    );
  }

  // The organiser is a player too: link their account (best effort, the
  // vote works without it).
  const me = input.meName ? players.find(p => sameName(p.name, input.meName!)) : undefined;
  if (me) await api.linkPlayer(me.id).catch(err => console.warn('quick start link player:', err));

  return { org, players, match: progress.match };
}
