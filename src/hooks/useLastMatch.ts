import { useEffect } from 'react';
import { useActiveMatch, useMatchById } from './queries';
import { useAppStore } from '@/store/appStore';

export function useLastMatch(orgId?: string | null) {
  const lastMatchId    = useAppStore(s => s.lastMatchId);
  const setLastMatchId = useAppStore(s => s.setLastMatchId);

  const { data: activeMatch, isLoading: activeLoading } = useActiveMatch(orgId);

  useEffect(() => {
    if (activeMatch?.id != null) setLastMatchId(activeMatch.id);
  }, [activeMatch?.id, setLastMatchId]);

  const { data: lastMatchById, isLoading: lastLoading } = useMatchById(!activeMatch ? lastMatchId : null);

  return {
    activeMatch: activeMatch ?? null,
    lastMatch:   activeMatch ?? lastMatchById ?? null,
    isLoading:   activeLoading || lastLoading,
  };
}
