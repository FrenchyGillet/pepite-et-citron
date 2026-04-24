import { useEffect } from 'react';
import { api, setCurrentOrgId, DEMO_MODE } from '../api';
import { useAppStore } from '../store/appStore';

export function useGuest() {
  const setGuestToken  = useAppStore(s => s.setGuestToken);
  const setGuestName   = useAppStore(s => s.setGuestName);
  const setGuestStatus = useAppStore(s => s.setGuestStatus);
  const setCurrentOrg  = useAppStore(s => s.setCurrentOrg);
  const setTab         = useAppStore(s => s.setTab);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const params     = new URLSearchParams(window.location.search);
    const guestParam = params.get('guest');
    const orgSlug    = params.get('org');

    if (guestParam) {
      setGuestStatus('checking');
      void api.validateGuestToken(guestParam).then(async result => {
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
          setTab('vote');
        } else {
          setGuestStatus('invalid');
        }
      });
    } else if (orgSlug && !DEMO_MODE) {
      void api.getOrgBySlug(orgSlug).then(org => {
        if (org) {
          setCurrentOrgId(org.id);
          if (!useAppStore.getState().currentOrg) setCurrentOrg(org);
        }
      });
    }
  }, []); // intentional: runs once on mount
}
