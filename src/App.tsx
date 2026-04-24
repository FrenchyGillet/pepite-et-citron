import { useEffect } from 'react';
import { DEMO_MODE, setCurrentOrgId } from './api';
import { GlobalStyle }       from './GlobalStyle';
import { AuthView }          from './components/AuthView';
import { OrgSetupView }      from './components/OrgSetupView';
import { AppHeader }         from './components/AppHeader';
import { VoteTab }           from './components/VoteTab';
import { ResultsView }       from './components/ResultsView';
import { StatsView }         from './components/StatsView';
import { AdminView }         from './components/AdminView';
import { ErrorBoundary }     from './components/ErrorBoundary';
import { OnboardingModal }   from './components/OnboardingModal';
import { useAuth }           from './hooks/useAuth';
import { useGuest }          from './hooks/useGuest';
import { useTheme }          from './hooks/useTheme';
import { useLastMatch }      from './hooks/useLastMatch';
import { usePlayers }        from './hooks/queries';
import { useAppStore }       from './store/appStore';
import type { Org } from './types';

const VALID_TABS = ['vote', 'results', 'stats', 'admin'];

export default function App() {
  // ── Bootstrap side-effects ──────────────────────────────────────────────
  const { handleSignOut }  = useAuth();
  useGuest();
  useTheme();

  // ── Global state ────────────────────────────────────────────────────────
  const session          = useAppStore(s => s.session);
  const authLoading      = useAppStore(s => s.authLoading);
  const currentOrg       = useAppStore(s => s.currentOrg);
  const orgsResolved     = useAppStore(s => s.orgsResolved);
  const orgsLoadError    = useAppStore(s => s.orgsLoadError);
  const tab              = useAppStore(s => s.tab);
  const showOnboarding   = useAppStore(s => s.showOnboarding);
  const theme            = useAppStore(s => s.theme);
  const setSession       = useAppStore(s => s.setSession);
  const setCurrentOrg    = useAppStore(s => s.setCurrentOrg);
  const setMyOrgs        = useAppStore(s => s.setMyOrgs);
  const setOrgsResolved  = useAppStore(s => s.setOrgsResolved);
  const setOrgsLoadError = useAppStore(s => s.setOrgsLoadError);
  const setShowOnboarding = useAppStore(s => s.setShowOnboarding);
  const setTab           = useAppStore(s => s.setTab);
  const loadOrgs         = useAppStore(s => s.loadOrgs);

  // Sync browser back/forward with tab state
  useEffect(() => {
    const onPop = () => {
      const hash = window.location.hash.slice(1);
      useAppStore.setState({ tab: VALID_TABS.includes(hash) ? hash : 'vote' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Server state ────────────────────────────────────────────────────────
  const { data: players = [] }       = usePlayers(currentOrg?.id);
  const { activeMatch, lastMatch }   = useLastMatch(currentOrg?.id);

  // ── Derived ─────────────────────────────────────────────────────────────
  const isAdmin     = DEMO_MODE || (!!session && !!currentOrg && currentOrg.role !== 'voter');
  const urlParams   = new URLSearchParams(window.location.search);
  const isVoterLink = !DEMO_MODE && (urlParams.get('org') || urlParams.get('guest'));

  // ── Auth gates ──────────────────────────────────────────────────────────
  if (authLoading && !isVoterLink) {
    return (
      <>
        <GlobalStyle />
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
          <div style={{ fontSize: 14, color: 'var(--label3)' }}>Chargement…</div>
        </div>
      </>
    );
  }

  if (!DEMO_MODE && !session && !isVoterLink) {
    return <><GlobalStyle /><AuthView onAuth={setSession} /></>;
  }

  if (!DEMO_MODE && session && !orgsResolved && !isVoterLink) {
    return (
      <>
        <GlobalStyle />
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
          <div style={{ fontSize: 14, color: 'var(--label3)' }}>Chargement…</div>
        </div>
      </>
    );
  }

  if (!DEMO_MODE && session && orgsResolved && orgsLoadError) {
    return (
      <>
        <GlobalStyle />
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
          <div style={{ background: 'var(--bg2)', borderRadius: 16, padding: '32px 24px', maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--label)' }}>Impossible de charger tes équipes</div>
            <div style={{ fontSize: 14, color: 'var(--label3)', marginBottom: 24, lineHeight: 1.6 }}>
              Erreur de connexion au serveur.<br />Vérifie ta connexion et réessaie.
            </div>
            <button className="btn btn-primary btn-full" onClick={() => { setOrgsResolved(false); void loadOrgs(); }}>
              Réessayer
            </button>
            <button className="btn btn-secondary btn-full" style={{ marginTop: 10 }} onClick={handleSignOut}>
              Se déconnecter
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!DEMO_MODE && session && orgsResolved && !orgsLoadError && !currentOrg) {
    return (
      <>
        <GlobalStyle />
        <OrgSetupView
          userEmail={session.user?.email}
          onOrgCreated={(org) => {
            const orgWithRole: Org = { ...org, role: 'admin' };
            setCurrentOrg(orgWithRole);
            setCurrentOrgId(org.id);
            setMyOrgs([orgWithRole]);
            setOrgsResolved(true);
            setOrgsLoadError(false);
            if (!localStorage.getItem(`pepite_onboarded_${org.id}`)) {
              setShowOnboarding(true);
            }
          }}
        />
      </>
    );
  }

  // ── Main app ────────────────────────────────────────────────────────────
  return (
    <>
      <GlobalStyle />
      <div className="app-wrapper">
        <AppHeader />
        {DEMO_MODE && <div className="demo-banner">Mode démo · Configure Supabase pour le multi-device</div>}

        {tab === 'vote' && (
          <VoteTab isAdmin={isAdmin} activeMatch={activeMatch} lastMatch={lastMatch} players={players} />
        )}
        {tab === 'results' && (
          <ErrorBoundary label="Résultats">
            <ResultsView players={players} match={lastMatch} isAdmin={isAdmin} isDark={theme === 'dark'}
              orgId={currentOrg?.id} />
          </ErrorBoundary>
        )}
        {tab === 'stats' && (
          <ErrorBoundary label="Saison">
            <StatsView players={players} activeMatch={activeMatch} isAdmin={isAdmin}
              orgId={currentOrg?.id} />
          </ErrorBoundary>
        )}
        {tab === 'admin' && isAdmin && (
          <ErrorBoundary label="Admin">
            <AdminView
              players={players}
              activeMatch={activeMatch}
              currentOrg={currentOrg}
              onSignOut={handleSignOut}
              onShowGuide={() => setShowOnboarding(true)}
              onGoToResults={() => setTab('results')}
            />
          </ErrorBoundary>
        )}

        {showOnboarding && (
          <OnboardingModal onClose={() => {
            setShowOnboarding(false);
            if (currentOrg?.id) localStorage.setItem(`pepite_onboarded_${currentOrg.id}`, '1');
          }} />
        )}
      </div>

      <nav className="tab-bar">
        {[
          { id: 'vote',    label: 'Vote',      icon: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></> },
          { id: 'results', label: 'Résultats', icon: <path d="M18 20V10M12 20V4M6 20v-6"/> },
          { id: 'stats',   label: 'Saison',    icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/> },
          ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></> }] : []),
        ].map(t => (
          <button key={t.id} className={`tab-bar-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
              {t.icon}
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

export { __resetDemoState, __demoAPI } from './api';
