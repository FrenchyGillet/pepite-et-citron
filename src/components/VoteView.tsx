import { useState, useRef, useEffect } from 'react';
import { api } from '@/api';
import { markVotedLocally, classifyVoteError } from '@/utils/vote';
import type { Player, Match } from '@/types';

interface VoteViewProps {
  players: Player[];
  match: Match;
  onVoted: (voterName: string) => void;
  guestName?: string | null;
  onGuestVoted?: (() => Promise<void>) | null;
}

export function VoteView({ players, match, onVoted, guestName = null, onGuestVoted = null }: VoteViewProps) {
  const [voterName,    setVoterName]    = useState(guestName || '');
  const [step,         setStep]         = useState(guestName ? 1 : 0);
  const [best1,        setBest1]        = useState<Player | null>(null);
  const [best1Comment, setBest1Comment] = useState('');
  const [best2,        setBest2]        = useState<Player | null>(null);
  const [best2Comment, setBest2Comment] = useState('');
  const [best3,        setBest3]        = useState<Player | null>(null);
  const [best3Comment, setBest3Comment] = useState('');
  const [lemon,        setLemon]        = useState<Player | null>(null);
  const [lemonComment, setLemonComment] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [checking,     setChecking]     = useState(false);

  // Scroll to the comment+action area after a player is selected so
  // voters with long player lists don't miss the input/button below the fold.
  const actionRef = useRef<HTMLDivElement>(null);
  const scrollToAction = () =>
    requestAnimationFrame(() =>
      actionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    );

  const pepiteCount  = match.pepite_count ?? 2;
  const lemonStep    = pepiteCount === 3 ? 4 : 3;
  const summaryStep  = pepiteCount === 3 ? 5 : 4;
  const stepBarCount = pepiteCount === 3 ? 4 : 3;

  // Absent players are collapsed by default on the lemon step.
  // Reset the collapsed state every time the lemon step is entered.
  const [absentOpen, setAbsentOpen] = useState(false);
  useEffect(() => { if (step === lemonStep) setAbsentOpen(false); }, [step, lemonStep]);

  const presentIds = match.present_ids || [];
  const present = players.filter(p =>  presentIds.includes(p.id));
  const absent  = players.filter(p => !presentIds.includes(p.id));

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
    setSubmitError(null);
    try {
      await api.submitVote({
        match_id: match.id, voter_name: voterName,
        best1_id: best1?.id, best1_comment: best1Comment,
        best2_id: best2?.id, best2_comment: best2Comment,
        ...(pepiteCount === 3 ? { best3_id: best3?.id, best3_comment: best3Comment } : {}),
        lemon_id: lemon?.id, lemon_comment: lemonComment,
      });
      if (onGuestVoted) await onGuestVoted();
      markVotedLocally(match.id);
      onVoted(voterName);
    } catch (err) {
      setSubmitError(classifyVoteError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!match.is_open || (match.phase && match.phase !== 'voting')) return (
    <div className="content"><div className="empty">🔒 Vote clôturé.<br />Consulte les résultats.</div></div>
  );

  return (
    <div className="content">
      {guestName && (
        <div style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-dim)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>👋</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>Bienvenu(e), {guestName} !</div>
            <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>Tu votes en tant que supporter.</div>
          </div>
        </div>
      )}

      {step === 0 && !guestName && (
        <>
          {/* Context banner for first-time anonymous voters */}
          <div style={{
            background: 'linear-gradient(135deg, var(--gold-subtle) 0%, var(--lemon-subtle) 100%)',
            border: '1px solid var(--separator2)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            marginBottom: 20,
            marginTop: 8,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)', marginBottom: 4 }}>
              ⭐ Pépite &amp; 🍋 Citron · {match.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--label3)', lineHeight: 1.5 }}>
              Désigne le meilleur joueur du match et celui qui a le moins performé.
              Vote anonyme — personne ne voit qui a voté quoi.
            </div>
          </div>
          <p className="section-label mb-4">Qui es-tu ?</p>
          <div className="player-grid">
            {present.map(p => (
              <button key={String(p.id)} className={`player-chip ${voterName === p.name ? 'sel-1st' : ''}`}
                onClick={() => setVoterName(p.name)}>{p.name}</button>
            ))}
          </div>
          {alreadyVoted && (
            <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>
              Tu as déjà voté pour ce match.
            </div>
          )}
          <button className="btn btn-primary btn-full mt-12"
            disabled={!voterName || checking} onClick={checkAndNext}>
            {checking ? 'Vérification…' : 'Continuer'}
          </button>
        </>
      )}

      {step >= 1 && step <= summaryStep - 1 && (
        <>
          <div className="step-bar mt-8">
            {Array.from({ length: stepBarCount }, (_, i) => i + 1).map(i => (
              <div key={i} className={`step-seg ${step > i ? 'done' : step === i ? 'active' : ''}`} />
            ))}
          </div>

          {step === 1 && (
            <>
              <div style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-dim)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }}>⭐</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>La Pépite</div>
                  <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 3 }}>Qui a tout déchiré aujourd'hui ?</div>
                </div>
                <div style={{ background: 'var(--gold)', color: '#000', borderRadius: 20, padding: '4px 11px', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  {pepiteCount === 3 ? '3 pts' : '2 pts'}
                </div>
              </div>
              <div className="player-grid">
                {present.filter(p => p.name !== voterName).map(p => (
                  <button key={String(p.id)} className={`player-chip ${best1?.id === p.id ? 'sel-1st' : ''}`}
                    onClick={() => { setBest1(p); scrollToAction(); }}>{p.name}</button>
                ))}
              </div>
              <div ref={actionRef}>
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
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ background: 'rgba(255,214,10,0.04)', border: '1px solid rgba(255,214,10,0.12)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, opacity: 0.6 }}>⭐</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,214,10,0.7)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>2ème meilleur</div>
                  <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 3 }}>Et son fidèle dauphin du soir ?</div>
                </div>
                <div style={{ background: 'rgba(255,214,10,0.15)', color: 'var(--gold)', borderRadius: 20, padding: '4px 11px', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  {pepiteCount === 3 ? '2 pts' : '1 pt'}
                </div>
              </div>
              <div className="player-grid">
                {present.filter(p => p.name !== voterName && p.id !== best1?.id).map(p => (
                  <button key={String(p.id)} className={`player-chip ${best2?.id === p.id ? 'sel-2nd' : ''}`}
                    onClick={() => { setBest2(p); scrollToAction(); }}>{p.name}</button>
                ))}
              </div>
              <div ref={actionRef}>
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
              </div>
            </>
          )}

          {pepiteCount === 3 && step === 3 && (
            <>
              <div style={{ background: 'rgba(255,214,10,0.02)', border: '1px solid rgba(255,214,10,0.08)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, opacity: 0.4 }}>⭐</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,214,10,0.5)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>3ème meilleur</div>
                  <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 3 }}>Et la troisième pépite ?</div>
                </div>
                <div style={{ background: 'rgba(255,214,10,0.08)', color: 'rgba(255,214,10,0.5)', borderRadius: 20, padding: '4px 11px', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  1 pt
                </div>
              </div>
              <div className="player-grid">
                {present.filter(p => p.name !== voterName && p.id !== best1?.id && p.id !== best2?.id).map(p => (
                  <button key={String(p.id)} className={`player-chip ${best3?.id === p.id ? 'sel-2nd' : ''}`}
                    onClick={() => { setBest3(p); scrollToAction(); }}>{p.name}</button>
                ))}
              </div>
              <div ref={actionRef}>
                {best3 && (
                  <>
                    <p className="section-label mt-12 mb-4">Commentaire (optionnel)</p>
                    <input placeholder={`Pourquoi ${best3.name} ?`} value={best3Comment}
                      onChange={e => setBest3Comment(e.target.value)} />
                  </>
                )}
                <div className="flex gap-8 mt-12">
                  <button className="btn btn-secondary" onClick={() => setStep(2)}>Retour</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={!best3} onClick={() => setStep(4)}>Suivant</button>
                </div>
              </div>
            </>
          )}

          {step === lemonStep && (
            <>
              <div style={{ background: 'var(--lemon-subtle)', border: '1px solid var(--lemon-dim)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }}>🍋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--lemon)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>Le Citron</div>
                  <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 3 }}>Qui a souffert ce soir ?</div>
                </div>
                <div style={{ background: 'var(--lemon-dim)', color: 'var(--lemon)', borderRadius: 20, padding: '4px 11px', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>1 pt</div>
              </div>
              <div className="player-grid">
                {present.map(p => (
                  <button key={String(p.id)} className={`player-chip ${lemon?.id === p.id ? 'sel-lemon' : ''}`}
                    onClick={() => { setLemon(p); scrollToAction(); }}>{p.name}</button>
                ))}
              </div>
              {absent.length > 0 && (
                <>
                  <button
                    onClick={() => setAbsentOpen(o => !o)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'none', border: 'none', padding: '14px 0 8px',
                      cursor: 'pointer', color: 'var(--label3)',
                      fontSize: 12, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    <svg
                      width="12" height="12" viewBox="0 0 12 12" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      style={{ transition: 'transform 0.2s', transform: absentOpen ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
                    >
                      <polyline points="4 2 9 6 4 10" />
                    </svg>
                    Absents · {absent.length}
                  </button>
                  {absentOpen && (
                    <div className="player-grid">
                      {absent.map(p => (
                        <button key={String(p.id)}
                          className={`player-chip ${lemon?.id === p.id ? 'sel-lemon' : ''}`}
                          onClick={() => { setLemon(p); scrollToAction(); }}
                          style={{ opacity: lemon?.id === p.id ? 1 : 0.5, borderStyle: 'dashed' }}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div ref={actionRef}>
                {lemon && (
                  <>
                    <p className="section-label mt-12 mb-4">Commentaire (optionnel)</p>
                    <input placeholder={`Pourquoi ${lemon.name} ?`} value={lemonComment}
                      onChange={e => setLemonComment(e.target.value)} />
                  </>
                )}
                <div className="flex gap-8 mt-12">
                  <button className="btn btn-secondary" onClick={() => setStep(lemonStep - 1)}>Retour</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={!lemon} onClick={() => setStep(summaryStep)}>Suivant</button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {step === summaryStep && (
        <>
          <p className="section-label mt-8 mb-4">Récapitulatif</p>
          <div className="group">
            <div className="row">
              <div className="row-icon gold">⭐</div>
              <div className="row-body">
                <div className="row-title">{best1?.name}</div>
                {best1Comment && <div className="row-sub">{best1Comment}</div>}
              </div>
              <span className="tag tag-gold">{pepiteCount === 3 ? '3 pts' : '2 pts'}</span>
            </div>
            <div className="row">
              <div className="row-icon" style={{ background: 'var(--gold-subtle)', opacity: 0.7 }}>⭐</div>
              <div className="row-body">
                <div className="row-title">{best2?.name}</div>
                {best2Comment && <div className="row-sub">{best2Comment}</div>}
              </div>
              <span className="tag tag-dim">{pepiteCount === 3 ? '2 pts' : '1 pt'}</span>
            </div>
            {pepiteCount === 3 && (
              <div className="row">
                <div className="row-icon" style={{ background: 'var(--gold-subtle)', opacity: 0.4 }}>⭐</div>
                <div className="row-body">
                  <div className="row-title">{best3?.name}</div>
                  {best3Comment && <div className="row-sub">{best3Comment}</div>}
                </div>
                <span className="tag tag-dim">1 pt</span>
              </div>
            )}
            <div className="row">
              <div className="row-icon lemon">🍋</div>
              <div className="row-body">
                <div className="row-title">{lemon?.name}</div>
                {lemonComment && <div className="row-sub">{lemonComment}</div>}
              </div>
              <span className="tag tag-lemon">Citron</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--label3)', textAlign: 'center', marginBottom: 12 }}>
            Ton vote est anonyme. Assume tes choix.
          </p>
          {submitError && (
            <div style={{
              background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.25)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 12,
              fontSize: 13, color: 'var(--red, #ff3b30)', textAlign: 'center',
            }}>
              ⚠️ {submitError}
            </div>
          )}
          <div className="flex gap-8">
            <button className="btn btn-secondary" onClick={() => setStep(lemonStep)}>Modifier</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={submit}>
              {submitting ? 'Envoi…' : submitError ? 'Réessayer' : 'Rendre mon verdict →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
