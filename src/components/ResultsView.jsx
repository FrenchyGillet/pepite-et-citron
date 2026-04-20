import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { computeScores, formatDate } from '../utils.js';
import { Scoreboard } from './Scoreboard.jsx';
import { PodiumView } from './PodiumView.jsx';

export function ResultsView({ players, match, refreshKey, onMatchUpdate }) {
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
