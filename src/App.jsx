import { useState, useEffect, useCallback } from "react";

// ============================================================
// CONFIGURATION — variables d'environnement Vite
// ============================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://VOTRE_PROJET.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "VOTRE_CLE_ANON";
const ADMIN_PASSWORD = "hockeyadmin";

// ============================================================
// Supabase client minimal (sans SDK)
// ============================================================
const supabase = {
  async from(table) {
    const base = `${SUPABASE_URL}/rest/v1/${table}`;
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
    return {
      async select(cols = "*", opts = {}) {
        let url = `${base}?select=${cols}`;
        if (opts.filter) url += `&${opts.filter}`;
        if (opts.order) url += `&order=${opts.order}`;
        const r = await fetch(url, { headers });
        return r.json();
      },
      async insert(data) {
        const r = await fetch(base, { method: "POST", headers, body: JSON.stringify(data) });
        return r.json();
      },
      async update(data, filter) {
        const r = await fetch(`${base}?${filter}`, { method: "PATCH", headers, body: JSON.stringify(data) });
        return r.json();
      },
      async delete(filter) {
        const r = await fetch(`${base}?${filter}`, { method: "DELETE", headers });
        return r.ok;
      },
    };
  },
};

// ============================================================
// Styles — Apple Dark Mode
// ============================================================
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:           #000000;
      --bg2:          #1c1c1e;
      --bg3:          #2c2c2e;
      --bg4:          #3a3a3c;
      --separator:    rgba(255,255,255,0.08);
      --separator2:   rgba(255,255,255,0.12);
      --label:        #ffffff;
      --label2:       rgba(235,235,245,0.6);
      --label3:       rgba(235,235,245,0.3);
      --label4:       rgba(235,235,245,0.18);
      --gold:         #ffd60a;
      --gold-dim:     rgba(255,214,10,0.15);
      --gold-subtle:  rgba(255,214,10,0.08);
      --lemon:        #aadd00;
      --lemon-dim:    rgba(170,221,0,0.15);
      --lemon-subtle: rgba(170,221,0,0.08);
      --green:        #30d158;
      --green-dim:    rgba(48,209,88,0.15);
      --red:          #ff453a;
      --red-dim:      rgba(255,69,58,0.12);
      --radius-sm: 8px;
      --radius:    12px;
      --radius-lg: 16px;
    }

    body {
      background: var(--bg);
      color: var(--label);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      font-size: 15px;
      -webkit-font-smoothing: antialiased;
    }

    button { font-family: inherit; cursor: pointer; border: none; transition: all 0.15s ease; }

    input, textarea {
      font-family: inherit;
      background: var(--bg3);
      border: none;
      color: var(--label);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      font-size: 15px;
      outline: none;
      width: 100%;
      -webkit-font-smoothing: antialiased;
    }
    input::placeholder, textarea::placeholder { color: var(--label3); }
    textarea { resize: none; }

    .app-wrapper {
      max-width: 430px;
      margin: 0 auto;
      min-height: 100vh;
      padding-bottom: 100px;
    }

    /* HEADER */
    .header {
      padding: 16px 20px 12px;
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--separator);
    }
    .header-logo { display: flex; align-items: center; gap: 5px; }
    .header-pepite { font-size: 22px; font-weight: 700; color: var(--gold); letter-spacing: -0.3px; }
    .header-amp    { font-size: 16px; font-weight: 300; color: var(--label3); }
    .header-citron { font-size: 22px; font-weight: 700; color: var(--lemon); letter-spacing: -0.3px; }
    .header-sub    { font-size: 12px; color: var(--label3); margin-top: 2px; }

    /* NAV */
    .nav {
      display: flex;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--separator);
      position: sticky;
      top: 65px;
      z-index: 99;
    }
    .nav-btn {
      flex: 1; padding: 11px 4px;
      background: transparent;
      color: var(--label3);
      font-size: 11px; font-weight: 500;
      letter-spacing: 0.03em;
      border-bottom: 1.5px solid transparent;
    }
    .nav-btn.active { color: var(--label); border-bottom-color: var(--label2); }

    /* CONTENT */
    .content { padding: 16px; }

    /* GROUPED LIST */
    .group {
      background: var(--bg2);
      border-radius: var(--radius-lg);
      overflow: hidden;
      margin-bottom: 12px;
    }
    .section-label {
      font-size: 12px; font-weight: 600;
      color: var(--label3);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 6px;
    }
    .row {
      display: flex; align-items: center; gap: 12px;
      padding: 13px 16px;
      border-bottom: 1px solid var(--separator);
      min-height: 52px;
    }
    .row:last-child { border-bottom: none; }
    .row-icon {
      width: 30px; height: 30px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }
    .row-icon.gold   { background: var(--gold-dim);  }
    .row-icon.lemon  { background: var(--lemon-dim); }
    .row-icon.green  { background: var(--green-dim); }
    .row-icon.red    { background: var(--red-dim);   }
    .row-body { flex: 1; min-width: 0; }
    .row-title { font-size: 15px; font-weight: 500; }
    .row-sub   { font-size: 12px; color: var(--label3); margin-top: 1px; }
    .row-value { font-size: 17px; font-weight: 600; }
    .row-value.gold  { color: var(--gold);  }
    .row-value.lemon { color: var(--lemon); }

    /* BUTTONS */
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: 6px; border-radius: var(--radius-sm);
      font-size: 15px; font-weight: 600; padding: 13px 20px;
    }
    .btn-primary   { background: var(--label); color: var(--bg); }
    .btn-secondary { background: var(--bg3); color: var(--label); }
    .btn-danger    { background: var(--red-dim); color: var(--red); border: 1px solid rgba(255,69,58,0.15); }
    .btn-full { width: 100%; }
    .btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* PLAYER GRID */
    .player-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 1px; background: var(--separator);
      border-radius: var(--radius-lg); overflow: hidden; margin: 8px 0;
    }
    .player-chip {
      padding: 14px 12px; background: var(--bg2);
      color: var(--label2); font-size: 14px; font-weight: 500;
      cursor: pointer; text-align: left; border: none;
      transition: background 0.12s;
    }
    .player-chip:active     { background: var(--bg3); }
    .player-chip.sel-1st    { background: var(--gold-subtle);  color: var(--gold);               }
    .player-chip.sel-2nd    { background: var(--gold-subtle);  color: rgba(255,214,10,0.6);       }
    .player-chip.sel-lemon  { background: var(--lemon-subtle); color: var(--lemon);               }

    /* STEP BAR */
    .step-bar { display: flex; gap: 4px; margin-bottom: 16px; }
    .step-seg { flex: 1; height: 3px; border-radius: 2px; background: var(--bg3); transition: background 0.3s; }
    .step-seg.done   { background: var(--label2); }
    .step-seg.active { background: var(--label3); }

    /* SCORE BAR */
    .score-bar-wrap { flex-shrink: 0; width: 64px; height: 3px; background: var(--bg3); border-radius: 2px; overflow: hidden; }
    .score-bar { height: 100%; border-radius: 2px; transition: width 0.5s ease; }

    /* COMMENT */
    .comment {
      padding: 9px 16px; border-top: 1px solid var(--separator);
      font-size: 13px; color: var(--label3); font-style: italic; line-height: 1.4;
    }

    /* BADGES & TAGS */
    .badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-open   { background: var(--green-dim); color: var(--green); }
    .badge-closed { background: var(--bg3); color: var(--label3); }
    .tag { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 5px; font-size: 11px; font-weight: 600; }
    .tag-gold  { background: var(--gold-dim);  color: var(--gold);  }
    .tag-lemon { background: var(--lemon-dim); color: var(--lemon); }
    .tag-dim   { background: var(--bg3); color: var(--label3); cursor: pointer; }

    /* TOAST */
    .toast {
      position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
      background: var(--bg3); color: var(--label);
      padding: 11px 22px; border-radius: 24px;
      font-weight: 500; font-size: 14px; z-index: 999;
      border: 1px solid var(--separator2); white-space: nowrap;
      animation: toastIn 0.25s ease;
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(-50%) translateY(8px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0);   }
    }
    @keyframes livePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.35; transform: scale(0.75); }
    }
    @keyframes revealPop {
      0%   { opacity: 0; transform: translateY(6px) scale(0.97); }
      100% { opacity: 1; transform: translateY(0)   scale(1);    }
    }

    .demo-banner {
      background: rgba(255,214,10,0.06);
      border-bottom: 1px solid rgba(255,214,10,0.1);
      padding: 7px 16px; font-size: 12px;
      color: rgba(255,214,10,0.5); text-align: center;
    }

    .flex         { display: flex; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .gap-8  { gap: 8px; }
    .mt-4   { margin-top: 4px;  }
    .mt-8   { margin-top: 8px;  }
    .mt-12  { margin-top: 12px; }
    .mt-16  { margin-top: 16px; }
    .mb-4   { margin-bottom: 4px;  }
    .mb-8   { margin-bottom: 8px;  }
    .mb-12  { margin-bottom: 12px; }
    .empty  { text-align: center; color: var(--label3); padding: 60px 20px; font-size: 14px; line-height: 1.6; }

    /* LIGHT MODE */
    [data-theme="light"] {
      --bg:           #f2f2f7;
      --bg2:          #ffffff;
      --bg3:          #e5e5ea;
      --bg4:          #d1d1d6;
      --separator:    rgba(0,0,0,0.08);
      --separator2:   rgba(0,0,0,0.12);
      --label:        #000000;
      --label2:       rgba(60,60,67,0.6);
      --label3:       rgba(60,60,67,0.35);
      --label4:       rgba(60,60,67,0.18);
      color-scheme: light;
    }
    [data-theme="light"] body { background: #f2f2f7; }
    [data-theme="light"] .header,
    [data-theme="light"] .nav  { background: rgba(242,242,247,0.88); border-bottom-color: rgba(0,0,0,0.08); }
    [data-theme="light"] input,
    [data-theme="light"] textarea { background: var(--bg3); color: var(--label); }
    [data-theme="light"] .demo-banner { background: rgba(255,180,0,0.08); color: rgba(160,100,0,0.7); border-color: rgba(255,180,0,0.15); }
  `}</style>
);

// ============================================================
// DEMO MODE
// ============================================================
const DEMO_MODE = SUPABASE_URL.includes("VOTRE_PROJET");

let demoState = {
  players: [
    { id: 1, name: "Antoine" }, { id: 2, name: "Baptiste" },
    { id: 3, name: "Clément" }, { id: 4, name: "David" },
    { id: 5, name: "Étienne" }, { id: 6, name: "Florian" },
    { id: 7, name: "Guillaume" }, { id: 8, name: "Hugo" },
    { id: 9, name: "Julien" }, { id: 10, name: "Kevin" },
  ],
  matches: [], votes: [], teams: [], guestTokens: [], nextId: 100, currentSeason: 1,
};

const demoAPI = {
  getPlayers:     () => Promise.resolve([...demoState.players]),
  addPlayer:      (name) => { const p = { id: demoState.nextId++, name }; demoState.players.push(p); return Promise.resolve(p); },
  removePlayer:   (id)   => { demoState.players = demoState.players.filter(p => p.id !== id); return Promise.resolve(true); },
  getActiveMatch: ()     => Promise.resolve(demoState.matches.find(m => m.is_open) || null),
  getMatches:     ()     => Promise.resolve([...demoState.matches].reverse()),
  createMatch: (label, presentIds, teamId, season) => {
    const m = { id: demoState.nextId++, label, present_ids: presentIds, is_open: true, phase: "voting", reveal_order: [], revealed_count: 0, season: season || demoState.currentSeason, team_id: teamId || null, created_at: new Date().toISOString() };
    demoState.matches.push(m); return Promise.resolve(m);
  },
  closeMatch:       (id) => { const m = demoState.matches.find(m => m.id === id); if (m) { m.is_open = false; m.phase = "closed"; } return Promise.resolve(true); },
  startCounting:    (id, order) => { const m = demoState.matches.find(m => m.id === id); if (m) { m.phase = "counting"; m.reveal_order = order; m.revealed_count = 0; } return Promise.resolve(true); },
  revealNext:       (id, count) => { const m = demoState.matches.find(m => m.id === id); if (m) m.revealed_count = count; return Promise.resolve(true); },
  updateMatch:      (id, data) => { const m = demoState.matches.find(m => m.id === id); if (m) Object.assign(m, data); return Promise.resolve(true); },
  deleteMatch:      (id) => { demoState.matches = demoState.matches.filter(m => m.id !== id); demoState.votes = demoState.votes.filter(v => v.match_id !== id); return Promise.resolve(true); },
  getCurrentSeason: () => Promise.resolve(demoState.currentSeason),
  advanceSeason:    () => { demoState.currentSeason++; return Promise.resolve(demoState.currentSeason); },
  hasVoted:    (matchId, voterName) => Promise.resolve(demoState.votes.some(v => v.match_id === matchId && v.voter_name === voterName)),
  submitVote:  (vote) => { demoState.votes.push({ ...vote, id: demoState.nextId++ }); return Promise.resolve(true); },
  getVotes:    (matchId) => Promise.resolve(demoState.votes.filter(v => v.match_id === matchId)),
  getAllVotes:  ()        => Promise.resolve([...demoState.votes]),
  getTeams:    ()        => Promise.resolve([...demoState.teams]),
  createTeam:  (name, playerIds) => { const t = { id: demoState.nextId++, name, player_ids: playerIds }; demoState.teams.push(t); return Promise.resolve(t); },
  deleteTeam:  (id)      => { demoState.teams = demoState.teams.filter(t => t.id !== id); return Promise.resolve(true); },
  createGuestToken: (name, matchId) => {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    demoState.guestTokens.push({ id: demoState.nextId++, token, name, match_id: matchId, used: false, created_at: new Date().toISOString() });
    return Promise.resolve(token);
  },
  getGuestTokens:     (matchId) => Promise.resolve(demoState.guestTokens.filter(t => t.match_id === matchId)),
  validateGuestToken: (token)   => Promise.resolve(demoState.guestTokens.find(t => t.token === token) || null),
  useGuestToken:      (token)   => { const t = demoState.guestTokens.find(t => t.token === token); if (t) t.used = true; return Promise.resolve(true); },
  deleteGuestToken:   (id)      => { demoState.guestTokens = demoState.guestTokens.filter(t => t.id !== id); return Promise.resolve(true); },
};

const realAPI = {
  getPlayers:     async () => { const db = await supabase.from("players"); return db.select("*", { order: "name.asc" }); },
  addPlayer:      async (name) => { const db = await supabase.from("players"); const r = await db.insert({ name }); return r[0]; },
  removePlayer:   async (id)   => { const db = await supabase.from("players"); return db.delete(`id=eq.${id}`); },
  getActiveMatch: async () => { const db = await supabase.from("matches"); const r = await db.select("*", { filter: "is_open=eq.true", order: "created_at.desc" }); return r[0] || null; },
  getMatches:     async () => { const db = await supabase.from("matches"); return db.select("*", { order: "created_at.desc" }); },
  createMatch:    async (label, presentIds, teamId, season) => { const db = await supabase.from("matches"); const r = await db.insert({ label, present_ids: presentIds, is_open: true, phase: "voting", team_id: teamId || null, season: season || 1 }); return r[0]; },
  closeMatch:     async (id) => { const db = await supabase.from("matches"); return db.update({ is_open: false, phase: "closed" }, `id=eq.${id}`); },
  startCounting:  async (id, order) => { const db = await supabase.from("matches"); return db.update({ phase: "counting", reveal_order: order, revealed_count: 0 }, `id=eq.${id}`); },
  revealNext:     async (id, count) => { const db = await supabase.from("matches"); return db.update({ revealed_count: count }, `id=eq.${id}`); },
  updateMatch:    async (id, data) => { const db = await supabase.from("matches"); return db.update(data, `id=eq.${id}`); },
  deleteMatch:    async (id) => { const vdb = await supabase.from("votes"); await vdb.delete(`match_id=eq.${id}`); const db = await supabase.from("matches"); return db.delete(`id=eq.${id}`); },
  getCurrentSeason: async () => { try { const db = await supabase.from("settings"); const r = await db.select("value", { filter: "key=eq.current_season" }); return parseInt(r[0]?.value || "1"); } catch { return 1; } },
  advanceSeason:  async () => { const db = await supabase.from("settings"); const cur = await realAPI.getCurrentSeason(); const next = cur + 1; await db.update({ value: String(next) }, "key=eq.current_season"); return next; },
  hasVoted:       async (matchId, voterName) => { const db = await supabase.from("votes"); const r = await db.select("id", { filter: `match_id=eq.${matchId}&voter_name=eq.${voterName}` }); return r.length > 0; },
  submitVote:     async (vote) => { const db = await supabase.from("votes"); return db.insert(vote); },
  getVotes:       async (matchId) => { const db = await supabase.from("votes"); return db.select("*", { filter: `match_id=eq.${matchId}` }); },
  getAllVotes:     async () => { const db = await supabase.from("votes"); return db.select("*"); },
  getTeams:       async () => { const db = await supabase.from("teams"); return db.select("*", { order: "name.asc" }); },
  createTeam:     async (name, playerIds) => { const db = await supabase.from("teams"); const r = await db.insert({ name, player_ids: playerIds }); return r[0]; },
  deleteTeam:     async (id) => { const db = await supabase.from("teams"); return db.delete(`id=eq.${id}`); },
  createGuestToken: async (name, matchId) => {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const db = await supabase.from("guest_tokens");
    await db.insert({ token, name, match_id: matchId });
    return token;
  },
  getGuestTokens:     async (matchId) => { const db = await supabase.from("guest_tokens"); return db.select("*", { filter: `match_id=eq.${matchId}`, order: "created_at.asc" }); },
  validateGuestToken: async (token)   => { const db = await supabase.from("guest_tokens"); const r = await db.select("*", { filter: `token=eq.${token}` }); return r[0] || null; },
  useGuestToken:      async (token)   => { const db = await supabase.from("guest_tokens"); return db.update({ used: true }, `token=eq.${token}`); },
  deleteGuestToken:   async (id)      => { const db = await supabase.from("guest_tokens"); return db.delete(`id=eq.${id}`); },
};

const api = DEMO_MODE ? demoAPI : realAPI;

function computeScores(votes, players) {
  const best = {}, lemon = {};
  players.forEach(p => { best[p.id] = { pts: 0, comments: [] }; lemon[p.id] = { pts: 0, comments: [] }; });
  votes.forEach(v => {
    if (v.best1_id  && best[v.best1_id])  { best[v.best1_id].pts  += 2; if (v.best1_comment)  best[v.best1_id].comments.push(v.best1_comment); }
    if (v.best2_id  && best[v.best2_id])  { best[v.best2_id].pts  += 1; if (v.best2_comment)  best[v.best2_id].comments.push(v.best2_comment); }
    if (v.lemon_id  && lemon[v.lemon_id]) { lemon[v.lemon_id].pts += 1; if (v.lemon_comment) lemon[v.lemon_id].comments.push(v.lemon_comment); }
  });
  return { best, lemon };
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  return <div className="toast">{msg}</div>;
}

// ============================================================
// VOTE VIEW
// ============================================================
function VoteView({ players, match, onVoted, guestName = null, onGuestVoted = null }) {
  const [voterName,    setVoterName]    = useState(guestName || "");
  const [step,         setStep]         = useState(guestName ? 1 : 0);
  const [best1,        setBest1]        = useState(null);
  const [best1Comment, setBest1Comment] = useState("");
  const [best2,        setBest2]        = useState(null);
  const [best2Comment, setBest2Comment] = useState("");
  const [lemon,        setLemon]        = useState(null);
  const [lemonComment, setLemonComment] = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [checking,     setChecking]     = useState(false);

  const present = players.filter(p => match.present_ids.includes(p.id));

  const checkAndNext = async () => {
    if (!voterName) return;
    setChecking(true);
    const voted = await api.hasVoted(match.id, voterName);
    setChecking(false);
    if (voted) { setAlreadyVoted(true); return; }
    setStep(1);
  };

  const submit = async () => {
    setSubmitting(true);
    await api.submitVote({
      match_id: match.id, voter_name: voterName,
      best1_id: best1?.id, best1_comment: best1Comment,
      best2_id: best2?.id, best2_comment: best2Comment,
      lemon_id: lemon?.id, lemon_comment: lemonComment,
    });
    if (onGuestVoted) await onGuestVoted();
    const voted = JSON.parse(localStorage.getItem("pepite_voted") || "[]");
    if (!voted.includes(match.id)) localStorage.setItem("pepite_voted", JSON.stringify([...voted, match.id]));
    setSubmitting(false);
    onVoted();
  };

  if (!match.is_open) return (
    <div className="content"><div className="empty">🔒 Vote fermé.<br />Consulte les résultats.</div></div>
  );

  return (
    <div className="content">
      {guestName && (
        <div style={{ background: "var(--gold-subtle)", border: "1px solid var(--gold-dim)", borderRadius: "var(--radius-lg)", padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>👋</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)" }}>Bienvenu(e), {guestName} !</div>
            <div style={{ fontSize: 12, color: "var(--label3)", marginTop: 2 }}>Tu votes en tant que supporter.</div>
          </div>
        </div>
      )}
      {step === 0 && !guestName && (
        <>
          <p className="section-label mt-8 mb-4">Qui es-tu ?</p>
          <div className="player-grid">
            {present.map(p => (
              <button key={p.id} className={`player-chip ${voterName === p.name ? "sel-1st" : ""}`}
                onClick={() => setVoterName(p.name)}>{p.name}</button>
            ))}
          </div>
          {alreadyVoted && (
            <div style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}>
              Tu as déjà voté pour ce match.
            </div>
          )}
          <button className="btn btn-primary btn-full mt-12"
            disabled={!voterName || checking} onClick={checkAndNext}>
            {checking ? "Vérification…" : "Continuer"}
          </button>
        </>
      )}

      {step >= 1 && step <= 3 && (
        <>
          <div className="step-bar mt-8">
            {[1,2,3].map(i => <div key={i} className={`step-seg ${step > i ? "done" : step === i ? "active" : ""}`} />)}
          </div>

          {step === 1 && (
            <>
              <div style={{ background: "var(--gold-subtle)", border: "1px solid var(--gold-dim)", borderRadius: "var(--radius-lg)", padding: "14px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }}>⭐</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--gold)", letterSpacing: "-0.3px", lineHeight: 1.1 }}>La Pépite</div>
                  <div style={{ fontSize: 12, color: "var(--label3)", marginTop: 3 }}>Qui a été le meilleur joueur ?</div>
                </div>
                <div style={{ background: "var(--gold)", color: "#000", borderRadius: 20, padding: "4px 11px", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>2 pts</div>
              </div>
              <div className="player-grid">
                {present.filter(p => p.name !== voterName).map(p => (
                  <button key={p.id} className={`player-chip ${best1?.id === p.id ? "sel-1st" : ""}`}
                    onClick={() => setBest1(p)}>{p.name}</button>
                ))}
              </div>
              {best1 && (
                <>
                  <p className="section-label mt-12 mb-4">Commentaire (optionnel)</p>
                  <input placeholder={`Pourquoi ${best1.name} ?`} value={best1Comment}
                    onChange={e => setBest1Comment(e.target.value)} />
                </>
              )}
              <button className="btn btn-primary btn-full mt-12" disabled={!best1} onClick={() => setStep(2)}>
                Suivant
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ background: "rgba(255,214,10,0.04)", border: "1px solid rgba(255,214,10,0.12)", borderRadius: "var(--radius-lg)", padding: "14px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, opacity: 0.6 }}>⭐</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,214,10,0.7)", letterSpacing: "-0.3px", lineHeight: 1.1 }}>2ème meilleur</div>
                  <div style={{ fontSize: 12, color: "var(--label3)", marginTop: 3 }}>Le deuxième joueur le plus performant</div>
                </div>
                <div style={{ background: "rgba(255,214,10,0.15)", color: "var(--gold)", borderRadius: 20, padding: "4px 11px", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>1 pt</div>
              </div>
              <div className="player-grid">
                {present.filter(p => p.name !== voterName && p.id !== best1?.id).map(p => (
                  <button key={p.id} className={`player-chip ${best2?.id === p.id ? "sel-2nd" : ""}`}
                    onClick={() => setBest2(p)}>{p.name}</button>
                ))}
              </div>
              {best2 && (
                <>
                  <p className="section-label mt-12 mb-4">Commentaire (optionnel)</p>
                  <input placeholder={`Pourquoi ${best2.name} ?`} value={best2Comment}
                    onChange={e => setBest2Comment(e.target.value)} />
                </>
              )}
              <div className="flex gap-8 mt-12">
                <button className="btn btn-secondary" onClick={() => setStep(1)}>Retour</button>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={!best2} onClick={() => setStep(3)}>Suivant</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ background: "var(--lemon-subtle)", border: "1px solid var(--lemon-dim)", borderRadius: "var(--radius-lg)", padding: "14px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }}>🍋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--lemon)", letterSpacing: "-0.3px", lineHeight: 1.1 }}>Le Citron</div>
                  <div style={{ fontSize: 12, color: "var(--label3)", marginTop: 3 }}>Qui a le moins performé ce soir ?</div>
                </div>
                <div style={{ background: "var(--lemon-dim)", color: "var(--lemon)", borderRadius: 20, padding: "4px 11px", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>1 pt</div>
              </div>
              <div className="player-grid">
                {present.filter(p => p.name !== voterName && p.id !== best1?.id && p.id !== best2?.id).map(p => (
                  <button key={p.id} className={`player-chip ${lemon?.id === p.id ? "sel-lemon" : ""}`}
                    onClick={() => setLemon(p)}>{p.name}</button>
                ))}
              </div>
              {lemon && (
                <>
                  <p className="section-label mt-12 mb-4">Commentaire (optionnel)</p>
                  <input placeholder={`Pourquoi ${lemon.name} ?`} value={lemonComment}
                    onChange={e => setLemonComment(e.target.value)} />
                </>
              )}
              <div className="flex gap-8 mt-12">
                <button className="btn btn-secondary" onClick={() => setStep(2)}>Retour</button>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={!lemon} onClick={() => setStep(4)}>Suivant</button>
              </div>
            </>
          )}
        </>
      )}

      {step === 4 && (
        <>
          <p className="section-label mt-8 mb-4">Récapitulatif</p>
          <div className="group">
            <div className="row">
              <div className="row-icon gold">⭐</div>
              <div className="row-body">
                <div className="row-title">{best1?.name}</div>
                {best1Comment && <div className="row-sub">{best1Comment}</div>}
              </div>
              <span className="tag tag-gold">2 pts</span>
            </div>
            <div className="row">
              <div className="row-icon" style={{ background: "var(--gold-subtle)", opacity: 0.7 }}>⭐</div>
              <div className="row-body">
                <div className="row-title">{best2?.name}</div>
                {best2Comment && <div className="row-sub">{best2Comment}</div>}
              </div>
              <span className="tag tag-dim">1 pt</span>
            </div>
            <div className="row">
              <div className="row-icon lemon">🍋</div>
              <div className="row-body">
                <div className="row-title">{lemon?.name}</div>
                {lemonComment && <div className="row-sub">{lemonComment}</div>}
              </div>
              <span className="tag tag-lemon">Citron</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--label3)", textAlign: "center", marginBottom: 12 }}>
            Ton vote est anonyme.
          </p>
          <div className="flex gap-8">
            <button className="btn btn-secondary" onClick={() => setStep(3)}>Modifier</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={submit}>
              {submitting ? "Envoi…" : "Valider"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// SHARED SCOREBOARD
// ============================================================
function Scoreboard({ votes, present, tiebreakers = {}, showLemons = true }) {
  const { best, lemon } = computeScores(votes, present);

  const withRanks = (arr) => {
    let rank = 1;
    return arr.map((p, i) => { if (i > 0 && p.pts < arr[i - 1].pts) rank = i + 1; return { ...p, rank }; });
  };

  const bestRanked = withRanks(
    present.map(p => ({ ...p, pts: best[p.id]?.pts || 0, comments: best[p.id]?.comments || [] }))
      .filter(p => p.pts > 0)
      .sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : tiebreakers.best_id === a.id ? -1 : tiebreakers.best_id === b.id ? 1 : 0)
  );
  const lemonRanked = withRanks(
    present.map(p => ({ ...p, pts: lemon[p.id]?.pts || 0, comments: lemon[p.id]?.comments || [] }))
      .filter(p => p.pts > 0)
      .sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : tiebreakers.lemon_id === a.id ? -1 : tiebreakers.lemon_id === b.id ? 1 : 0)
  );
  const maxBest  = bestRanked[0]?.pts || 1;
  const maxLemon = lemonRanked[0]?.pts || 1;

  return (
    <>
      <p className="section-label mb-4">Pépites</p>
      <div className="group">
        {bestRanked.length === 0
          ? <div className="row"><span style={{ color: "var(--label3)", fontSize: 14 }}>Aucun vote révélé…</span></div>
          : bestRanked.map((p) => {
            const isBeer = tiebreakers.best_id === p.id;
            const isFirst = p.rank === 1;
            return (
              <div key={p.id}>
                <div className="row">
                  <div style={{ width: 24, fontWeight: 700, fontSize: isBeer ? 16 : 13, flexShrink: 0, color: isFirst ? "var(--gold)" : "var(--label3)" }}>
                    {isBeer ? "🍺" : p.rank}
                  </div>
                  <div className="row-body"><div className="row-title">{p.name}</div></div>
                  <div className="score-bar-wrap">
                    <div className="score-bar" style={{ width: `${(p.pts / maxBest) * 100}%`, background: isFirst ? "var(--gold)" : "var(--label3)" }} />
                  </div>
                  <div className="row-value gold" style={{ minWidth: 28, textAlign: "right" }}>{p.pts}</div>
                </div>
                {p.comments.map((c, j) => <div key={j} className="comment">"{c}"</div>)}
              </div>
            );
          })
        }
      </div>
      {showLemons && lemonRanked.length > 0 && (
        <>
          <p className="section-label mb-4" style={{ color: "var(--lemon)" }}>Citrons</p>
          <div className="group">
            {lemonRanked.map((p) => {
              const isBeer = tiebreakers.lemon_id === p.id;
              return (
                <div key={p.id}>
                  <div className="row">
                    <div className="row-icon lemon">{isBeer ? "🍺" : "🍋"}</div>
                    <div className="row-body"><div className="row-title">{p.name}</div></div>
                    <div className="score-bar-wrap">
                      <div className="score-bar" style={{ width: `${(p.pts / maxLemon) * 100}%`, background: "var(--lemon)" }} />
                    </div>
                    <div className="row-value lemon" style={{ minWidth: 28, textAlign: "right" }}>{p.pts}</div>
                  </div>
                  {p.comments.map((c, j) => <div key={j} className="comment">"{c}"</div>)}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// ============================================================
// PODIUM VIEW  (used in closed phase)
// ============================================================
function PodiumView({ votes, present, tiebreakers = {} }) {
  const [podiumTab, setPodiumTab] = useState("pepite");
  const { best, lemon } = computeScores(votes, present);

  const buildRanked = (scores, tieKey) =>
    present
      .map(p => ({ ...p, pts: scores[p.id]?.pts || 0, comments: scores[p.id]?.comments || [] }))
      .filter(p => p.pts > 0)
      .sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : tiebreakers[tieKey] === a.id ? -1 : tiebreakers[tieKey] === b.id ? 1 : 0);

  const isPepite = podiumTab === "pepite";
  const ranked   = isPepite ? buildRanked(best, "best_id") : buildRanked(lemon, "lemon_id");
  const color    = isPepite ? "var(--gold)"  : "var(--lemon)";
  const colorDim = isPepite ? "var(--gold-dim)" : "var(--lemon-dim)";

  const [first, second, third] = ranked;

  const Slot = ({ player, place, height }) => {
    const isFirst = place === 1;
    const nameColor = isFirst ? color : place === 2 ? "var(--label2)" : "var(--label3)";
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {player ? (
          <>
            {isFirst && <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 5 }}>👑</div>}
            <div style={{ fontSize: isFirst ? 15 : 13, fontWeight: 700, color: nameColor, textAlign: "center", lineHeight: 1.2, marginBottom: 3, padding: "0 4px" }}>{player.name}</div>
            <div style={{ fontSize: 12, color: "var(--label3)", marginBottom: 8 }}>{player.pts} pts</div>
          </>
        ) : (
          <div style={{ height: 56 }} />
        )}
        <div style={{
          height, width: "100%", borderRadius: "8px 8px 0 0",
          background: isFirst ? colorDim : "var(--bg3)",
          border: isFirst ? `1px solid ${color}` : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: isFirst ? 28 : 20, fontWeight: 800, color: isFirst ? color : "var(--label4)" }}>{place}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Tab switcher */}
      <div style={{ display: "flex", background: "var(--bg2)", borderRadius: "var(--radius-lg)", padding: 4, marginBottom: 20 }}>
        {[{ id: "pepite", label: "⭐  Pépites" }, { id: "citron", label: "🍋  Citrons" }].map(({ id, label }) => (
          <button key={id} onClick={() => setPodiumTab(id)} style={{
            flex: 1, padding: "10px", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: podiumTab === id ? "var(--bg3)" : "transparent",
            color: podiumTab === id ? "var(--label)" : "var(--label3)",
            border: "none", cursor: "pointer", transition: "all 0.2s",
          }}>{label}</button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <div className="group" style={{ marginBottom: 16 }}>
          <div className="row"><span style={{ color: "var(--label3)", fontSize: 14 }}>Aucun vote.</span></div>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
            <Slot player={second} place={2} height={80} />
            <Slot player={first}  place={1} height={112} />
            <Slot player={third}  place={3} height={56} />
          </div>
          <div style={{ height: 4, background: "var(--bg3)", borderRadius: "0 0 8px 8px", marginBottom: 24 }} />

          {/* Winner comments */}
          {first?.comments?.length > 0 && (
            <>
              <p className="section-label mb-4">Commentaires sur {first.name}</p>
              <div className="group" style={{ marginBottom: 16 }}>
                {first.comments.map((c, i) => (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid var(--separator)" }}>
                    <div style={{ fontSize: 13, color: "var(--label2)", fontStyle: "italic", lineHeight: 1.5 }}>"{c}"</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 4th+ */}
          {ranked.length > 3 && (
            <>
              <p className="section-label mb-4">Suite du classement</p>
              <div className="group" style={{ marginBottom: 16 }}>
                {ranked.slice(3).map((p, i) => (
                  <div key={p.id} className="row">
                    <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0, color: "var(--label3)" }}>{i + 4}</div>
                    <div className="row-body"><div className="row-title">{p.name}</div></div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{ width: `${(p.pts / (ranked[0]?.pts || 1)) * 100}%`, background: "var(--label3)" }} />
                      </div>
                      <div className="row-value" style={{ color: "var(--label3)", minWidth: 24, textAlign: "right" }}>{p.pts}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

// ============================================================
// RESULTS VIEW
// ============================================================
function ResultsView({ players, match, refreshKey, onMatchUpdate }) {
  const [votes,              setVotes]              = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [revealing,          setRevealing]          = useState(false);
  const [localRevealedCount, setLocalRevealedCount] = useState(null);

  // Reset optimistic count whenever the match changes
  useEffect(() => { setLocalRevealedCount(null); }, [match?.id]);

  useEffect(() => {
    if (!match) { setLoading(false); return; }
    setLoading(true);
    api.getVotes(match.id).then(v => { setVotes(v); setLoading(false); });
  }, [match?.id, refreshKey]);

  useEffect(() => {
    if (!match?.is_open) return;
    const t = setInterval(() => api.getVotes(match.id).then(setVotes), 5000);
    return () => clearInterval(t);
  }, [match?.id, match?.is_open]);

  if (!match)  return <div className="content"><div className="empty">Aucun match en cours.</div></div>;
  if (loading) return <div className="content"><div className="empty">Chargement…</div></div>;

  const present = players.filter(p => match.present_ids.includes(p.id));
  const phase = match.phase || "voting";

  const MatchHeader = ({ badge }) => (
    <div className="flex-between mt-4 mb-12">
      <div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{match.label}</div>
        <div style={{ fontSize: 12, color: "var(--label3)", marginTop: 2 }}>{formatDate(match.created_at)}</div>
      </div>
      {badge}
    </div>
  );

  // ── VOTING PHASE : results hidden ──
  if (phase === "voting") {
    return (
      <div className="content">
        <MatchHeader badge={<span className="badge badge-open">Vote en cours</span>} />
        <div style={{
          background: "var(--bg2)", borderRadius: "var(--radius-lg)",
          padding: "40px 20px", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Résultats masqués</div>
          <div style={{ fontSize: 13, color: "var(--label3)", lineHeight: 1.6 }}>
            Le classement sera révélé une fois le vote clôturé.<br />
            <span style={{ color: "var(--label2)", fontWeight: 500 }}>{votes.length}</span> vote{votes.length !== 1 ? "s" : ""} reçu{votes.length !== 1 ? "s" : ""} sur {present.length} joueur{present.length !== 1 ? "s" : ""}.
          </div>
        </div>
      </div>
    );
  }

  // ── COUNTING PHASE : dépouillement ──
  if (phase === "counting") {
    const revealOrder   = match.reveal_order || [];
    const revealedCount = localRevealedCount ?? (match.revealed_count || 0);
    const isDone        = revealedCount >= revealOrder.length;

    const currentVoteId  = !isDone ? revealOrder[revealedCount] : null;
    const currentVote    = currentVoteId ? votes.find(v => v.id === currentVoteId) : null;
    const revealedVoteIds = revealOrder.slice(0, revealedCount);
    const revealedVotes  = votes.filter(v => revealedVoteIds.includes(v.id));

    const playerName = (id) => players.find(p => p.id === id)?.name || "?";

    const handleNext = () => {
      const next = revealedCount + 1;
      setLocalRevealedCount(next);          // instant — no network wait
      api.revealNext(match.id, next);       // fire-and-forget
    };

    const handleFinish = async () => {
      await api.closeMatch(match.id);
      await onMatchUpdate();
    };

    return (
      <div className="content">
        <MatchHeader badge={<span className="badge" style={{ background: "rgba(170,221,0,0.15)", color: "var(--lemon)" }}>Dépouillement</span>} />

        {!isDone && currentVote ? (
          <div key={revealedCount} style={{
            background: "var(--bg2)", borderRadius: "var(--radius-lg)",
            border: "1px solid var(--separator2)", marginBottom: 16, overflow: "hidden",
            animation: "revealPop 0.3s ease",
          }}>
            {/* Progress header */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--separator)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg3)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--label2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Vote {revealedCount + 1} / {revealOrder.length}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {revealOrder.map((_, i) => (
                  <div key={i} style={{
                    width: i === revealedCount ? 14 : 7, height: 7,
                    borderRadius: 4,
                    background: i < revealedCount ? "var(--label2)" : i === revealedCount ? "var(--gold)" : "var(--bg4)",
                    transition: "all 0.3s ease",
                  }} />
                ))}
              </div>
            </div>

            {/* Vote rows */}
            <div>
              {/* Pépite 1 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 16px 14px", borderBottom: "1px solid var(--separator)", borderLeft: "4px solid var(--gold)" }}>
                <div style={{ fontSize: 26, lineHeight: 1 }}>⭐</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>La Pépite · 2 pts</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)", letterSpacing: "-0.3px", lineHeight: 1.1 }}>{playerName(currentVote.best1_id)}</div>
                  {currentVote.best1_comment && <div style={{ fontSize: 12, color: "var(--label3)", fontStyle: "italic", marginTop: 5 }}>"{currentVote.best1_comment}"</div>}
                </div>
              </div>
              {/* Pépite 2 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", borderBottom: "1px solid var(--separator)", borderLeft: "4px solid rgba(255,214,10,0.35)" }}>
                <div style={{ fontSize: 22, lineHeight: 1, opacity: 0.5 }}>⭐</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,214,10,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>2ème · 1 pt</div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: "var(--label)", letterSpacing: "-0.2px" }}>{playerName(currentVote.best2_id)}</div>
                  {currentVote.best2_comment && <div style={{ fontSize: 12, color: "var(--label3)", fontStyle: "italic", marginTop: 5 }}>"{currentVote.best2_comment}"</div>}
                </div>
              </div>
              {/* Citron */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px 16px", borderLeft: "4px solid var(--lemon)" }}>
                <div style={{ fontSize: 24, lineHeight: 1 }}>🍋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--lemon)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Le Citron</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--lemon)", letterSpacing: "-0.3px", lineHeight: 1.1 }}>{playerName(currentVote.lemon_id)}</div>
                  {currentVote.lemon_comment && <div style={{ fontSize: 12, color: "var(--label3)", fontStyle: "italic", marginTop: 5 }}>"{currentVote.lemon_comment}"</div>}
                </div>
              </div>
            </div>

            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--separator)" }}>
              <button className="btn btn-primary btn-full" onClick={handleNext}>
                {revealedCount + 1 < revealOrder.length ? "Vote suivant →" : "Voir le classement final →"}
              </button>
            </div>
          </div>
        ) : isDone ? (
          <div style={{ background: "var(--bg2)", borderRadius: "var(--radius-lg)", padding: "24px 16px", textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Tous les votes ont été révélés !</div>
            <div style={{ fontSize: 13, color: "var(--label3)", marginBottom: 16 }}>Affiche le classement définitif pour tout le monde.</div>
            <button className="btn btn-primary btn-full" onClick={handleFinish}>Afficher le classement final</button>
          </div>
        ) : null}

        {revealedCount > 0 && (
          <div style={{
            border: "1px dashed var(--separator2)",
            borderRadius: "var(--radius-lg)",
            padding: "14px 14px 4px",
            marginTop: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--lemon)",
                animation: "livePulse 1.4s ease-in-out infinite",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--label3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Classement provisoire · {revealedCount}/{revealOrder.length} vote{revealedCount > 1 ? "s" : ""} révélé{revealedCount > 1 ? "s" : ""}
              </span>
            </div>
            <Scoreboard votes={revealedVotes} present={present} />
          </div>
        )}
      </div>
    );
  }

  // ── CLOSED : full results ──
  const tiebreakers = match.tiebreakers || {};
  const isAdmin = localStorage.getItem("pepite_admin") === "1";

  const { best: bestScores, lemon: lemonScores } = computeScores(votes, present);
  const topBestPts  = Math.max(...present.map(p => bestScores[p.id]?.pts || 0));
  const topLemonPts = Math.max(...present.map(p => lemonScores[p.id]?.pts || 0));
  const bestTied  = topBestPts  > 0 && present.filter(p => (bestScores[p.id]?.pts  || 0) === topBestPts).length  > 1;
  const lemonTied = topLemonPts > 0 && present.filter(p => (lemonScores[p.id]?.pts || 0) === topLemonPts).length > 1;
  const bestTiedPlayers  = present.filter(p => (bestScores[p.id]?.pts  || 0) === topBestPts);
  const lemonTiedPlayers = present.filter(p => (lemonScores[p.id]?.pts || 0) === topLemonPts);

  const setTiebreaker = async (field, playerId) => {
    await api.updateMatch(match.id, { tiebreakers: { ...tiebreakers, [field]: playerId } });
    await onMatchUpdate();
  };

  const TiebreakerCard = ({ title, color, field, players }) => (
    <div style={{
      background: color === "gold" ? "rgba(255,214,10,0.06)" : "rgba(170,221,0,0.06)",
      border: `1px solid ${color === "gold" ? "var(--gold-dim)" : "var(--lemon-dim)"}`,
      borderRadius: "var(--radius-lg)", padding: "16px", marginBottom: 12,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🍺 Égalité — {title}</div>
      <div style={{ fontSize: 13, color: "var(--label3)", marginBottom: 12 }}>
        {players.map(p => p.name).join(" et ")} sont à égalité.<br />Qui a gagné le concours de bière ?
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {players.map(p => (
          <button key={p.id} className="btn btn-secondary" onClick={() => setTiebreaker(field, p.id)}>
            🍺 {p.name}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="content">
      <MatchHeader badge={<span className="badge badge-closed">Clôturé</span>} />
      {isAdmin && bestTied  && !tiebreakers.best_id  && <TiebreakerCard title="Pépite" color="gold"  field="best_id"  players={bestTiedPlayers}  />}
      {isAdmin && lemonTied && !tiebreakers.lemon_id && <TiebreakerCard title="Citron" color="lemon" field="lemon_id" players={lemonTiedPlayers} />}
      <PodiumView votes={votes} present={present} tiebreakers={tiebreakers} />
    </div>
  );
}

// ============================================================
// STATS VIEW
// ============================================================
function StatsView({ players }) {
  const [allVotes,       setAllVotes]       = useState([]);
  const [allMatches,     setAllMatches]     = useState([]);
  const [allTeams,       setAllTeams]       = useState([]);
  const [currentSeason,  setCurrentSeason]  = useState(1);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [expandedId,     setExpandedId]     = useState(null);
  const [editingMatch,   setEditingMatch]   = useState(null);
  const [loading,        setLoading]        = useState(true);

  const reload = useCallback(async () => {
    const [v, m, t, cs] = await Promise.all([api.getAllVotes(), api.getMatches(), api.getTeams(), api.getCurrentSeason()]);
    setAllVotes(v); setAllMatches(m); setAllTeams(t); setCurrentSeason(cs);
    setSelectedSeason(prev => prev ?? cs);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, []);

  if (loading) return <div className="content"><div className="empty">Chargement…</div></div>;

  const seasons = [...new Set(allMatches.map(m => m.season || 1))].sort((a, b) => a - b);
  const activeSeason = selectedSeason ?? currentSeason;

  const filteredMatches = allMatches.filter(m =>
    (m.season || 1) === activeSeason &&
    (selectedTeamId === null || m.team_id === selectedTeamId)
  );
  const filteredMatchIds = new Set(filteredMatches.map(m => m.id));
  const filteredVotes = allVotes.filter(v => filteredMatchIds.has(v.match_id));

  const stats = {};
  players.forEach(p => { stats[p.id] = { name: p.name, bestPts: 0, lemonPts: 0, wins: 0, lemons: 0 }; });
  filteredMatches.forEach(match => {
    const mv = allVotes.filter(v => v.match_id === match.id);
    const pp = players.filter(p => (match.present_ids || []).includes(p.id));
    const { best, lemon } = computeScores(mv, pp);
    let maxB = 0, maxL = 0, bW = null, lW = null;
    pp.forEach(p => {
      if (!stats[p.id]) return;
      const bp = best[p.id]?.pts || 0, lp = lemon[p.id]?.pts || 0;
      stats[p.id].bestPts += bp; stats[p.id].lemonPts += lp;
      if (bp > maxB) { maxB = bp; bW = p.id; }
      if (lp > maxL) { maxL = lp; lW = p.id; }
    });
    if (bW && stats[bW]) stats[bW].wins++;
    if (lW && stats[lW]) stats[lW].lemons++;
  });
  const allStats = Object.values(stats).filter(s => s.bestPts > 0 || s.lemonPts > 0);
  const rankedBest  = [...allStats].filter(s => s.bestPts  > 0).sort((a, b) => b.bestPts  - a.bestPts);
  const rankedLemon = [...allStats].filter(s => s.lemonPts > 0).sort((a, b) => b.lemonPts - a.lemonPts);
  const ranked = rankedBest; // keep for empty-check below
  const maxPts      = rankedBest[0]?.bestPts   || 1;
  const maxLemonPts = rankedLemon[0]?.lemonPts || 1;

  const handleDelete = async (match) => {
    if (!confirm(`Supprimer "${match.label}" et tous ses votes ?`)) return;
    await api.deleteMatch(match.id);
    if (expandedId === match.id) setExpandedId(null);
    reload();
  };

  const handleSaveEdit = async () => {
    if (!editingMatch) return;
    await api.updateMatch(editingMatch.id, { label: editingMatch.label, team_id: editingMatch.team_id || null });
    setEditingMatch(null);
    reload();
  };

  const TabBar = ({ items, active, onChange }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
      {items.map(({ id, label }) => (
        <button key={id} onClick={() => onChange(id)} style={{
          padding: "7px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600,
          background: active === id ? "var(--label)" : "var(--bg3)",
          color: active === id ? "var(--bg)" : "var(--label3)",
          border: "none", cursor: "pointer",
        }}>{label}</button>
      ))}
    </div>
  );

  return (
    <div className="content">
      {/* Season tabs */}
      {seasons.length > 0 && (
        <div style={{ marginTop: 12, marginBottom: 16 }}>
          <TabBar
            items={seasons.map(s => ({ id: s, label: `Saison ${s}${s === currentSeason ? " ·" : ""}` }))}
            active={activeSeason}
            onChange={s => { setSelectedSeason(s); setSelectedTeamId(null); setExpandedId(null); }}
          />
          <p style={{ fontSize: 11, color: "var(--label4)", marginTop: 4 }}>
            {filteredMatches.length} match{filteredMatches.length !== 1 ? "s" : ""}
            {filteredVotes.length > 0 && ` · ${filteredVotes.length} vote${filteredVotes.length > 1 ? "s" : ""}`}
          </p>
        </div>
      )}

      {/* Team filter */}
      {allTeams.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          <button className={`tag ${selectedTeamId === null ? "tag-gold" : "tag-dim"}`}
            onClick={() => setSelectedTeamId(null)}>Toutes</button>
          {allTeams.map(t => (
            <button key={t.id} className={`tag ${selectedTeamId === t.id ? "tag-gold" : "tag-dim"}`}
              onClick={() => setSelectedTeamId(t.id)}>{t.name}</button>
          ))}
        </div>
      )}

      {filteredMatches.length === 0 ? (
        <div className="empty">Aucun match pour cette sélection.</div>
      ) : (
        <>
          {/* Pépites ranking */}
          <p className="section-label mb-4">Classement Pépites ⭐</p>
          {rankedBest.length === 0
            ? <div className="group" style={{ marginBottom: 12 }}><div className="row"><span style={{ color: "var(--label3)", fontSize: 14 }}>Aucun vote enregistré.</span></div></div>
            : (
              <div className="group" style={{ marginBottom: 12 }}>
                {rankedBest.map((s, i) => (
                  <div key={s.name} className="row">
                    <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0, color: i === 0 ? "var(--gold)" : "var(--label3)" }}>{i + 1}</div>
                    <div className="row-body">
                      <div className="row-title">{s.name}</div>
                      {s.wins > 0 && <div className="flex gap-8 mt-4"><span className="tag tag-gold">⭐ ×{s.wins}</span></div>}
                    </div>
                    <div className="flex gap-8" style={{ alignItems: "center" }}>
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{ width: `${(s.bestPts / maxPts) * 100}%`, background: i === 0 ? "var(--gold)" : "var(--label3)" }} />
                      </div>
                      <div className="row-value gold" style={{ minWidth: 24, textAlign: "right" }}>{s.bestPts}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }

          {/* Citrons ranking */}
          <p className="section-label mb-4">Classement Citrons 🍋</p>
          {rankedLemon.length === 0
            ? <div className="group" style={{ marginBottom: 12 }}><div className="row"><span style={{ color: "var(--label3)", fontSize: 14 }}>Aucun vote enregistré.</span></div></div>
            : (
              <div className="group" style={{ marginBottom: 12 }}>
                {rankedLemon.map((s, i) => (
                  <div key={s.name} className="row">
                    <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0, color: i === 0 ? "#f5c542" : "var(--label3)" }}>{i + 1}</div>
                    <div className="row-body">
                      <div className="row-title">{s.name}</div>
                      {s.lemons > 0 && <div className="flex gap-8 mt-4"><span className="tag tag-lemon">🍋 ×{s.lemons}</span></div>}
                    </div>
                    <div className="flex gap-8" style={{ alignItems: "center" }}>
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{ width: `${(s.lemonPts / maxLemonPts) * 100}%`, background: i === 0 ? "#f5c542" : "var(--label3)" }} />
                      </div>
                      <div className="row-value" style={{ minWidth: 24, textAlign: "right", color: "#f5c542" }}>{s.lemonPts}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }

          {/* Match list */}
          <p className="section-label mb-8">Matchs</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            {filteredMatches.map(match => {
              const matchVotes  = allVotes.filter(v => v.match_id === match.id);
              const matchPresent = players.filter(p => (match.present_ids || []).includes(p.id));
              const isExpanded  = expandedId === match.id;
              const isEditing   = editingMatch?.id === match.id;
              const teamName    = allTeams.find(t => t.id === match.team_id)?.name;

              return (
                <div key={match.id} style={{ background: "var(--bg2)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                  <button onClick={() => setExpandedId(isExpanded ? null : match.id)}
                    style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--label)" }}>{match.label}</div>
                      <div style={{ fontSize: 12, color: "var(--label3)", marginTop: 2 }}>
                        {formatDate(match.created_at)}
                        {teamName && <span> · <span style={{ color: "var(--gold)" }}>{teamName}</span></span>}
                        {' · '}{matchVotes.length} vote{matchVotes.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <span style={{ color: "var(--label4)", fontSize: 11 }}>{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: "1px solid var(--separator)", padding: "12px 16px" }}>
                      {matchVotes.length === 0
                        ? <p style={{ fontSize: 14, color: "var(--label3)", marginBottom: 12 }}>Aucun vote.</p>
                        : <Scoreboard votes={matchVotes} present={matchPresent} />
                      }

                      {localStorage.getItem("pepite_admin") === "1" && (isEditing ? (
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                          <input value={editingMatch.label}
                            onChange={e => setEditingMatch(em => ({ ...em, label: e.target.value }))}
                            placeholder="Nom du match" />
                          {allTeams.length > 0 && (
                            <select value={editingMatch.team_id || ""}
                              onChange={e => setEditingMatch(em => ({ ...em, team_id: e.target.value ? parseInt(e.target.value) : null }))}
                              style={{ background: "var(--bg3)", color: "var(--label)", border: "none", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: 15, width: "100%", outline: "none" }}>
                              <option value="">Sans équipe</option>
                              {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          )}
                          <div className="flex gap-8">
                            <button className="btn btn-secondary" onClick={() => setEditingMatch(null)}>Annuler</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit}>Sauvegarder</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-8" style={{ marginTop: 12 }}>
                          <button className="btn btn-secondary" style={{ flex: 1 }}
                            onClick={() => setEditingMatch({ id: match.id, label: match.label, team_id: match.team_id || null })}>
                            Modifier
                          </button>
                          <button className="btn btn-danger" onClick={() => handleDelete(match)}>Supprimer</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// ADMIN VIEW
// ============================================================
function AdminView({ players, onPlayersChange, activeMatch, onMatchChange }) {
  const [isAdmin,      setIsAdmin]      = useState(() => localStorage.getItem("pepite_admin") === "1");
  const [pwd,          setPwd]          = useState("");
  const [pwdErr,       setPwdErr]       = useState(false);
  const [newPlayer,    setNewPlayer]    = useState("");
  const [matchLabel,   setMatchLabel]   = useState("");
  const [presentIds,   setPresentIds]   = useState([]);
  const [creating,     setCreating]     = useState(false);
  const [toast,        setToast]        = useState(null);
  const [teams,          setTeams]          = useState([]);
  const [teamName,       setTeamName]       = useState("");
  const [teamIds,        setTeamIds]        = useState([]);
  const [showNewTeam,    setShowNewTeam]    = useState(true);
  const [savingTeam,     setSavingTeam]     = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [currentSeason,  setCurrentSeason]  = useState(1);
  const [guestInput,     setGuestInput]     = useState("");
  const [guestTokens,    setGuestTokens]    = useState([]);
  const [copiedToken,    setCopiedToken]    = useState(null);

  const loadTeams = useCallback(async () => { setTeams(await api.getTeams()); }, []);
  const loadGuests = useCallback(async () => {
    if (!activeMatch) return;
    setGuestTokens(await api.getGuestTokens(activeMatch.id));
  }, [activeMatch?.id]);

  useEffect(() => {
    Promise.all([api.getTeams(), api.getCurrentSeason()]).then(([t, cs]) => {
      setTeams(t); setCurrentSeason(cs);
    });
  }, []);

  useEffect(() => { loadGuests(); }, [activeMatch?.id]);

  const createGuestLink = async () => {
    if (!guestInput.trim() || !activeMatch) return;
    await api.createGuestToken(guestInput.trim(), activeMatch.id);
    setGuestInput("");
    loadGuests();
    setToast(`Lien créé pour ${guestInput.trim()}`);
  };

  const copyGuestLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/?guest=${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const revokeGuest = async (id) => {
    await api.deleteGuestToken(id);
    loadGuests();
  };

  const login = () => {
    if (pwd === ADMIN_PASSWORD) {
      localStorage.setItem("pepite_admin", "1");
      setIsAdmin(true); setPwdErr(false);
    } else setPwdErr(true);
  };

  const addPlayer = async () => {
    if (!newPlayer.trim()) return;
    await api.addPlayer(newPlayer.trim());
    setToast(`${newPlayer.trim()} ajouté`);
    setNewPlayer("");
    onPlayersChange();
  };

  const removePlayer = async (id, name) => {
    if (!confirm(`Supprimer ${name} ?`)) return;
    await api.removePlayer(id);
    onPlayersChange();
  };

  const togglePresent = (id) => setPresentIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleTeamId  = (id) => setTeamIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const loadTeamIntoMatch = (team) => { setPresentIds([...team.player_ids]); setSelectedTeamId(team.id); };

  const advanceSeason = async () => {
    if (!confirm(`Démarrer la saison ${currentSeason + 1} ? L'historique de la saison ${currentSeason} est conservé.`)) return;
    const next = await api.advanceSeason();
    setCurrentSeason(next);
    setToast(`Saison ${next} démarrée !`);
  };

  const createMatch = async () => {
    if (!matchLabel.trim() || presentIds.length < 2) return;
    setCreating(true);
    await api.createMatch(matchLabel.trim(), presentIds, selectedTeamId, currentSeason);
    setMatchLabel(""); setPresentIds([]); setSelectedTeamId(null);
    setCreating(false);
    onMatchChange();
    setToast("Match ouvert !");
  };

  const [voteCount,    setVoteCount]    = useState(0);
  const [startingCount, setStartingCount] = useState(false);

  useEffect(() => {
    if (!activeMatch || (activeMatch.phase || "voting") !== "voting") { setVoteCount(0); return; }
    api.getVotes(activeMatch.id).then(v => setVoteCount(v.length));
    const t = setInterval(() => api.getVotes(activeMatch.id).then(v => setVoteCount(v.length)), 5000);
    return () => clearInterval(t);
  }, [activeMatch?.id, activeMatch?.phase]);

  const closeMatch = async () => {
    if (!activeMatch || !confirm("Fermer définitivement le vote sans dépouillement ?")) return;
    await api.closeMatch(activeMatch.id);
    onMatchChange();
    setToast("Vote clôturé");
  };

  const startCounting = async () => {
    setStartingCount(true);
    const votes = await api.getVotes(activeMatch.id);
    const shuffled = [...votes].sort(() => Math.random() - 0.5).map(v => v.id);
    await api.startCounting(activeMatch.id, shuffled);
    setStartingCount(false);
    onMatchChange();
    setToast("Dépouillement lancé !");
  };

  const saveTeam = async () => {
    if (!teamName.trim() || teamIds.length < 2) return;
    setSavingTeam(true);
    await api.createTeam(teamName.trim(), teamIds);
    setTeamName(""); setTeamIds([]);
    setSavingTeam(false);
    loadTeams();
    setToast("Équipe sauvegardée !");
  };

  const deleteTeam = async (id, name) => {
    if (!confirm(`Supprimer l'équipe "${name}" ?`)) return;
    await api.deleteTeam(id);
    loadTeams();
  };

  if (!isAdmin) return (
    <div className="content">
      <p className="section-label mt-8 mb-4">Mot de passe admin</p>
      <input type="password" placeholder="••••••••" value={pwd}
        onChange={e => setPwd(e.target.value)}
        onKeyDown={e => e.key === "Enter" && login()} />
      {pwdErr && <p style={{ fontSize: 13, color: "var(--red)", marginTop: 8 }}>Mot de passe incorrect.</p>}
      <button className="btn btn-primary btn-full mt-12" onClick={login}>Connexion</button>
    </div>
  );

  const SectionHeader = ({ num, title, subtitle }) => (
    <div style={{ marginTop: 28, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "var(--bg3)", color: "var(--label2)",
          fontSize: 12, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>{num}</div>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--label)" }}>{title}</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--label3)", paddingLeft: 32 }}>{subtitle}</p>
    </div>
  );

  return (
    <div className="content">
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* ── 1. MATCH DU JOUR ── */}
      <SectionHeader num="1" title="Match du jour"
        subtitle={activeMatch ? "Un vote est en cours. Clore le vote pour en créer un nouveau." : "Lance le vote de ce soir en quelques secondes."} />

      {activeMatch ? (() => {
        const phase = activeMatch.phase || "voting";
        return (
          <div className="group">
            <div className="row">
              <div className="row-icon green">⚡</div>
              <div className="row-body">
                <div className="row-title">{activeMatch.label}</div>
                <div className="row-sub">
                  {phase === "voting"   && `${voteCount} vote${voteCount !== 1 ? "s" : ""} reçu${voteCount !== 1 ? "s" : ""} sur ${activeMatch.present_ids.length} joueurs`}
                  {phase === "counting" && `Dépouillement — ${activeMatch.revealed_count || 0}/${(activeMatch.reveal_order || []).length} votes révélés`}
                </div>
              </div>
            </div>
            {phase === "voting" && (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <button className="btn btn-primary btn-full" onClick={startCounting} disabled={startingCount || voteCount === 0}>
                  {startingCount ? "Préparation…" : `Lancer le dépouillement · ${voteCount} vote${voteCount !== 1 ? "s" : ""}`}
                </button>
                <button className="btn btn-danger btn-full" style={{ fontSize: 13 }} onClick={closeMatch}>
                  Clore sans dépouiller
                </button>
              </div>
            )}
            {phase === "counting" && (
              <div style={{ padding: "12px 16px" }}>
                <p style={{ fontSize: 13, color: "var(--label3)", textAlign: "center" }}>
                  Le dépouillement est en cours dans l'onglet Résultats.
                </p>
              </div>
            )}
          </div>
        );
      })() : players.length === 0 ? (
        <div className="group">
          <div className="row">
            <div className="row-body">
              <div className="row-title" style={{ color: "var(--label3)" }}>Aucun joueur enregistré</div>
              <div className="row-sub">Ajoute d'abord tes joueurs dans la section 3 ci-dessous ↓</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="group" style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: 13, color: "var(--label3)", marginBottom: 8 }}>Nom du match ou de l'adversaire</p>
          <input placeholder="ex : vs Dragons, Entraînement…" value={matchLabel}
            onChange={e => setMatchLabel(e.target.value)} style={{ marginBottom: 16 }} />

          {teams.length > 0 && (
            <>
              <p style={{ fontSize: 13, color: "var(--label3)", marginBottom: 8 }}>
                Partir d'une composition sauvegardée <span style={{ color: "var(--label4)" }}>(tu pourras décocher les absents)</span>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {teams.map(t => (
                  <button key={t.id}
                    onClick={() => loadTeamIntoMatch(t)}
                    style={{
                      padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600,
                      background: presentIds.length > 0 && t.player_ids.every(id => presentIds.includes(id)) && presentIds.length === t.player_ids.length
                        ? "var(--gold-dim)" : "var(--bg3)",
                      color: presentIds.length > 0 && t.player_ids.every(id => presentIds.includes(id)) && presentIds.length === t.player_ids.length
                        ? "var(--gold)" : "var(--label2)",
                      border: "none", cursor: "pointer",
                    }}>
                    {t.name} · {t.player_ids.length} joueurs
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex-between" style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: "var(--label3)" }}>
              Qui est présent ce soir ?
              {presentIds.length > 0 && <span style={{ color: "var(--label2)", marginLeft: 6 }}>{presentIds.length} sélectionné{presentIds.length > 1 ? "s" : ""}</span>}
            </p>
            <div className="flex gap-8">
              <button className="tag tag-dim" onClick={() => setPresentIds(players.map(p => p.id))}>Tous</button>
              <button className="tag tag-dim" onClick={() => setPresentIds([])}>Aucun</button>
            </div>
          </div>
          <div className="player-grid" style={{ marginBottom: 16 }}>
            {players.map(p => (
              <button key={p.id} className={`player-chip ${presentIds.includes(p.id) ? "sel-1st" : ""}`}
                onClick={() => togglePresent(p.id)}>{p.name}</button>
            ))}
          </div>
          {presentIds.length < 2 && (
            <p style={{ fontSize: 12, color: "var(--label3)", marginBottom: 10 }}>
              Sélectionne au moins 2 joueurs pour lancer le vote.
            </p>
          )}
          <button className="btn btn-primary btn-full"
            disabled={!matchLabel.trim() || presentIds.length < 2 || creating}
            onClick={createMatch}>
            {creating ? "Lancement…" : `Lancer le vote · ${presentIds.length} joueurs`}
          </button>
        </div>
      )}

      {/* ── INVITÉS (visible quand match en cours) ── */}
      {activeMatch && (activeMatch.phase || "voting") === "voting" && (
        <>
          <div style={{ marginTop: 28, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
              <span style={{ fontSize: 18 }}>🔗</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--label)" }}>Supporters invités</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--label3)", paddingLeft: 28 }}>Crée un lien unique par invité pour qu'il puisse voter depuis son téléphone.</p>
          </div>

          {guestTokens.length > 0 && (
            <div className="group" style={{ marginBottom: 12 }}>
              {guestTokens.map((gt, i) => (
                <div key={gt.id}>
                  {i > 0 && <div style={{ height: 1, background: "var(--separator)", margin: "0 16px" }} />}
                  <div className="row">
                    <div className="row-body">
                      <div className="row-title" style={{ color: gt.used ? "var(--label3)" : "var(--label)" }}>{gt.name}</div>
                      <div className="row-sub" style={{ color: gt.used ? "var(--green)" : "var(--label3)" }}>
                        {gt.used ? "✓ A voté" : "En attente"}
                      </div>
                    </div>
                    {!gt.used && (
                      <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 13, whiteSpace: "nowrap" }}
                        onClick={() => copyGuestLink(gt.token)}>
                        {copiedToken === gt.token ? "Copié !" : "Copier le lien"}
                      </button>
                    )}
                    <button onClick={() => revokeGuest(gt.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--label4)", padding: "4px 8px" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-8" style={{ marginBottom: 4 }}>
            <input placeholder="Prénom du supporter" value={guestInput}
              onChange={e => setGuestInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createGuestLink()} />
            <button className="btn btn-primary" style={{ whiteSpace: "nowrap", padding: "12px 16px" }}
              onClick={createGuestLink}>
              Créer
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--label4)", marginBottom: 4 }}>Le lien s'ouvre directement sur le formulaire de vote, pré-rempli au nom de l'invité.</p>
        </>
      )}

      {/* ── 2. MES COMPOSITIONS ── */}
      <SectionHeader num="2" title="Mes compositions"
        subtitle="Sauvegarde ta liste habituelle pour la recharger en un clic avant chaque match." />

      {teams.length > 0 && (
        <div className="group" style={{ marginBottom: 12 }}>
          {teams.map((t, i) => (
            <div key={t.id}>
              {i > 0 && <div style={{ height: 1, background: "var(--separator)", margin: "0 16px" }} />}
              <div className="row">
                <div className="row-body">
                  <div className="row-title">{t.name}</div>
                  <div className="row-sub" style={{ marginTop: 3 }}>
                    {players.filter(p => t.player_ids.includes(p.id)).map(p => p.name).join(" · ")}
                  </div>
                </div>
                <button className="btn btn-danger" style={{ padding: "5px 12px", fontSize: 13 }}
                  onClick={() => deleteTeam(t.id, t.name)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        <button className="tag tag-dim" style={{ fontSize: 13, padding: "7px 12px" }}
          onClick={() => setShowNewTeam(v => !v)}>
          {showNewTeam ? "▲ Masquer le formulaire" : "＋ Créer une composition"}
        </button>
      </div>

      {showNewTeam && (
        <div className="group" style={{ padding: "14px 16px", marginBottom: 4 }}>
          <p style={{ fontSize: 13, color: "var(--label3)", marginBottom: 8 }}>Nom de la composition</p>
          <input placeholder="ex : Équipe A, Jeudi soir…" value={teamName}
            onChange={e => setTeamName(e.target.value)} style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 13, color: "var(--label3)", marginBottom: 8 }}>Joueurs à inclure</p>
          <div className="player-grid" style={{ marginBottom: 12 }}>
            {players.map(p => (
              <button key={p.id} className={`player-chip ${teamIds.includes(p.id) ? "sel-1st" : ""}`}
                onClick={() => toggleTeamId(p.id)}>{p.name}</button>
            ))}
          </div>
          <button className="btn btn-primary btn-full"
            disabled={!teamName.trim() || teamIds.length < 2 || savingTeam}
            onClick={saveTeam}>
            {savingTeam ? "Sauvegarde…" : `Sauvegarder · ${teamIds.length} joueur${teamIds.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* ── 3. MES JOUEURS ── */}
      <SectionHeader num="3" title="Mes joueurs"
        subtitle="La liste complète des joueurs. Ajoute chaque membre de l'équipe ici." />


      <div className="flex gap-8" style={{ marginBottom: 12 }}>
        <input placeholder="Prénom du joueur" value={newPlayer}
          onChange={e => setNewPlayer(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addPlayer()} />
        <button className="btn btn-primary" style={{ whiteSpace: "nowrap", padding: "12px 16px" }} onClick={addPlayer}>
          Ajouter
        </button>
      </div>
      <div className="group">
        {players.length === 0
          ? <div className="row"><span style={{ color: "var(--label3)", fontSize: 14 }}>Aucun joueur. Commence par en ajouter un ci-dessus.</span></div>
          : players.map(p => (
            <div key={p.id} className="row">
              <div className="row-body"><div className="row-title">{p.name}</div></div>
              <button className="btn btn-danger" style={{ padding: "5px 12px", fontSize: 13 }}
                onClick={() => removePlayer(p.id, p.name)}>Retirer</button>
            </div>
          ))
        }
      </div>

      {/* ── 4. SAISON ── */}
      <SectionHeader num="4" title="Saison"
        subtitle={`Saison actuelle : ${currentSeason}. Démarre une nouvelle saison pour remettre le classement à zéro sans perdre l'historique.`} />
      <div className="group">
        <div className="row">
          <div className="row-icon green">📅</div>
          <div className="row-body">
            <div className="row-title">Saison {currentSeason} en cours</div>
            <div className="row-sub">Tous les nouveaux matchs appartiennent à cette saison</div>
          </div>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <button className="btn btn-secondary btn-full" onClick={advanceSeason}>
            Démarrer la saison {currentSeason + 1}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [tab,              setTab]              = useState("vote");
  const [players,          setPlayers]          = useState([]);
  const [activeMatch,      setActiveMatch]      = useState(null);
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
        {tab === "vote" && guestStatus !== "checking" && guestStatus !== "invalid" && !guestName && !activeMatch && (
          <div className="content"><div className="empty">Aucun vote en cours.<br />L'admin doit ouvrir un match.</div></div>
        )}
        {tab === "vote" && guestStatus !== "checking" && guestStatus !== "invalid" && !guestName && activeMatch && (activeMatch.phase || "voting") !== "voting" && (
          <div className="content"><div className="empty">🔒 La période de vote est terminée.<br />Consulte l'onglet Résultats.</div></div>
        )}

        {tab === "results" && <ResultsView players={players} match={activeMatch} refreshKey={refreshKey} onMatchUpdate={loadMatch} />}
        {tab === "stats"   && <StatsView players={players} />}
        {tab === "admin"   && <AdminView players={players} onPlayersChange={loadPlayers} activeMatch={activeMatch} onMatchChange={loadMatch} />}
      </div>
    </>
  );
}
