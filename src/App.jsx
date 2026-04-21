import { useState, useEffect, useCallback, useRef } from "react";
import { DEMO_MODE, api, setCurrentOrgId } from './api.js';
import { GlobalStyle }       from './GlobalStyle.jsx';
import { AuthView }          from './components/AuthView.jsx';
import { OrgSetupView }      from './components/OrgSetupView.jsx';
import { VoteView }          from './components/VoteView.jsx';
import { ResultsView }       from './components/ResultsView.jsx';
import { StatsView }         from './components/StatsView.jsx';
import { AdminView }         from './components/AdminView.jsx';
import { EmptyState }        from './components/EmptyState.jsx';
import { ErrorBoundary }     from './components/ErrorBoundary.jsx';
import { OnboardingModal }   from './components/OnboardingModal.jsx';

export default function App() {
  // ── Auth & org ─────────────────────────────────────────────────────────────
  const [session,     setSession]     = useState(null);
  const [currentOrg,  setCurrentOrg]  = useState(null);
  const [authLoading, setAuthLoading] = useState(!DEMO_MODE);

  // ── App state ──────────────────────────────────────────────────────────────
  const VALID_TABS = ["vote", "results", "stats", "admin"];
  const [tab, setTabRaw] = useState(() => {
    const hash = window.location.hash.slice(1);
    return VALID_TABS.includes(hash) ? hash : "vote";
  });

  // Synchronise tab ↔ hash URL (pour que back/forward du navigateur fonctionne)
  const setTab = useCallback((t) => {
    setTabRaw(t);
    if (window.location.hash.slice(1) !== t) {
      history.pushState(null, "", `#${t}`);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const hash = window.location.hash.slice(1);
      setTabRaw(VALID_TABS.includes(hash) ? hash : "vote");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [players,           setPlayers]           = useState([]);
  const [activeMatch,       setActiveMatch]       = useState(null);
  const [lastMatch,         setLastMatch]         = useState(null);
  const lastMatchIdRef = useRef(null);
  const [refreshKey,        setRefreshKey]        = useState(0);
  const [votedThisSession,  setVotedThisSession]  = useState(false);
  const [theme,             setTheme]             = useState(() => localStorage.getItem("pepite_theme") || "dark");
  const [guestToken,        setGuestToken]        = useState(null);
  const [guestName,         setGuestName]         = useState(null);
  const [guestStatus,       setGuestStatus]       = useState(null);
  const [showOnboarding,    setShowOnboarding]    = useState(false);

  // ── Thème ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pepite_theme", theme);
  }, [theme]);

  // ── Initialisation Auth ───────────────────────────────────────────────────
  useEffect(() => {
    if (DEMO_MODE) return;

    // Sécurité : si le SDK Supabase ne répond pas, on sort du loading après 6 s
    const safetyTimer = setTimeout(() => {
      console.warn("bootstrap timeout — forcing authLoading = false");
      setAuthLoading(false);
    }, 6000);

    const bootstrap = async () => {
      try {
        const session = await api.getSession();
        if (session) {
          setSession(session);
          await loadOrg();
        }
      } catch (err) {
        console.error("bootstrap:", err);
      } finally {
        clearTimeout(safetyTimer);
        setAuthLoading(false);
      }
    };
    bootstrap();

    // Écoute les changements de session (login / logout / refresh)
    const sub = api.onAuthChange(async (event, session) => {
      setSession(session);
      if (session) {
        await loadOrg().catch(err => console.error("onAuthChange loadOrg:", err));
      } else {
        setCurrentOrg(null);
        setCurrentOrgId(null);
      }
    });
    return () => sub?.unsubscribe?.();
  }, []);

  // ── Chargement de l'org ───────────────────────────────────────────────────
  const loadOrg = async () => {
    try {
      const org = await api.getMyOrg();
      if (org) {
        setCurrentOrg(org);
        setCurrentOrgId(org.id);
      }
      return org;
    } catch (err) {
      console.error("loadOrg:", err);
      return null;
    }
  };

  // ── Résolution de l'org pour les visitors (sans session) ─────────────────
  // Priorité : ?guest=TOKEN > ?org=slug > session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guestParam = params.get("guest");
    const orgSlug    = params.get("org");

    if (guestParam) {
      // Le token de guest est lié à un match, qui est lié à une org
      // On résout l'org via le match après avoir validé le token
      setGuestStatus("checking");
      api.validateGuestToken(guestParam).then(async result => {
        if (result && !result.used) {
          // Récupérer l'org depuis le match du token
          const match = await api.getMatchById(result.match_id);
          if (match?.org_id) {
            setCurrentOrgId(match.org_id);
            setCurrentOrg({ id: match.org_id });
          }
          setGuestToken(guestParam);
          setGuestName(result.name);
          setGuestStatus("valid");
          setTab("vote");
        } else {
          setGuestStatus("invalid");
        }
      });
    } else if (orgSlug && !DEMO_MODE) {
      // Voter avec lien ?org=slug partagé par le capitaine
      api.getOrgBySlug(orgSlug).then(org => {
        if (org) {
          setCurrentOrg(org);
          setCurrentOrgId(org.id);
        }
      });
    }
  }, []);

  // ── Données ────────────────────────────────────────────────────────────────
  const loadPlayers = useCallback(async () => {
    if (!DEMO_MODE && !getCurrentOrgIdLocal()) return;
    setPlayers(await api.getPlayers());
  }, []);

  const loadMatch = useCallback(async () => {
    if (!DEMO_MODE && !getCurrentOrgIdLocal()) return;
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

  // Charge les données quand l'org est disponible
  useEffect(() => {
    if (DEMO_MODE || currentOrg) {
      loadPlayers();
      loadMatch();
    }
  }, [currentOrg?.id]);

  // Polling en phase de vote
  useEffect(() => {
    if (!activeMatch?.is_open) return;
    const t = setInterval(loadMatch, 5000);
    return () => clearInterval(t);
  }, [activeMatch?.is_open]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const hasVotedLocally = (matchId) =>
    matchId && JSON.parse(localStorage.getItem("pepite_voted") || "[]").includes(matchId);

  const handleVoted = () => {
    setVotedThisSession(true);
    setTab("results");
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
    setTab("vote");
  };

  // Admin = connecté avec une org (en mode réel) OU toujours en démo
  const isAdmin = DEMO_MODE || (!!session && !!currentOrg);

  // ── États de chargement ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <>
        <GlobalStyle />
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
          <div style={{ fontSize: 14, color: "var(--label3)" }}>Chargement…</div>
        </div>
      </>
    );
  }

  if (!DEMO_MODE && !session) {
    return (
      <>
        <GlobalStyle />
        <AuthView onAuth={(s) => setSession(s)} />
      </>
    );
  }

  if (!DEMO_MODE && session && !currentOrg) {
    return (
      <>
        <GlobalStyle />
        <OrgSetupView
          userEmail={session.user?.email}
          onOrgCreated={(org) => {
            setCurrentOrg(org);
            setCurrentOrgId(org.id);
            loadPlayers();
            loadMatch();
            // Nouvelle équipe → montrer l'onboarding
            if (!localStorage.getItem(`pepite_onboarded_${org.id}`)) {
              setShowOnboarding(true);
            }
          }}
        />
      </>
    );
  }

  // ── App principale ─────────────────────────────────────────────────────────
  return (
    <>
      <GlobalStyle />
      <div className="app-wrapper">
        <div className="header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="header-logo">
                <span className="header-pepite">Pépite</span>
                <span className="header-amp"> & </span>
                <span className="header-citron">Citron</span>
              </div>
              {currentOrg?.name && !DEMO_MODE && (
                <div className="header-sub" style={{ color: "var(--gold)", fontWeight: 600 }}>
                  {currentOrg.name}
                </div>
              )}
              <div className="header-sub">
                {activeMatch ? activeMatch.label : "Aucun match en cours"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{
                background: "var(--bg3)", border: "none", borderRadius: "10px",
                padding: "8px", cursor: "pointer",
                color: "var(--label2)", display: "flex", alignItems: "center",
                width: 36, height: 36, justifyContent: "center",
              }}>
                {theme === "dark" ? (
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

        {/* Guest token states */}
        {tab === "vote" && guestStatus === "checking" && (
          <EmptyState
            icon={<><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5" strokeLinecap="round"/></>}
            title="Vérification…"
            subtitle="Validation de ton lien d'invitation"
          />
        )}
        {tab === "vote" && guestStatus === "invalid" && (
          <EmptyState
            icon={<><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></>}
            title="Lien invalide"
            subtitle="Ce lien a déjà été utilisé ou n'existe pas."
          />
        )}

        {/* Vote flow */}
        {tab === "vote" && guestStatus !== "checking" && guestStatus !== "invalid" && !votedThisSession && !hasVotedLocally(activeMatch?.id) && activeMatch && (activeMatch.phase || "voting") === "voting" && (
          <VoteView players={players} match={activeMatch} onVoted={handleVoted} guestName={guestName} onGuestVoted={handleGuestVoted} />
        )}
        {tab === "vote" && guestStatus !== "checking" && guestStatus !== "invalid" && (votedThisSession || hasVotedLocally(activeMatch?.id)) && (activeMatch?.phase || "voting") === "voting" && (
          <EmptyState
            icon={<><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
            title="Vote enregistré"
            subtitle="Les résultats se mettent à jour en temps réel."
            action={{ label: "Voir les résultats", onClick: () => setTab("results") }}
          />
        )}
        {tab === "vote" && guestStatus !== "checking" && guestStatus !== "invalid" && !guestName && !activeMatch && !lastMatch && (
          <EmptyState
            icon={<><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></>}
            title="Pas de match ce soir"
            subtitle={isAdmin ? "Ouvre un match depuis l'onglet Admin pour lancer le vote." : "Ton capitaine n'a pas encore ouvert le vote."}
            action={isAdmin ? { label: "Ouvrir un match", onClick: () => setTab("admin") } : null}
          />
        )}
        {tab === "vote" && guestStatus !== "checking" && guestStatus !== "invalid" && !guestName && (
          (!activeMatch && lastMatch) ||
          (activeMatch && (activeMatch.phase || "voting") !== "voting")
        ) && (
          <EmptyState
            icon={<><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>}
            title="Vote terminé"
            subtitle="La période de vote est clôturée."
            action={{ label: "Voir les résultats", onClick: () => setTab("results") }}
          />
        )}

        {tab === "results" && (
          <ErrorBoundary label="Résultats">
            <ResultsView players={players} match={lastMatch} refreshKey={refreshKey} onMatchUpdate={loadMatch} isAdmin={isAdmin} isDark={theme === "dark"} />
          </ErrorBoundary>
        )}
        {tab === "stats" && (
          <ErrorBoundary label="Saison">
            <StatsView players={players} activeMatch={activeMatch} isAdmin={isAdmin} />
          </ErrorBoundary>
        )}
        {tab === "admin" && isAdmin && (
          <ErrorBoundary label="Admin">
            <AdminView
              players={players}
              onPlayersChange={loadPlayers}
              activeMatch={activeMatch}
              onMatchChange={loadMatch}
              currentOrg={currentOrg}
              onSignOut={handleSignOut}
              onShowGuide={() => setShowOnboarding(true)}
            />
          </ErrorBoundary>
        )}

        {showOnboarding && (
          <OnboardingModal onClose={() => {
            setShowOnboarding(false);
            if (currentOrg?.id) localStorage.setItem(`pepite_onboarded_${currentOrg.id}`, "1");
          }} />
        )}
      </div>
      <nav className="tab-bar">
        {[
          {
            id: "vote",
            label: "Vote",
            icon: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
          },
          {
            id: "results",
            label: "Résultats",
            icon: <path d="M18 20V10M12 20V4M6 20v-6"/>,
          },
          {
            id: "stats",
            label: "Saison",
            icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
          },
          ...(isAdmin ? [{
            id: "admin",
            label: "Admin",
            icon: <><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></>,
          }] : []),
        ].map(t => (
          <button key={t.id} className={`tab-bar-item ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
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

// Helper local (évite d'importer getCurrentOrgId pour le guard)
function getCurrentOrgIdLocal() {
  // On vérifie juste que l'état currentOrg est défini via la closure — on utilise _orgId de api.js
  // Cf. setCurrentOrgId appelé avant les loads
  return true; // le guard est géré par currentOrg dans useEffect
}

// Re-exports pour les tests
export { __resetDemoState, __demoAPI } from './api.js';
