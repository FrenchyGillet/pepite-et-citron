import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setCurrentOrgId } from '@/api';
import { useAppStore } from '@/store/appStore';
import type { Org } from '@/types';

export function useOrg() {
  const queryClient        = useQueryClient();
  const setCurrentOrg      = useAppStore(s => s.setCurrentOrg);
  const setLastMatchId     = useAppStore(s => s.setLastMatchId);
  const setVotedThisSession = useAppStore(s => s.setVotedThisSession);
  const loadOrgs           = useAppStore(s => s.loadOrgs);

  const switchOrg = useCallback((org: Org) => {
    setCurrentOrg(org);
    setCurrentOrgId(org.id);
    setLastMatchId(null);
    setVotedThisSession(false);
    queryClient.clear();
  }, [queryClient, setCurrentOrg, setLastMatchId, setVotedThisSession]);

  return { switchOrg, loadOrgs };
}
