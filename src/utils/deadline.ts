/**
 * Vote deadline (audit F1): the admin picks a duration when opening a match;
 * submit_vote refuses ballots once it has passed (migration 20260017).
 */

/** Choices offered when opening a match, in minutes (null = no deadline). */
export const VOTE_DURATIONS: ReadonlyArray<{ minutes: number | null; label: string }> = [
  { minutes: null, label: 'Sans limite' },
  { minutes: 30,   label: '30 min' },
  { minutes: 60,   label: '1 h' },
  { minutes: 120,  label: '2 h' },
];

/** Minutes added by the admin's "+15 min" button. */
export const DEADLINE_EXTENSION_MINUTES = 15;

export function deadlineFrom(now: number, minutes: number | null): string | null {
  return minutes == null ? null : new Date(now + minutes * 60_000).toISOString();
}

export function isDeadlinePassed(deadline: string | null | undefined, now: number = Date.now()): boolean {
  return !!deadline && new Date(deadline).getTime() <= now;
}

/** Pushes the deadline back — from now if it already passed, else from the deadline. */
export function extendDeadline(deadline: string | null | undefined, now: number, minutes = DEADLINE_EXTENSION_MINUTES): string {
  const base = deadline ? Math.max(new Date(deadline).getTime(), now) : now;
  return new Date(base + minutes * 60_000).toISOString();
}

export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
}

/** "Fermeture dans 23 min" / "Fermeture dans 1 h 05" / "Vote fermé à 22:30". */
export function formatDeadline(deadline: string, now: number = Date.now()): string {
  const remainingMs = new Date(deadline).getTime() - now;
  if (remainingMs <= 0) return `Vote fermé à ${formatClockTime(deadline)}`;
  const minutes = Math.ceil(remainingMs / 60_000);
  if (minutes < 60) return `Fermeture dans ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `Fermeture dans ${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`;
}
