import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, setCurrentOrgId, DEMO_MODE } from '@/api';
import { useAppStore } from '@/store/appStore';

export function useGuest() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const setGuestToken      = useAppStore(s => s.setGuestToken);
  const setGuestName       = useAppStore(s => s.setGuestName);
  const setGuestStatus     = useAppStore(s => s.setGuestStatus);
  const setIsVoterSession  = useAppStore(s => s.setIsVoterSession);
  const setCurrentOrg      = useAppStore(s => s.setCurrentOrg);
  const setPendingOrgId    = useAppStore(s => s.setPendingOrgId);
  const setPendingOrgName  = useAppStore(s => s.setPendingOrgName);

  useEffect(() => {
    const guestParam = searchParams.get('guest');
    const orgSlug    = searchParams.get('org');

    if (guestParam) {
      setIsVoterSession(true);
      setGuestStatus('checking');

      // Safety net: never leave the guest stuck on "Vérification…" if the
      // network hangs. 8 s matches the timeout budget used in useAuth.
      const timeout = setTimeout(() => {
        if (useAppStore.getState().guestStatus === 'checking') setGuestStatus('invalid');
      }, 8000);

      void (async () => {
        try {
          const result = await api.validateGuestToken(guestParam);
          if (result && !result.used) {
            const match = await api.getMatchById(result.match_id);
            const orgId = match?.org_id;
            if (orgId) {
              setCurrentOrgId(orgId);
              if (!useAppStore.getState().currentOrg) {
                setCurrentOrg({ id: orgId, name: '', slug: '', role: null });
              }
            }
            setGuestToken(guestParam);
            setGuestName(result.name);
            setGuestStatus('valid');
            navigate('/vote', { replace: true });
          } else {
            setGuestStatus('invalid');
          }
        } catch {
          setGuestStatus('invalid');
        } finally {
          clearTimeout(timeout);
        }
      })();
    } else if (orgSlug && !DEMO_MODE) {
      setIsVoterSession(true);
      void api.getOrgBySlug(orgSlug).then(org => {
        if (org) {
          setCurrentOrgId(org.id);
          // No role on a slug-resolved org — force null so isAdmin stays false
          // until loadOrgs() confirms the real membership.
          if (!useAppStore.getState().currentOrg) setCurrentOrg({ ...org, role: null });
          // Remember this org so we can auto-join after signup (instead of OrgSetupView)
          setPendingOrgId(org.id);
          setPendingOrgName(org.name);
        }
      }).catch(() => {
        // Slug lookup failed — leave the user on the normal (non-org) screen.
      });
    }
    // Reads the initial URL params once on mount; the store setters are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
