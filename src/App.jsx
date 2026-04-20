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
  matches: [], votes: [], teams: [], nextId: 100,
};

const demoAPI = {
  getPlayers:     () => Promise.resolve([...demoState.players]),
  addPlayer:      (name) => { const p = { id: demoState.nextId++, name }; demoState.players.push(p); return Promise.resolve(p); },
  removePlayer:   (id)   => { demoState.players = demoState.players.filter(p => p.id !== id); return Promise.resolve(true); },
  getActiveMatch: ()     => Promise.resolve(demoState.matches.find(m => m.is_open) || null),
  getMatches:     ()     => Promise.resolve([...demoState.matches].reverse()),
  createMatch: (label, presentIds) => {
    const m = { id: demoState.nextId++, label, present_ids: presentIds, is_open: true, phase: "voting", reveal_order: [], revealed_count: 0, created_at: new Date().toISOString() };
    demoState.matches.push(m); return Promise.resolve(m);
  },
  closeMatch:     (id) => { const m = demoState.matches.find(m => m.id === id); if (m) { m.is_open = false; m.phase = "closed"; } return Promise.resolve(true); },
  startCounting:  (id, order) => { const m = demoState.matches.find(m => m.id === id); if (m) { m.phase = "counting"; m.reveal_order = order; m.revealed_count = 0; } return Promise.resolve(true); },
  revealNext:     (id, count) => { const m = demoState.matches.find(m => m.id === id); if (m) m.revealed_count = count; return Promise.resolve(true); },
  hasVoted:    (matchId, voterName) => Promise.resolve(demoState.votes.some(v => v.match_id === matchId && v.voter_name === voterName)),
  submitVote:  (vote) => { demoState.votes.push({ ...vote, id: demoState.nextId++ }); return Promise.resolve(true); },
  getVotes:    (matchId) => Promise.resolve(demoState.votes.filter(v => v.match_id === matchId)),
  getAllVotes:  ()        => Promise.resolve([...demoState.votes]),
  getTeams:    ()        => Promise.resolve([...demoState.teams]),
  createTeam:  (name, playerIds) => { const t = { id: demoState.nextId++, name, player_ids: playerIds }; demoState.teams.push(t); return Promise.resolve(t); },
  deleteTeam:  (id)      => { demoState.teams = demoState.teams.filter(t => t.id !== id); return Promise.resolve(true); },
};

