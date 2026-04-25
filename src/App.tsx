import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { DEMO_MODE, setCurrentOrgId } from '@/api';
import { GlobalStyle }       from '@/GlobalStyle';
import { AuthView }          from '@/components/AuthView';
import { OrgSetupView }      from '@/components/OrgSetupView';
import { AppHeader }         from '@/components/AppHeader';
import { VoteTab }           from '@/components/VoteTab';
import { ResultsView }       from '@/components/ResultsView';
import { StatsView }         from '@/components/StatsView';
import { AdminView }         from '@/components/AdminView';
import { ErrorBoundary }     from '@/components/ErrorBoundary';
import { OnboardingModal }   from '@/components/OnboardingModal';
import { useAuth }           from '@/hooks/useAuth';
import { useGuest }          from '@/hooks/useGuest';
import { useTheme }          from '@/hooks/useTheme';
import { useLastMatch }      from '@/hooks/useLastMatch';
import { useRealtime }       from '@/hooks/useRealtime';
import { usePlayers }        from '@/hooks/queries';
import { useAppStore }       from '@/store/appStore';
import { useSearchParams }   from 'react-router-dom';
import type { Org } from '@/types';

function FakeProgressBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible,  setVisible]  = useState(true);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      setVisible(true);
      const steps: [number, number][] = [[150, 25], [700, 50], [1800, 70], [4000, 82], [8000, 89]];
      const timers = steps.map(([delay, target]) => setTimeout(() => setProgress(target), delay));
      return () => timers.forEach(clearTimeout);
    } else {
      setProgress(100);
      const t = setTimeout(() => setVisible(false), 450);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: 3, background: 'rgba(255,215,0,0.12)' }}>
      <div style={{
        height: '100%', background: '#FFD700',
        width: `${progress}%`,
        transition: loading ? 'width 0.9s cubic-bezier(0.1,0.4,0.2,1)' : 'width 0.25s ease',
        borderRadius: '0 2px 2px 0',
      }} />
    </div>
  );
}

export default function App() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const [searchParams] = useSearchParams();

  // ── Bootstrap side-effects ──────────────────────────────────────────────
  const { handleSignOut }  = useAuth();
  useGuest();
  useTheme();

  // ── Global state ────────────────────────────────────────────────────────
  const session          = useAppStore(s => s.session);
  const authLoading      = useAppStore(s => s.authLoading);
  const currentOrg       = useAppStore(s => s.currentOrg);
  const orgsResolved     = useAppStore(s => s.orgsResolved);
  const orgsLoadError       = useAppStore(s => s.orgsLoadError);
  const orgsLoadErrorDetail = useAppStore(s => s.orgsLoadErrorDetail);
  const showOnboarding   = useAppStore(s => s.showOnboarding);
  const theme            = useAppStore(s => s.theme);
  const setSession       = useAppStore(s => s.setSession);
  const setCurrentOrg    = useAppStore(s => s.setCurrentOrg);
  const setMyOrgs        = useAppStore(s => s.setMyOrgs);
  const setOrgsResolved  = useAppStore(s => s.setOrgsResolved);
  const setOrgsLoadError = useAppStore(s => s.setOrgsLoadError);
  const setShowOnboarding = useAppStore(s => s.setShowOnboarding);
  const loadOrgs         = useAppStore(s => s.loadOrgs);

  // ── Server state ────────────────────────────────────────────────────────
  const { data: players = [] }       = usePlayers(currentOrg?.id);
  const { activeMatch, lastMatch }   = useLastMatch(currentOrg?.id);

  // ── Realtime subscriptions ──────────────────────────────────────────────
  useRealtime(currentOrg?.id, activeMatch?.id);

  // ── Derived ─────────────────────────────────────────────────────────────
  const isAdmin     = DEMO_MODE || (!!session && !!currentOrg && currentOrg.role !== 'voter');
  const isVoterLink = !DEMO_MODE && (searchParams.get('org') || searchParams.get('guest'));

  // ── Auth gates ──────────────────────────────────────────────────────────
  if (authLoading && !isVoterLink) {
    return (
      <>
        <GlobalStyle />
        <FakeProgressBar loading={true} />
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
        <FakeProgressBar loading={true} />
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
            {orgsLoadErrorDetail && (
              <div style={{ fontSize: 11, color: 'var(--label3)', marginBottom: 16, lineHeight: 1.5,
                fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', borderRadius: 8,
                padding: '8px 10px', textAlign: 'left', wordBreak: 'break-all' }}>
                {orgsLoadErrorDetail}
              </div>
            )}
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
  const tabs = [
    { id: 'vote',    label: 'Vote',      icon: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></> },
    { id: 'results', label: 'Résultats', icon: <path d="M18 20V10M12 20V4M6 20v-6"/> },
    { id: 'stats',   label: 'Saison',    icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/> },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></> }] : []),
  ];

  return (
    <>
      <GlobalStyle />
      <div className="app-wrapper">
        <AppHeader />
        {DEMO_MODE && <div className="demo-banner">Mode démo · Configure Supabase pour le multi-device</div>}

        <Routes>
          <Route index element={<Navigate to="/vote" replace />} />
          <Route path="/vote" element={
            <ErrorBoundary label="Vote">
              <VoteTab isAdmin={isAdmin} activeMatch={activeMatch} lastMatch={lastMatch} players={players} />
            </ErrorBoundary>
          } />
          <Route path="/results" element={
            <ErrorBoundary label="Résultats">
              <ResultsView players={players} match={lastMatch} isAdmin={isAdmin} isDark={theme === 'dark'}
                orgId={currentOrg?.id} />
            </ErrorBoundary>
          } />
          <Route path="/stats" element={
            <ErrorBoundary label="Saison">
              <StatsView players={players} activeMatch={activeMatch} isAdmin={isAdmin}
                orgId={currentOrg?.id} />
            </ErrorBoundary>
          } />
          <Route path="/admin" element={
            isAdmin
              ? <ErrorBoundary label="Admin">
                  <AdminView
                    players={players}
                    activeMatch={activeMatch}
                    currentOrg={currentOrg}
                    onSignOut={handleSignOut}
                    onShowGuide={() => setShowOnboarding(true)}
                    onGoToResults={() => navigate('/results')}
                  />
                </ErrorBoundary>
              : <Navigate to="/vote" replace />
          } />
          <Route path="*" element={<Navigate to="/vote" replace />} />
        </Routes>

        {showOnboarding && (
          <OnboardingModal onClose={() => {
            setShowOnboarding(false);
            if (currentOrg?.id) localStorage.setItem(`pepite_onboarded_${currentOrg.id}`, '1');
          }} />
        )}
      </div>

      <nav className="tab-bar">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab-bar-item ${location.pathname === `/${t.id}` ? 'active' : ''}`}
            onClick={() => navigate(`/${t.id}`)}
          >
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

export { __resetDemoState, __demoAPI } from '@/api';
