import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE } from '@/api';
import { queryKeys } from '@/hooks/queries';
import type { EntityId } from '@/types';

/**
 * Supabase Realtime subscriptions for matches and votes.
 *
 * Replaces the 5-second polling loops that were on useActiveMatch / useVotes.
 * On any DB change the relevant TanStack Query cache keys are invalidated so
 * all components refetch exactly the data they need, with no wasted traffic.
 *
 * Skipped entirely in DEMO_MODE (no Supabase project to connect to).
 *
 * Channel lifecycle:
 *  - Re-subscribes when orgId or activeMatchId changes.
 *  - Previous channel is removed before creating the new one (React cleanup).
 */
export function useRealtime(
  orgId: string | null | undefined,
  activeMatchId: EntityId | null | undefined,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (DEMO_MODE || !orgId) return;

    // Include activeMatchId in the channel name so React always creates a
    // fresh channel (with the correct vote filter) when the match changes.
    const channelName = `realtime:${orgId}:${activeMatchId ?? 'idle'}`;

    const channel = supabase
      .channel(channelName)
      // ── Matches ────────────────────────────────────────────────────────────
      // Any INSERT / UPDATE / DELETE on matches for this org invalidates
      // both the "is there an active match?" query and the full match list.
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'matches',
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.activeMatch(orgId) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.matches(orgId) });
        },
      );

    // ── Votes ───────────────────────────────────────────────────────────────
    // Only subscribe while a match is open — this is exactly when vote
    // counts need to update in real time.  Filtering by match_id keeps the
    // traffic minimal and avoids receiving events for other orgs' matches.
    if (activeMatchId != null) {
      channel.on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'votes',
          filter: `match_id=eq.${activeMatchId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.votes(activeMatchId) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.allVotes(orgId) });
        },
      );
    }

    channel.subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [orgId, activeMatchId, queryClient]);
}
