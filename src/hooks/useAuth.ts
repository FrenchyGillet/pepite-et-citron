import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setCurrentOrgId, DEMO_MODE } from '../api';
import { useAppStore } from '../store/appStore';

export function useAuth() {
  const queryClient = useQueryClient();

  const setSession       = useAppStore(s => s.setSession);
  const setAuthLoading   = useAppStore(s => s.setAuthLoading);
  const setCurrentOrg    = useAppStore(s => s.setCurrentOrg);
  const loadOrgs         = useAppStore(s => s.loadOrgs);

  const handleSignOut = useCallback(async () => {
    await api.signOut();
    setSession(null);
    setCurrentOrg(null);
    setCurrentOrgId(null);
    queryClient.clear();
    useAppStore.getState().setTab('vote');
  }, [queryClient, setSession, setCurrentOrg]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (DEMO_MODE) return;

    const safetyTimer = setTimeout(() => {
      console.warn('bootstrap safety timeout — forcing loading states off');
      setAuthLoading(false);
      const { orgsResolved } = useAppStore.getState();
      if (!orgsResolved) {
        useAppStore.setState({ orgsResolved: true, orgsLoadError: true });
      }
    }, 12000);

    const bootstrap = async () => {
      try {
        const s = await api.getSession();
        if (s) { setSession(s); await loadOrgs(); }
      } catch (err) {
        console.error('bootstrap:', err);
      } finally {
        clearTimeout(safetyTimer);
        setAuthLoading(false);
      }
    };
    void bootstrap();

    const sub = api.onAuthChange(async (_event, s) => {
      setSession(s);
      if (s) {
        await loadOrgs().catch(err => console.error('onAuthChange loadOrgs:', err));
      } else {
        setCurrentOrg(null);
        setCurrentOrgId(null);
        queryClient.clear();
      }
    });
    return () => sub?.unsubscribe?.();
  }, []); // intentional: stable Zustand actions + queryClient

  return { handleSignOut };
}
