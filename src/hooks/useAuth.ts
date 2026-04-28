import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, setCurrentOrgId, DEMO_MODE } from '@/api';
import { useAppStore } from '@/store/appStore';

export function useAuth() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  const setSession          = useAppStore(s => s.setSession);
  const setAuthLoading      = useAppStore(s => s.setAuthLoading);
  const setCurrentOrg       = useAppStore(s => s.setCurrentOrg);
  const loadOrgs            = useAppStore(s => s.loadOrgs);
  const setPasswordRecovery = useAppStore(s => s.setPasswordRecovery);

  const handleSignOut = useCallback(async () => {
    await api.signOut();
    setSession(null);
    setCurrentOrg(null);
    setCurrentOrgId(null);
    queryClient.clear();
    navigate('/vote');
  }, [navigate, queryClient, setSession, setCurrentOrg]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (DEMO_MODE) return;

    // Safety timer — two stages:
    //  • 12 s : unlock the auth spinner (authLoading → false) so the org-loading
    //           spinner can take over without the app appearing completely frozen.
    //  • 30 s : last resort — if orgs still haven't resolved (e.g. every retry
    //           exhausted), surface the error screen. 30 s covers the full
    //           "RPC 8 s + REST ×2 attempts 10 s + waits" budget for a cold-start
    //           wake-up on a paused free-tier project.
    const safetyTimer = setTimeout(() => {
      console.warn('bootstrap safety timeout — forcing authLoading off');
      setAuthLoading(false);
    }, 12000);
    const hardTimeout = setTimeout(() => {
      const { orgsResolved } = useAppStore.getState();
      if (!orgsResolved) {
        console.warn('bootstrap hard timeout — giving up on org load');
        useAppStore.setState({ orgsResolved: true, orgsLoadError: true });
      }
    }, 30000);

    const bootstrap = async () => {
      try {
        const s = await api.getSession();
        if (s) { setSession(s); await loadOrgs(); }
      } catch (err) {
        console.error('bootstrap:', err);
      } finally {
        clearTimeout(safetyTimer);
        clearTimeout(hardTimeout);
        setAuthLoading(false);
      }
    };
    void bootstrap();

    const sub = api.onAuthChange(async (event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the password-reset link — show the new-password form.
        setPasswordRecovery(true);
        return;
      }
      if (!s) {
        // Signed out (explicit or session expired) — clear everything.
        setCurrentOrg(null);
        setCurrentOrgId(null);
        queryClient.clear();
      } else if (event === 'SIGNED_IN') {
        // Explicit sign-in: reload orgs (bootstrap handles the initial load).
        await loadOrgs().catch(err => console.error('onAuthChange loadOrgs:', err));

        // If the user voted before signing up, link their account to the player
        // they selected at vote time so historical votes are preserved.
        const { pendingPlayerId, setPendingPlayerId } = useAppStore.getState();
        if (pendingPlayerId) {
          api.linkPlayer(pendingPlayerId)
            .catch(err => console.warn('auto-link player:', err))
            .finally(() => setPendingPlayerId(null));
        }
      }
      // TOKEN_REFRESHED / USER_UPDATED / INITIAL_SESSION → session is still
      // valid, orgs haven't changed; no need to hit the server again.
    });
    return () => sub?.unsubscribe?.();
  }, []); // intentional: stable Zustand actions + queryClient

  return { handleSignOut };
}