const realAPI = {
  getPlayers:     async () => { const db = await supabase.from("players"); return db.select("*", { order: "name.asc" }); },
  addPlayer:      async (name) => { const db = await supabase.from("players"); const r = await db.insert({ name }); return r[0]; },
  removePlayer:   async (id)   => { const db = await supabase.from("players"); return db.delete(`id=eq.${id}`); },
  getActiveMatch: async () => { const db = await supabase.from("matches"); const r = await db.select("*", { filter: "is_open=eq.true", order: "created_at.desc" }); return r[0] || null; },
  getMatches:     async () => { const db = await supabase.from("matches"); return db.select("*", { order: "created_at.desc" }); },
  createMatch:    async (label, presentIds) => { const db = await supabase.from("matches"); const r = await db.insert({ label, present_ids: presentIds, is_open: true, phase: "voting" }); return r[0]; },
  closeMatch:     async (id) => { const db = await supabase.from("matches"); return db.update({ is_open: false, phase: "closed" }, `id=eq.${id}`); },
  startCounting:  async (id, order) => { const db = await supabase.from("matches"); return db.update({ phase: "counting", reveal_order: order, revealed_count: 0 }, `id=eq.${id}`); },
  revealNext:     async (id, count) => { const db = await supabase.from("matches"); return db.update({ revealed_count: count }, `id=eq.${id}`); },
  hasVoted:       async (matchId, voterName) => { const db = await supabase.from("votes"); const r = await db.select("id", { filter: `match_id=eq.${matchId}&voter_name=eq.${voterName}` }); return r.length > 0; },
  submitVote:     async (vote) => { const db = await supabase.from("votes"); return db.insert(vote); },
  getVotes:       async (matchId) => { const db = await supabase.from("votes"); return db.select("*", { filter: `match_id=eq.${matchId}` }); },
  getAllVotes:     async () => { const db = await supabase.from("votes"); return db.select("*"); },
  getTeams:       async () => { const db = await supabase.from("teams"); return db.select("*", { order: "name.asc" }); },
  createTeam:     async (name, playerIds) => { const db = await supabase.from("teams"); const r = await db.insert({ name, player_ids: playerIds }); return r[0]; },
  deleteTeam:     async (id) => { const db = await supabase.from("teams"); return db.delete(`id=eq.${id}`); },
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
function VoteView({ players, match, onVoted }) {
  const [voterName,    setVoterName]    = useState("");
  const [step,         setStep]         = useState(0);
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
    setSubmitting(false);
    onVoted();
  };

  if (!match.is_open) return (
    <div className="content"><div className="empty">🔒 Vote fermé.<br />Consulte les résultats.</div></div>
  );

  return (
    <div className="content">
      {step === 0 && (
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
              <p className="section-label mb-4">La Pépite — 2 points</p>
              <div className="player-grid">
                {present.filter(p => p.name !== voterName).map(p => (
                  <button key={p.id} className={`player-chip ${best1?.id === p.id ? "sel-1st" : ""}`}
                    onClick={() => setBest1(p)}>{p.name}</button>
                ))}
              </div>
              {best1 && (
                <>
                  <p className="section-label mt-12 mb-4">Commentaire</p>
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
              <p className="section-label mb-4">2ème meilleur — 1 point</p>
              <div className="player-grid">
                {present.filter(p => p.name !== voterName && p.id !== best1?.id).map(p => (
                  <button key={p.id} className={`player-chip ${best2?.id === p.id ? "sel-2nd" : ""}`}
                    onClick={() => setBest2(p)}>{p.name}</button>
                ))}
              </div>
              {best2 && (
                <>
                  <p className="section-label mt-12 mb-4">Commentaire</p>
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
              <p className="section-label mb-4" style={{ color: "var(--lemon)" }}>Le Citron — 1 point</p>
              <div className="player-grid">
                {present.filter(p => p.name !== voterName && p.id !== best1?.id && p.id !== best2?.id).map(p => (
                  <button key={p.id} className={`player-chip ${lemon?.id === p.id ? "sel-lemon" : ""}`}
                    onClick={() => setLemon(p)}>{p.name}</button>
                ))}
              </div>
              {lemon && (
                <>
                  <p className="section-label mt-12 mb-4">Commentaire</p>
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
function Scoreboard({ votes, present, showLemons = true }) {
  const { best, lemon } = computeScores(votes, present);
  const bestRanked = present
    .map(p => ({ ...p, pts: best[p.id]?.pts || 0, comments: best[p.id]?.comments || [] }))
    .filter(p => p.pts > 0).sort((a, b) => b.pts - a.pts);
  const lemonRanked = present
    .map(p => ({ ...p, pts: lemon[p.id]?.pts || 0, comments: lemon[p.id]?.comments || [] }))
    .filter(p => p.pts > 0).sort((a, b) => b.pts - a.pts);
  const maxBest  = bestRanked[0]?.pts || 1;
  const maxLemon = lemonRanked[0]?.pts || 1;

  return (
    <>
      <p className="section-label mb-4">Pépites</p>
      <div className="group">
        {bestRanked.length === 0
          ? <div className="row"><span style={{ color: "var(--label3)", fontSize: 14 }}>Aucun vote révélé…</span></div>
          : bestRanked.map((p, i) => (
            <div key={p.id}>
              <div className="row">
                <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0, color: i === 0 ? "var(--gold)" : "var(--label3)" }}>{i + 1}</div>
                <div className="row-body"><div className="row-title">{p.name}</div></div>
                <div className="score-bar-wrap">
                  <div className="score-bar" style={{ width: `${(p.pts / maxBest) * 100}%`, background: i === 0 ? "var(--gold)" : "var(--label3)" }} />
                </div>
                <div className="row-value gold" style={{ minWidth: 28, textAlign: "right" }}>{p.pts}</div>
              </div>
              {p.comments.map((c, j) => <div key={j} className="comment">"{c}"</div>)}
            </div>
          ))
        }
      </div>
      {showLemons && lemonRanked.length > 0 && (
        <>
          <p className="section-label mb-4" style={{ color: "var(--lemon)" }}>Citrons</p>
          <div className="group">
            {lemonRanked.map((p) => (
              <div key={p.id}>
                <div className="row">
                  <div className="row-icon lemon">🍋</div>
                  <div className="row-body"><div className="row-title">{p.name}</div></div>
                  <div className="score-bar-wrap">
                    <div className="score-bar" style={{ width: `${(p.pts / maxLemon) * 100}%`, background: "var(--lemon)" }} />
                  </div>
                  <div className="row-value lemon" style={{ minWidth: 28, textAlign: "right" }}>{p.pts}</div>
                </div>
                {p.comments.map((c, j) => <div key={j} className="comment">"{c}"</div>)}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ============================================================
// RESULTS VIEW
// ============================================================
function ResultsView({ players, match, refreshKey, onMatchUpdate }) {
  const [votes,   setVotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);

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
    const revealOrder  = match.reveal_order  || [];
    const revealedCount = match.revealed_count || 0;
    const isDone       = revealedCount >= revealOrder.length;

    const currentVoteId  = !isDone ? revealOrder[revealedCount] : null;
    const currentVote    = currentVoteId ? votes.find(v => v.id === currentVoteId) : null;
    const revealedVoteIds = revealOrder.slice(0, revealedCount);
    const revealedVotes  = votes.filter(v => revealedVoteIds.includes(v.id));

    const playerName = (id) => players.find(p => p.id === id)?.name || "?";

    const handleNext = async () => {
      setRevealing(true);
      await api.revealNext(match.id, revealedCount + 1);
      await onMatchUpdate();
      setRevealing(false);
    };

    const handleFinish = async () => {
      await api.closeMatch(match.id);
      await onMatchUpdate();
    };

    return (
      <div className="content">
        <MatchHeader badge={<span className="badge" style={{ background: "rgba(170,221,0,0.15)", color: "var(--lemon)" }}>Dépouillement</span>} />

        {!isDone && currentVote ? (
          <div style={{
            background: "var(--bg2)", borderRadius: "var(--radius-lg)",
            border: "1px solid var(--separator2)", marginBottom: 16, overflow: "hidden",
          }}>
            <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--separator)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--label3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Vote {revealedCount + 1} sur {revealOrder.length}
              </span>
              <div style={{ display: "flex", gap: 3 }}>
                {revealOrder.map((_, i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i < revealedCount ? "var(--label2)" : i === revealedCount ? "var(--gold)" : "var(--bg4)" }} />
                ))}
              </div>
            </div>

            <div style={{ padding: "16px 16px 4px" }}>
              <div className="row" style={{ padding: "10px 0", borderBottom: "1px solid var(--separator)" }}>
                <div className="row-icon gold">⭐</div>
                <div className="row-body">
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--label3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>La Pépite · 2 pts</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>{playerName(currentVote.best1_id)}</div>
                  {currentVote.best1_comment && <div style={{ fontSize: 13, color: "var(--label3)", fontStyle: "italic", marginTop: 3 }}>"{currentVote.best1_comment}"</div>}
                </div>
              </div>
              <div className="row" style={{ padding: "10px 0", borderBottom: "1px solid var(--separator)" }}>
                <div className="row-icon" style={{ background: "var(--gold-subtle)" }}>⭐</div>
                <div className="row-body">
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--label3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>2ème · 1 pt</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{playerName(currentVote.best2_id)}</div>
                  {currentVote.best2_comment && <div style={{ fontSize: 13, color: "var(--label3)", fontStyle: "italic", marginTop: 3 }}>"{currentVote.best2_comment}"</div>}
                </div>
              </div>
              <div className="row" style={{ padding: "10px 0" }}>
                <div className="row-icon lemon">🍋</div>
                <div className="row-body">
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--label3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Le Citron</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--lemon)" }}>{playerName(currentVote.lemon_id)}</div>
                  {currentVote.lemon_comment && <div style={{ fontSize: 13, color: "var(--label3)", fontStyle: "italic", marginTop: 3 }}>"{currentVote.lemon_comment}"</div>}
                </div>
              </div>
            </div>

            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--separator)" }}>
              <button className="btn btn-primary btn-full" onClick={handleNext} disabled={revealing}>
                {revealing ? "…" : revealedCount + 1 < revealOrder.length ? "Vote suivant →" : "Voir le classement final →"}
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
          <>
            <p className="section-label mb-4" style={{ marginTop: 8 }}>
              Classement · {revealedCount}/{revealOrder.length} vote{revealedCount > 1 ? "s" : ""} révélé{revealedCount > 1 ? "s" : ""}
            </p>
            <Scoreboard votes={revealedVotes} present={present} />
          </>
        )}
      </div>
    );
  }

  // ── CLOSED : full results ──
  return (
    <div className="content">
      <MatchHeader badge={<span className="badge badge-closed">Clôturé</span>} />
      <Scoreboard votes={votes} present={present} />
    </div>
  );
}

// ============================================================
// STATS VIEW
// ============================================================
function StatsView({ players }) {
  const [allVotes,   setAllVotes]   = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([api.getAllVotes(), api.getMatches()]).then(([v, m]) => {
      setAllVotes(v); setAllMatches(m); setLoading(false);
    });
  }, []);

  if (loading) return <div className="content"><div className="empty">Chargement…</div></div>;
  if (!allVotes.length) return <div className="content"><div className="empty">Pas encore de stats.<br />Joue quelques matchs !</div></div>;

  const stats = {};
  players.forEach(p => { stats[p.id] = { name: p.name, bestPts: 0, lemonPts: 0, wins: 0, lemons: 0 }; });

  allMatches.forEach(match => {
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

  const ranked = Object.values(stats).filter(s => s.bestPts > 0 || s.lemonPts > 0).sort((a, b) => b.bestPts - a.bestPts);
  const maxPts = ranked[0]?.bestPts || 1;

  return (
    <div className="content">
      <p className="section-label mt-4 mb-4">Classement saison</p>
      <div style={{ fontSize: 12, color: "var(--label3)", marginBottom: 8 }}>
        {allMatches.length} match{allMatches.length !== 1 ? "s" : ""}
      </div>
      <div className="group">
        {ranked.map((s, i) => (
          <div key={s.name} className="row">
            <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0,
              color: i === 0 ? "var(--gold)" : "var(--label3)" }}>{i + 1}</div>
            <div className="row-body">
              <div className="row-title">{s.name}</div>
              <div className="flex gap-8 mt-4">
                {s.wins   > 0 && <span className="tag tag-gold">⭐ ×{s.wins}</span>}
                {s.lemons > 0 && <span className="tag tag-lemon">🍋 ×{s.lemons}</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <div className="flex gap-8" style={{ alignItems: "center" }}>
                <div className="score-bar-wrap">
                  <div className="score-bar" style={{ width: `${(s.bestPts / maxPts) * 100}%`,
                    background: i === 0 ? "var(--gold)" : "var(--label3)" }} />
                </div>
                <div className="row-value gold" style={{ minWidth: 24, textAlign: "right" }}>{s.bestPts}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--label3)" }}>{s.lemonPts} 🍋</div>
            </div>
          </div>
        ))}
      </div>

      <p className="section-label mb-4" style={{ color: "var(--lemon)" }}>Hall of Shame</p>
      <div className="group">
        {Object.values(stats).filter(s => s.lemonPts > 0).sort((a, b) => b.lemonPts - a.lemonPts).map(s => (
          <div key={s.name} className="row">
            <div className="row-icon lemon">🍋</div>
            <div className="row-body"><div className="row-title">{s.name}</div></div>
            <div style={{ fontSize: 12, color: "var(--label3)", marginRight: 10 }}>{s.lemons} fois</div>
            <div className="row-value lemon">{s.lemonPts}</div>
          </div>
        ))}
      </div>
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
  const [teams,        setTeams]        = useState([]);
  const [teamName,     setTeamName]     = useState("");
  const [teamIds,      setTeamIds]      = useState([]);
  const [showNewTeam,  setShowNewTeam]  = useState(true);
  const [savingTeam,   setSavingTeam]   = useState(false);

  const loadTeams = useCallback(async () => { setTeams(await api.getTeams()); }, []);

  useEffect(() => { loadTeams(); }, []);

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

  const loadTeamIntoMatch = (team) => setPresentIds([...team.player_ids]);

  const createMatch = async () => {
    if (!matchLabel.trim() || presentIds.length < 2) return;
    setCreating(true);
    await api.createMatch(matchLabel.trim(), presentIds);
    setMatchLabel(""); setPresentIds([]);
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

  const handleVoted = () => {
    setVotedThisSession(true);
    setTab("results");
    setRefreshKey(k => k + 1);
  };

  return (
    <>
      <GlobalStyle />
      <div className="app-wrapper">
        <div className="header">
          <div className="header-logo">
            <span className="header-pepite">Pépite</span>
            <span className="header-amp"> & </span>
            <span className="header-citron">Citron</span>
          </div>
          <div className="header-sub">
            {activeMatch ? activeMatch.label : "Aucun match en cours"}
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

        {tab === "vote" && !votedThisSession && activeMatch && (activeMatch.phase || "voting") === "voting" && (
          <VoteView players={players} match={activeMatch} onVoted={handleVoted} />
        )}
        {tab === "vote" && votedThisSession && (
          <div className="content" style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Vote enregistré</div>
            <div style={{ fontSize: 14, color: "var(--label3)", marginBottom: 24 }}>
              Les résultats se mettent à jour en temps réel.
            </div>
            <button className="btn btn-primary" onClick={() => setTab("results")}>Voir les résultats</button>
          </div>
        )}
        {tab === "vote" && !activeMatch && (
          <div className="content"><div className="empty">Aucun vote en cours.<br />L'admin doit ouvrir un match.</div></div>
        )}
        {tab === "vote" && activeMatch && (activeMatch.phase || "voting") !== "voting" && (
          <div className="content"><div className="empty">🔒 La période de vote est terminée.<br />Consulte l'onglet Résultats.</div></div>
        )}

        {tab === "results" && <ResultsView players={players} match={activeMatch} refreshKey={refreshKey} onMatchUpdate={loadMatch} />}
        {tab === "stats"   && <StatsView players={players} />}
        {tab === "admin"   && <AdminView players={players} onPlayersChange={loadPlayers} activeMatch={activeMatch} onMatchChange={loadMatch} />}
      </div>
    </>
  );
}
