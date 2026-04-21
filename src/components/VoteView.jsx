import { useState } from 'react';
import { api } from '../api.js';

export function VoteView({ players, match, onVoted, guestName = null, onGuestVoted = null }) {
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
                {present.map(p => (
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
