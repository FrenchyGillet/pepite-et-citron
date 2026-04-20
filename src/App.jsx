import { useState, useEffect, useCallback, useRef } from "react";
import { DEMO_MODE, api } from './api.js';
import { GlobalStyle } from './GlobalStyle.jsx';
import { VoteView } from './components/VoteView.jsx';
import { ResultsView } from './components/ResultsView.jsx';
import { StatsView } from './components/StatsView.jsx';
import { AdminView } from './components/AdminView.jsx';

export default function App() {
  const [tab,              setTab]              = useState("vote");
  const [players,          setPlayers]          = useState([]);
  const [activeMatch,      setActiveMatch]      = useState(null);
  const [lastMatch,        setLastMatch]        = useState(null); // persiste même après fermeture
  const lastMatchIdRef = useRef(null);
  const [refreshKey,       setRefreshKey]       = useState(0);
  const [votedThisSession, setVotedThisSession] = useState(false);
  const [theme,            setTheme]            = useState(() => localStorage.getItem("pepite_theme") || "dark");
  const [guestToken,       setGuestToken]       = useState(null);
  const [guestName,        setGuestName]        = useState(null);
  const [guestStatus,      setGuestStatus]      = useState(null); // null | "valid" | "invalid" | "checking"

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pepite_theme", theme);
  }, [theme]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("guest");
    if (!token) return;
    setGuestStatus("checking");
    api.validateGuestToken(token).then(result => {
      if (result && !result.used) {
        setGuestToken(token);
        setGuestName(result.name);
        setGuestStatus("valid");
        setTab("vote");
      } else {
        setGuestStatus("invalid");
        setTab("vote");
      }
    });
  }, []);

  const loadPlayers = useCallback(async () => { setPlayers(await api.getPlayers()); }, []);
  const loadMatch   = useCallback(async () => {
    const m = await api.getActiveMatch();
    setActiveMatch(m);
    if (m) {
      setLastMatch(m);
      lastMatchIdRef.current = m.id;
    } else if (lastMatchIdRef.current) {
      // Match vient d'être fermé — re-fetch pour obtenir phase:"closed"
      const closed = await api.getMatchById(lastMatchIdRef.current);
      if (closed) setLastMatch(closed);
    }
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => { loadPlayers(); loadMatch(); }, []);

  useEffect(() => {
    if (!activeMatch?.is_open) return;
    const t = setInterval(loadMatch, 5000);
    return () => clearInterval(t);
  }, [activeMatch?.is_open]);

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
                {activeMatch ? activeMatch.label : "Aucun match en cours"}
              </div>
            </div>
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{
              background: "var(--bg3)", border: "none", borderRadius: "var(--radius-sm)",
              padding: "7px 10px", fontSize: 16, cursor: "pointer", lineHeight: 1,
              color: "var(--label2)", marginTop: 2,
            }}>{theme === "dark" ? "☀️" : "🌙"}</button>
          </div>
        </div>

        <nav className="nav">
          {[
            { id: "vote",    label: "Vote"      },
            { id: "results", label: "Résultats" },
            { id: "stats",   label: "Saison"    },
            { id: "admin",   label: "Admin"     },
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

        {/* Normal + guest vote flow */}
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
          <div className="content"><div className="empty">Aucun vote en cours.<br />L'admin doit ouvrir un match.</div></div>
        )}
        {tab === "vote" && guestStatus !== "checking" && guestStatus !== "invalid" && !guestName && (
          (!activeMatch && lastMatch) ||
          (activeMatch && (activeMatch.phase || "voting") !== "voting")
        ) && (
          <div className="content"><div className="empty">🔒 La période de vote est terminée.<br />Consulte l'onglet Résultats.</div></div>
        )}

        {tab === "results" && <ResultsView players={players} match={lastMatch} refreshKey={refreshKey} onMatchUpdate={loadMatch} />}
        {tab === "stats"   && <StatsView players={players} />}
        {tab === "admin"   && <AdminView players={players} onPlayersChange={loadPlayers} activeMatch={activeMatch} onMatchChange={loadMatch} />}
      </div>
    </>
  );
}

// Re-exports for test files that import from '../App.jsx'
export { __resetDemoState, __demoAPI } from './api.js';
