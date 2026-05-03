import type { EntityId, Vote } from '@/types';

export function hasVotedLocally(matchId: EntityId | null | undefined): boolean {
  if (matchId == null) return false;
  return (JSON.parse(localStorage.getItem('pepite_voted') || '[]') as unknown[]).includes(matchId);
}

export function markVotedLocally(matchId: EntityId): void {
  const voted = JSON.parse(localStorage.getItem('pepite_voted') || '[]') as unknown[];
  if (!voted.includes(matchId)) {
    localStorage.setItem('pepite_voted', JSON.stringify([...voted, matchId]));
  }
}

export function classifyVoteError(err: unknown): string {
  const e = err instanceof Error ? err : null;
  if (e?.message?.includes('network') || (err as { name?: string })?.name === 'AbortError') {
    return 'Erreur réseau — vérifie ta connexion et réessaie.';
  }
  return e?.message || "Erreur lors de l'envoi, réessaie.";
}

// ── Voter identity persistence ────────────────────────────────────────────────

const VOTER_IDENTITY_KEY = 'pepite_voter_identity';

interface StoredVoterIdentity {
  name: string;
  playerId: EntityId | null;
}

/** Retrieve the stored voter name for this device (null if none). */
export function getStoredVoterIdentity(): StoredVoterIdentity | null {
  try {
    const raw = localStorage.getItem(VOTER_IDENTITY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredVoterIdentity;
  } catch { return null; }
}

/** Persist the voter's name after a successful vote. */
export function saveVoterIdentity(name: string, playerId: EntityId | null): void {
  try {
    localStorage.setItem(VOTER_IDENTITY_KEY, JSON.stringify({ name, playerId }));
  } catch { /* quota exceeded — ignore */ }
}

export function shuffleRevealOrder(votes: Vote[]): EntityId[] {
  return [...votes]
    .sort(() => Math.random() - 0.5)
    .map(v => v.id)
    .filter((id): id is EntityId => id != null);
}
