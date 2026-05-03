/**
 * Offline vote queue — persists a pending vote to localStorage when the
 * network is unavailable and replays it automatically when the connection
 * is restored.
 *
 * Only one pending vote is kept at a time (one user, one active match).
 */
import type { Vote } from '@/types';

const KEY = 'pepite_offline_vote_v1';

export interface PendingOfflineVote {
  vote: Vote;
  savedAt: string; // ISO timestamp — used to expire stale entries
}

/** Persist a vote to the offline queue. Overwrites any existing entry. */
export function saveOfflineVote(vote: Vote): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ vote, savedAt: new Date().toISOString() }));
  } catch { /* quota exceeded — ignore */ }
}

/** Retrieve the pending offline vote, or null if none. */
export function getPendingOfflineVote(): PendingOfflineVote | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingOfflineVote;
    // Discard entries older than 24 h (match will be long closed by then)
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (age > 24 * 60 * 60 * 1000) { clearOfflineVote(); return null; }
    return parsed;
  } catch { return null; }
}

/** Remove the pending vote from the queue (call after successful sync). */
export function clearOfflineVote(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Returns true if the error looks like a transient network failure. */
export function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true;
  if (err instanceof TypeError && /fetch|network|failed/i.test(err.message)) return true;
  if ((err as { name?: string })?.name === 'AbortError') return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes('network') || msg.includes('failed to fetch') || msg.includes('networkerror');
}
