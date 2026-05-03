/**
 * useOfflineSync — watches the `online` event and replays any pending vote
 * stored by the offline-first submit path in VoteView.
 *
 * Mount this once at the App level. It silently retries the queued vote
 * when the device comes back online, then notifies the user.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { getPendingOfflineVote, clearOfflineVote } from '@/utils/offlineVote';

export function useOfflineSync(onSynced?: () => void, onFailed?: () => void) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const trySync = async () => {
      const pending = getPendingOfflineVote();
      if (!pending) return;

      try {
        await api.submitVote(pending.vote);
        clearOfflineVote();
        // Invalidate votes so the count updates on any open screen
        await queryClient.invalidateQueries({ queryKey: ['votes'] });
        onSynced?.();
      } catch {
        // Still offline or match closed — leave it in the queue, try again next time
        onFailed?.();
      }
    };

    // Try immediately on mount (covers page reload while online with pending vote)
    if (navigator.onLine) void trySync();

    window.addEventListener('online', () => void trySync());
    return () => window.removeEventListener('online', () => void trySync());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
