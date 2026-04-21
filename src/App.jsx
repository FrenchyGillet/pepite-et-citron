import { useState, useEffect, useCallback, useRef } from "react";
import { DEMO_MODE, api, setCurrentOrgId } from './api.js';
import { GlobalStyle } from './GlobalStyle.jsx';
import { AuthView }      from './components/AuthView.jsx';
import { OrgSetupView }  from './components/OrgSetupView.jsx';
import { VoteView }      from './components/VoteView.jsx';
import { ResultsView }   from './components/ResultsView.jsx';
import { StatsView }     from './components/StatsView.jsx';
import { AdminView }     from './components/AdminView.jsx';

export default function App() {
  // ── Auth & org ─────────────────────────────────────────────────────────────
  const [session,     setSession]     = useState(null);
  const [currentOrg,  setCurrentOrg]  = useState(null);
  const [authLoading, setAuthLoading] = useState(!DEMO_MODE);

  // ── App state ──────────────────────────────────────────────────────────────
  const [tab,               setTab]               = useState("vote");
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

  // ── Thème ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pepite_theme", theme);
  }, [theme]);

  // ── Initialisation Auth ───────────────────────────────────────────────────
  useEffect(() => {
    if (DEMO_MODE) return;

    const bootstrap = async () => {
      const session = await api.getSession();
      if (session) {
        setSession(session);
        await loadOrg();
      }
      setAuthLoading(false);
    };
    bootstrap();

    // Écoute les changements de session (login / logout / refresh)
    const sub = api.onAuthChange(async (event, session) => {
      setSession(session);
      if (session) {
        await loadOrg();
      } else {
        setCurrentOrg(null);
        setCurrentOrgId(null);
      }
    });
    return () => sub?.unsubscribe?.();
  }, []);

  // ── Chargement de l'org ───────────────────────────────────────────────────
  const loadOrg = async () => {
    const org = await api.getMyOrg();
    if (org) {
      setCurrentOrg(org);
      setCurrentOrgId(org.id);
    }
    return org;
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
              <div className="header-sub">
                {currentOrg?.name && !DEMO_MODE
                  ? <span style={{ color: "var(--gold)", fontWeight: 600 }}>{currentOrg.name}</span>
                  : null
                }
                {currentOrg?.name && !DEMO_MODE && activeMatch ? " · " : null}
                {activeMatch ? activeMatch.label : ((!currentOrg?.name || DEMO_MODE) ? "Aucun match en cours" : "Aucun match en cours")}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{
                background: "var(--bg3)", border: "none", borderRadius: "var(--radius-sm)",
                padding: "7px 10px", fontSize: 16, cursor: "pointer", lineHeight: 1,
                color: "var(--label2)", marginTop: 2,
              }}>{theme === "dark" ? "☀️" : "🌙"}</button>
            </div>
          </div>
        </div>

        <nav className="nav">
          {[
            { id: "vote",    label: "Vote"      },
            { id: "results", label: "Résultats" },
            { id: "stats",   label: "Saison"    },
            ...(isAdmin ? [{ id: "admin", label: "Admin" }] : []),
          ].map(t => (
            <button key={t.id} className={`nav-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        {DEMO_MODE && <div className="demo-banner">Mode démo · Configure Supabase pour le multi-device</div>}

        {/* Guest token states */}
        {tab === "vote" && guestStatus === "checking" && (
          <div className="content"><div className="empty">Vérification du lien…</div></div>
        )}
        {tab === "vote" && guestStatus === "invalid" && (
          <div className="content"><div className="empty">🔒 Ce lien est invalide ou a déjà été utilisé.</div></div>
        )}

        {/* Vote flow */}
        {tab === "vote" && guestStatus !== "checking" && guestStatus !== "invalid" && !votedThisSession && !hasVotedLocally(activeMatch?.id) && activeMatch && (activeMatch.phase || "voting") === "voting" && (
          <VoteView players={players} match={activeMatch} onVoted={handleVoted} guestName={guestName} onGuestVoted={handleGuestVoted} />
        )}
        {tab === "vote" && guestStatus !== "checking" && guestStatus !== "invalid" && (votedThisSession || hasVotedLocally(activeMatch?.id)) && (activeMatch?.phase || "voting") === "voting" && (
          <div className="content" style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Vote enregistré</div>
            <div style={{ fontSize: 14, color: "var(--label3)", marginBottom: 24 }}>
              Les résultats se mettent à jour en temps réel.
            </div>
            <button className="btn btn-primary" onClick={() => setTab("results")}>Voir les résultats</button>
          </div>
        )}
        {tab === "vote" && guestStatus !== "checking" && guestStatus !== "invalid" && !guestName && !activeMatch && !lastMatch && (
          <div className="content"><div className="empty">Aucun vote en cours.<br />{isAdmin ? "Ouvrez un match dans l'onglet Admin." : "L'admin doit ouvrir un match."}</div></div>
        )}
        {tab === "vote" && guestStatus !== "checking" && guestStatus !== "invalid" && !guestName && (
          (!activeMatch && lastMatch) ||
          (activeMatch && (activeMatch.phase || "voting") !== "voting")
        ) && (
          <div className="content"><div className="empty">🔒 La période de vote est terminée.<br />Consulte l'onglet Résultats.</div></div>
        )}

        {tab === "results" && <ResultsView players={players} match={lastMatch} refreshKey={refreshKey} onMatchUpdate={loadMatch} />}
        {tab === "stats"   && <StatsView players={players} activeMatch={activeMatch} isAdmin={isAdmin} />}
        {tab === "admin"   && isAdmin && (
          <AdminView
            players={players}
            onPlayersChange={loadPlayers}
            activeMatch={activeMatch}
            onMatchChange={loadMatch}
            currentOrg={currentOrg}
            onSignOut={handleSignOut}
          />
        )}
      </div>
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
