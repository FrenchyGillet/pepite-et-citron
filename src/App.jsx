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
import { LoadingBar }        from './components/LoadingBar.jsx';

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
  const [myOrgs,            setMyOrgs]            = useState([]);
  const [orgPickerOpen,     setOrgPickerOpen]     = useState(false);
  const [orgsResolved,      setOrgsResolved]      = useState(false);   // a-t-on tenté au moins une fois ?
  const [orgsLoadError,     setOrgsLoadError]     = useState(false);   // échec du dernier chargement

  // Ferme le org picker quand on clique à l'extérieur
  useEffect(() => {
    if (!orgPickerOpen) return;
    const close = (e) => {
      if (!e.target.closest('[data-org-picker]')) setOrgPickerOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [orgPickerOpen]);

  // ── Thème ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pepite_theme", theme);
  }, [theme]);

  // ── Initialisation Auth ───────────────────────────────────────────────────
  useEffect(() => {
    if (DEMO_MODE) return;

    // Sécurité : si le SDK Supabase ne répond pas, on sort du loading après 12 s
    // Couvre à la fois authLoading ET orgsResolved pour éviter tout chargement infini.
    const safetyTimer = setTimeout(() => {
      console.warn("bootstrap safety timeout — forcing all loading states off");
      setAuthLoading(false);
      if (!orgsResolvedRef.current) {
        orgsResolvedRef.current = true;
        setOrgsResolved(true);
        setOrgsLoadError(true);   // inconnu → afficher erreur+retry plutôt que OrgSetupView
      }
    }, 12000);

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

  // ── Chargement des orgs ───────────────────────────────────────────────────
  // useCallback pour éviter les stale closures dans bootstrap/onAuthChange.
  // currentOrgIdRef permet de lire l'id courant sans capturer currentOrg en closure.
  const currentOrgIdRef  = useRef(null);
  const orgsResolvedRef  = useRef(false);   // copie sync de orgsResolved pour les timers
  useEffect(() => { currentOrgIdRef.current = currentOrg?.id ?? null; }, [currentOrg?.id]);

  const loadOrgs = useCallback(async () => {
    setOrgsLoadError(false);
    try {
      const orgs = await api.getMyOrgs();
      setMyOrgs(orgs);
      if (orgs.length) {
        // Auto-sélectionne si 1 seul org; sinon garde le currentOrg si toujours valide
        const current = orgs.find(o => o.id === currentOrgIdRef.current) || orgs[0];
        setCurrentOrg(current);
        setCurrentOrgId(current.id);
        currentOrgIdRef.current = current.id;
        return current;
      }
      return null;      // Zéro orgs = l'utilisateur n'en a vraiment aucune
    } catch (err) {
      console.error("loadOrgs:", err);
      setOrgsLoadError(true);   // Erreur réseau / auth → ne PAS afficher OrgSetupView
      return null;
    } finally {
      orgsResolvedRef.current = true;
      setOrgsResolved(true);    // On a tenté au moins une fois
    }
  }, []);
  // Alias pour la compatibilité (bootstrap, onAuthChange)
  const loadOrg = loadOrgs;

  const switchOrg = useCallback((org) => {
    setCurrentOrg(org);
    setCurrentOrgId(org.id);
    setOrgPickerOpen(false);
    setActiveMatch(null);
    setLastMatch(null);
    setPlayers([]);
    setVotedThisSession(false);
    lastMatchIdRef.current = null;
  }, []);

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
          const match = await api.getMatchById(result.match_id);
          if (match?.org_id) {
            setCurrentOrgId(match.org_id);
            // Ne pas écraser currentOrg si le user a une session (l'admin peut voter sur son propre match)
            setCurrentOrg(prev => prev ?? { id: match.org_id, role: null });
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
      // Voter anonyme via lien ?org=slug — ne pas écraser un currentOrg déjà résolu
      // (un admin qui ouvre son propre lien doit garder son rôle admin)
      api.getOrgBySlug(orgSlug).then(org => {
        if (org) {
          setCurrentOrgId(org.id);
          setCurrentOrg(prev => prev ?? org);   // preserve si déjà résolu via session
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

  // Polling en phase de vote ET de dépouillement
  // (is_open devient false au dépouillement, mais on continue à poller
  //  pour que les spectateurs voient les révélations en temps réel)
  const matchIsActive = activeMatch?.is_open || activeMatch?.phase === "counting";
  useEffect(() => {
    if (!matchIsActive) return;
    const t = setInterval(loadMatch, 5000);
    return () => clearInterval(t);
  }, [matchIsActive]);

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

  // Admin = connecté avec une org dont le rôle N'EST PAS "voter" (ou pas encore défini).
  // - "admin" explicite → admin ✓
  // - undefined / null  → admin ✓ (rétrocompatibilité : migration pas encore appliquée)
  // - "voter" explicite → pas admin ✓
  const isAdmin = DEMO_MODE || (!!session && !!currentOrg && currentOrg.role !== "voter");

  // ── Détecte les liens de vote anonyme ────────────────────────────────────
  // ?org=slug ou ?guest=TOKEN → pas besoin de compte, on bypass le login
  const urlParams    = new URLSearchParams(window.location.search);
  const isVoterLink  = !DEMO_MODE && (urlParams.get("org") || urlParams.get("guest"));

  // ── États de chargement ────────────────────────────────────────────────────
  if (authLoading && !isVoterLink) {
    // Pour les liens de vote, on n'attend pas la résolution de session —
    // on affiche l'app tout de suite (le match se charge via currentOrg)
    return (
      <>
        <GlobalStyle />
        <LoadingBar />
        <LoadingScreen />
      </>
    );
  }

  // Login requis UNIQUEMENT pour les admins (pas de lien de vote dans l'URL)
  if (!DEMO_MODE && !session && !isVoterLink) {
    return (
      <>
        <GlobalStyle />
        <AuthView onAuth={(s) => setSession(s)} />
      </>
    );
  }

  // Session connue mais orgs pas encore résolues (bref moment en bootstrap)
  if (!DEMO_MODE && session && !orgsResolved && !isVoterLink) {
    return (
      <>
        <GlobalStyle />
        <LoadingBar />
        <LoadingScreen />
      </>
    );
  }

  // Erreur de chargement des orgs (réseau, auth…) → ne jamais afficher OrgSetupView !
  if (!DEMO_MODE && session && orgsResolved && orgsLoadError) {
    return (
      <>
        <GlobalStyle />
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
          <div style={{ background: "var(--bg2)", borderRadius: 16, padding: "32px 24px", maxWidth: 360, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: "var(--label)" }}>Impossible de charger tes équipes</div>
            <div style={{ fontSize: 14, color: "var(--label3)", marginBottom: 24, lineHeight: 1.6 }}>
              Erreur de connexion au serveur.<br />Vérifie ta connexion et réessaie.
            </div>
            <button className="btn btn-primary btn-full" onClick={() => { setOrgsResolved(false); loadOrgs(); }}>
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

  // OrgSetup : seulement pour les comptes connectés CONFIRMÉS sans équipe (pas d'erreur de chargement)
  if (!DEMO_MODE && session && orgsResolved && !orgsLoadError && !currentOrg) {
    return (
      <>
        <GlobalStyle />
        <OrgSetupView
          userEmail={session.user?.email}
          onOrgCreated={async (org) => {
            const orgWithRole = { ...org, role: "admin" };
            setCurrentOrg(orgWithRole);
            setCurrentOrgId(org.id);
            setMyOrgs([orgWithRole]);
            setOrgsResolved(true);
            setOrgsLoadError(false);
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
                <div style={{ position: "relative" }} data-org-picker>
                  {myOrgs.length > 1 ? (
                    <button
                      onClick={() => setOrgPickerOpen(v => !v)}
                      style={{
                        background: "none", border: "none", padding: 0,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                      }}
                    >
                      <span className="header-sub" style={{ color: "var(--gold)", fontWeight: 600 }}>
                        {currentOrg.name}
                      </span>
                      <span style={{ fontSize: 9, color: "var(--gold)", opacity: 0.7, marginTop: 1 }}>▼</span>
                      {currentOrg.role === "voter" && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, background: "rgba(170,221,0,0.15)",
                          color: "var(--lemon)", borderRadius: 4, padding: "1px 5px",
                        }}>votant</span>
                      )}
                    </button>
                  ) : (
                    <div className="header-sub" style={{ color: "var(--gold)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                      {currentOrg.name}
                      {currentOrg.role === "voter" && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, background: "rgba(170,221,0,0.15)",
                          color: "var(--lemon)", borderRadius: 4, padding: "1px 5px",
                        }}>votant</span>
                      )}
                    </div>
                  )}
                  {orgPickerOpen && myOrgs.length > 1 && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
                      background: "var(--bg2)", borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--separator2)", overflow: "hidden",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.3)", minWidth: 180,
                    }}>
                      {myOrgs.map(org => (
                        <button
                          key={org.id}
                          onClick={() => switchOrg(org)}
                          style={{
                            width: "100%", background: org.id === currentOrg.id ? "var(--bg3)" : "none",
                            border: "none", padding: "12px 14px", cursor: "pointer",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--label)" }}>{org.name}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: org.role === "admin" ? "var(--gold)" : "var(--lemon)",
                            background: org.role === "admin" ? "rgba(255,214,10,0.12)" : "rgba(170,221,0,0.12)",
                            borderRadius: 4, padding: "2px 6px",
                          }}>
                            {org.role === "admin" ? "Admin" : "Votant"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
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
              onGoToResults={() => setTab("results")}
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

function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 20,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>
        <span style={{ color: "#ffd60a" }}>Pépite</span>
        <span style={{ color: "rgba(235,235,245,0.3)" }}> & </span>
        <span style={{ color: "#aadd00" }}>Citron</span>
      </div>
      <div style={{
        width: 160, height: 3, background: "var(--bg3)", borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", background: "var(--gold)", borderRadius: 2,
          animation: "loadingShimmer 1.4s ease-in-out infinite",
        }} />
      </div>
      <style>{`
        @keyframes loadingShimmer {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
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
