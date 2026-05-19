/**
 * useWakeUp — Forces a full data refresh when the user returns to the app
 * after it was backgrounded.
 *
 * On iOS PWA, Supabase Realtime WebSocket connections are killed in the
 * background and may not reconnect instantly. Any DB changes that occurred
 * while the app was hidden are therefore missed. By force-invalidating the
 * entire TanStack Query cache on return, every component re-fetches fresh
 * data regardless of the Realtime subscription state.
 *
 * A minimum hidden-time threshold (default 3 s) avoids spurious refetches
 * when the user briefly switches to another app and immediately returns.
 *
 * Usage: call once at the App level (alongside useOfflineSync).
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useWakeUp(minHiddenMs = 3_000) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let hiddenAt = 0;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      // Visible again — only invalidate if the app was hidden long enough
      // that meaningful server-side changes (votes, match state) may have occurred.
      if (Date.now() - hiddenAt >= minHiddenMs) {
        void queryClient.invalidateQueries();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [queryClient, minHiddenMs]);
}
