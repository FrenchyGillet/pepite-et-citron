import { useState, useEffect, useCallback, useRef } from 'react';
import { DEMO_MODE, api, setCurrentOrgId } from './api';
import { GlobalStyle }       from './GlobalStyle';
import { AuthView }          from './components/AuthView';
import { OrgSetupView }      from './components/OrgSetupView';
import { VoteView }          from './components/VoteView';
import { ResultsView }       from './components/ResultsView';
import { StatsView }         from './components/StatsView';
import { AdminView }         from './components/AdminView';
import { EmptyState }        from './components/EmptyState';
import { ErrorBoundary }     from './components/ErrorBoundary';
import { OnboardingModal }   from './components/OnboardingModal';
import type { UserSession, Org, Player, Match, EntityId } from './types';

type GuestStatus = 'checking' | 'valid' | 'invalid' | null;

export default function App() {
  const [session,     setSession]     = useState<UserSession | null>(null);
  const [currentOrg,  setCurrentOrg]  = useState<Org | null>(null);
  const [authLoading, setAuthLoading] = useState(!DEMO_MODE);

  const VALID_TABS = ['vote', 'results', 'stats', 'admin'];
  const [tab, setTabRaw] = useState(() => {
    const hash = window.location.hash.slice(1);
    return VALID_TABS.includes(hash) ? hash : 'vote';
  });

  const setTab = useCallback((t: string) => {
    setTabRaw(t);
    if (window.location.hash.slice(1) !== t) {
      history.pushState(null, '', `#${t}`);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const hash = window.location.hash.slice(1);
      setTabRaw(VALID_TABS.includes(hash) ? hash : 'vote');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [players,           setPlayers]           = useState<Player[]>([]);
  const [activeMatch,       setActiveMatch]       = useState<Match | null>(null);
  const [lastMatch,         setLastMatch]         = useState<Match | null>(null);
  const lastMatchIdRef                             = useRef<EntityId | null>(null);
  const [refreshKey,        setRefreshKey]        = useState(0);
  const [votedThisSession,  setVotedThisSession]  = useState(false);
  const [theme,             setTheme]             = useState(() => localStorage.getItem('pepite_theme') || 'dark');
  const [guestToken,        setGuestToken]        = useState<string | null>(null);
  const [guestName,         setGuestName]         = useState<string | null>(null);
  const [guestStatus,       setGuestStatus]       = useState<GuestStatus>(null);
  const [showOnboarding,    setShowOnboarding]    = useState(false);
  const [myOrgs,            setMyOrgs]            = useState<Org[]>([]);
  const [orgPickerOpen,     setOrgPickerOpen]     = useState(false);
  const [orgsResolved,      setOrgsResolved]      = useState(false);
  const [orgsLoadError,     setOrgsLoadError]     = useState(false);

  const currentOrgIdRef = useRef<string | null>(null);
  const orgsResolvedRef = useRef(false);
  useEffect(() => { currentOrgIdRef.current = currentOrg?.id ?? null; }, [currentOrg?.id]);

  // Ferme le org picker quand on clique à l'extérieur
  useEffect(() => {
    if (!orgPickerOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-org-picker]')) setOrgPickerOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [orgPickerOpen]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pepite_theme', theme);
  }, [theme]);

  const loadOrgs = useCallback(async (): Promise<Org | null> => {
    setOrgsLoadError(false);
    try {
      const orgs = await api.getMyOrgs();
      setMyOrgs(orgs);
      if (orgs.length) {
        const current = orgs.find(o => o.id === currentOrgIdRef.current) || orgs[0];
        setCurrentOrg(current);
        setCurrentOrgId(current.id);
        currentOrgIdRef.current = current.id;
        return current;
      }
      return null;
    } catch (err) {
      console.error('loadOrgs:', err);
      setOrgsLoadError(true);
      return null;
    } finally {
      orgsResolvedRef.current = true;
      setOrgsResolved(true);
    }
  }, []);

  const switchOrg = useCallback((org: Org) => {
    setCurrentOrg(org);
    setCurrentOrgId(org.id);
    setOrgPickerOpen(false);
    setActiveMatch(null);
    setLastMatch(null);
    setPlayers([]);
    setVotedThisSession(false);
    lastMatchIdRef.current = null;
  }, []);

  useEffect(() => {
    if (DEMO_MODE) return;

    const safetyTimer = setTimeout(() => {
      console.warn('bootstrap safety timeout — forcing all loading states off');
      setAuthLoading(false);
      if (!orgsResolvedRef.current) {
        orgsResolvedRef.current = true;
        setOrgsResolved(true);
        setOrgsLoadError(true);
      }
    }, 12000);

    const bootstrap = async () => {
      try {
        const s = await api.getSession();
        if (s) {
          setSession(s);
          await loadOrgs();
        }
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
      }
    });
    return () => sub?.unsubscribe?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
            setCurrentOrg(prev => prev ?? { id: orgId, name: '', slug: '', role: null });
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
          setCurrentOrg(prev => prev ?? org);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlayers = useCallback(async () => {
    if (!DEMO_MODE && !currentOrgIdRef.current) return;
    setPlayers(await api.getPlayers());
  }, []);

  const loadMatch = useCallback(async () => {
    if (!DEMO_MODE && !currentOrgIdRef.current) return;
    const m = await api.getActiveMatch();
    setActiveMatch(m);
    if (m) {
      setLastMatch(m);
      lastMatchIdRef.current = m.id;
    } else if (lastMatchIdRef.current) {
      const closed = await api.getMatchById(lastMatchIdRef.current);
      if (closed) setLastMatch(closed);
    }
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (DEMO_MODE || currentOrg) {
      void loadPlayers();
      void loadMatch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg?.id]);

  const matchIsActive = activeMatch?.is_open || activeMatch?.phase === 'counting';
  useEffect(() => {
    if (!matchIsActive) return;
    const t = setInterval(() => void loadMatch(), 5000);
    return () => clearInterval(t);
  }, [matchIsActive, loadMatch]);

  const hasVotedLocally = (matchId: EntityId | null | undefined): boolean =>
    !!matchId && (JSON.parse(localStorage.getItem('pepite_voted') || '[]') as unknown[]).includes(matchId);

  const handleVoted = () => {
    setVotedThisSession(true);
    setTab('results');
    setRefreshKey(k => k + 1);
  };

  const handleGuestVoted = async () => {
    if (guestToken) await api.useGuestToken(guestToken);
    setGuestToken(null);
  };

  const handleSignOut = async () => {
    await api.signOut();
    setSession(null);
    setCurrentOrg(null);
    setCurrentOrgId(null);
    setTab('vote');
  };

  const isAdmin = DEMO_MODE || (!!session && !!currentOrg && currentOrg.role !== 'voter');

  const urlParams   = new URLSearchParams(window.location.search);
  const isVoterLink = !DEMO_MODE && (urlParams.get('org') || urlParams.get('guest'));

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
    return (
      <>
        <GlobalStyle />
        <AuthView onAuth={(s) => setSession(s)} />
      </>
    );
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
          onOrgCreated={async (org) => {
            const orgWithRole: Org = { ...org, role: 'admin' };
            setCurrentOrg(orgWithRole);
            setCurrentOrgId(org.id);
            setMyOrgs([orgWithRole]);
            setOrgsResolved(true);
            setOrgsLoadError(false);
            void loadPlayers();
            void loadMatch();
            if (!localStorage.getItem(`pepite_onboarded_${org.id}`)) {
              setShowOnboarding(true);
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <div className="app-wrapper">
        <div className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="header-logo">
                <span className="header-pepite">Pépite</span>
                <span className="header-amp"> & </span>
                <span className="header-citron">Citron</span>
              </div>
              {currentOrg?.name && !DEMO_MODE && (
                <div style={{ position: 'relative' }} data-org-picker="">
                  {myOrgs.length > 1 ? (
                    <button
                      onClick={() => setOrgPickerOpen(v => !v)}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <span className="header-sub" style={{ color: 'var(--gold)', fontWeight: 600 }}>
                        {currentOrg.name}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--gold)', opacity: 0.7, marginTop: 1 }}>▼</span>
                      {currentOrg.role === 'voter' && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, background: 'rgba(170,221,0,0.15)',
                          color: 'var(--lemon)', borderRadius: 4, padding: '1px 5px',
                        }}>votant</span>
                      )}
                    </button>
                  ) : (
                    <div className="header-sub" style={{ color: 'var(--gold)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {currentOrg.name}
                      {currentOrg.role === 'voter' && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, background: 'rgba(170,221,0,0.15)',
                          color: 'var(--lemon)', borderRadius: 4, padding: '1px 5px',
                        }}>votant</span>
                      )}
                    </div>
                  )}
                  {orgPickerOpen && myOrgs.length > 1 && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
                      background: 'var(--bg2)', borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--separator2)', overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 180,
                    }}>
                      {myOrgs.map(org => (
                        <button
                          key={org.id}
                          onClick={() => switchOrg(org)}
                          style={{
                            width: '100%', background: org.id === currentOrg.id ? 'var(--bg3)' : 'none',
                            border: 'none', padding: '12px 14px', cursor: 'pointer',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--label)' }}>{org.name}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: org.role === 'admin' ? 'var(--gold)' : 'var(--lemon)',
                            background: org.role === 'admin' ? 'rgba(255,214,10,0.12)' : 'rgba(170,221,0,0.12)',
                            borderRadius: 4, padding: '2px 6px',
                          }}>
                            {org.role === 'admin' ? 'Admin' : 'Votant'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="header-sub">
                {activeMatch ? activeMatch.label : 'Aucun match en cours'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{
                background: 'var(--bg3)', border: 'none', borderRadius: '10px',
                padding: '8px', cursor: 'pointer',
                color: 'var(--label2)', display: 'flex', alignItems: 'center',
                width: 36, height: 36, justifyContent: 'center',
              }}>
                {theme === 'dark' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {DEMO_MODE && <div className="demo-banner">Mode démo · Configure Supabase pour le multi-device</div>}

        {tab === 'vote' && guestStatus === 'checking' && (
          <EmptyState
            icon={<><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5" strokeLinecap="round"/></>}
            title="Vérification…"
            subtitle="Validation de ton lien d'invitation"
          />
        )}
        {tab === 'vote' && guestStatus === 'invalid' && (
          <EmptyState
            icon={<><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></>}
            title="Lien invalide"
            subtitle="Ce lien a déjà été utilisé ou n'existe pas."
          />
        )}

        {tab === 'vote' && guestStatus !== 'checking' && guestStatus !== 'invalid' && !votedThisSession && !hasVotedLocally(activeMatch?.id) && activeMatch && (activeMatch.phase || 'voting') === 'voting' && (
          <VoteView players={players} match={activeMatch} onVoted={handleVoted} guestName={guestName} onGuestVoted={handleGuestVoted} />
        )}
        {tab === 'vote' && guestStatus !== 'checking' && guestStatus !== 'invalid' && (votedThisSession || hasVotedLocally(activeMatch?.id)) && (activeMatch?.phase || 'voting') === 'voting' && (
          <EmptyState
            icon={<><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
            title="Vote enregistré"
            subtitle="Les résultats se mettent à jour en temps réel."
            action={{ label: 'Voir les résultats', onClick: () => setTab('results') }}
          />
        )}
        {tab === 'vote' && guestStatus !== 'checking' && guestStatus !== 'invalid' && !guestName && !activeMatch && !lastMatch && (
          <EmptyState
            icon={<><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></>}
            title="Pas de match ce soir"
            subtitle={isAdmin ? "Ouvre un match depuis l'onglet Admin pour lancer le vote." : "Ton capitaine n'a pas encore ouvert le vote."}
            action={isAdmin ? { label: 'Ouvrir un match', onClick: () => setTab('admin') } : null}
          />
        )}
        {tab === 'vote' && guestStatus !== 'checking' && guestStatus !== 'invalid' && !guestName && (
          (!activeMatch && lastMatch) ||
          (activeMatch && (activeMatch.phase || 'voting') !== 'voting')
        ) && (
          <EmptyState
            icon={<><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>}
            title="Vote terminé"
            subtitle="La période de vote est clôturée."
            action={{ label: 'Voir les résultats', onClick: () => setTab('results') }}
          />
        )}

        {tab === 'results' && (
          <ErrorBoundary label="Résultats">
            <ResultsView players={players} match={lastMatch} refreshKey={refreshKey} onMatchUpdate={loadMatch} isAdmin={isAdmin} isDark={theme === 'dark'} />
          </ErrorBoundary>
        )}
        {tab === 'stats' && (
          <ErrorBoundary label="Saison">
            <StatsView players={players} activeMatch={activeMatch} isAdmin={isAdmin} />
          </ErrorBoundary>
        )}
        {tab === 'admin' && isAdmin && (
          <ErrorBoundary label="Admin">
            <AdminView
              players={players}
              onPlayersChange={loadPlayers}
              activeMatch={activeMatch}
              onMatchChange={loadMatch}
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
          {
            id: 'vote',
            label: 'Vote',
            icon: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
          },
          {
            id: 'results',
            label: 'Résultats',
            icon: <path d="M18 20V10M12 20V4M6 20v-6"/>,
          },
          {
            id: 'stats',
            label: 'Saison',
            icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
          },
          ...(isAdmin ? [{
            id: 'admin',
            label: 'Admin',
            icon: <><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></>,
          }] : []),
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
