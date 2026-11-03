import type { EntityId, Vote } from '@/types';

/**
 * Editing who votes while the vote is open (set_match_voters, 20260026).
 * The same rules as the server, so the Admin can grey out what it would
 * refuse and the demo behaves like production.
 */

/**
 * Players who must stay voters: they already voted, or a ballot names them
 * as a pépite (that ballot would name an absent player). The citron may be
 * absent, so a citron vote does not lock anyone.
 */
export function lockedVoterIds(votes: Vote[]): Set<string> {
  const ids = new Set<string>();
  for (const v of votes) {
    for (const id of [v.voter_player_id, v.best1_id, v.best2_id, v.best3_id]) {
      if (id != null) ids.add(String(id));
    }
  }
  return ids;
}

/** Enough players for the pépite mode: each voter picks pepiteCount others. */
export function minVoters(pepiteCount: 2 | 3 = 2): number {
  return pepiteCount + 1;
}

export type VoterEditProblem = 'locked' | 'tooFew';

/** Why this list of voters would be refused, or null when it is fine. */
export function voterEditProblem(ids: EntityId[], votes: Vote[], pepiteCount: 2 | 3 = 2): VoterEditProblem | null {
  const wanted = new Set(ids.map(String));
  for (const id of lockedVoterIds(votes)) {
    if (!wanted.has(id)) return 'locked';
  }
  if (wanted.size < minVoters(pepiteCount)) return 'tooFew';
  return null;
}
