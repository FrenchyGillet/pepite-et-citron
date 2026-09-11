import { useState, useRef, useEffect } from 'react';
import { api } from '@/api';
import { markVotedLocally, classifyVoteError, getStoredVoterIdentity, saveVoterIdentity, loadVoteDraft, saveVoteDraft, clearVoteDraft } from '@/utils/vote';
import type { VoteDraft } from '@/utils/vote';
import { saveOfflineVote, isNetworkError } from '@/utils/offlineVote';
import { useVoteCount } from '@/hooks/queries';
import { useAppStore } from '@/store/appStore';
import type { Player, Match, EntityId } from '@/types';

// Server-side cap in submit_vote (20260014).
const COMMENT_MAX_LENGTH = 280;

interface VoteViewProps {
  players: Player[];
  match: Match;
  onVoted: (voterName: string, playerId?: EntityId) => void;
  guestName?: string | null;
  onGuestVoted?: (() => Promise<void>) | null;
}

interface Picks {
  best1: Player | null;
  best2: Player | null;
  best3: Player | null;
  lemon: Player | null;
}

export function VoteView({ players, match, onVoted, guestName = null, onGuestVoted = null }: VoteViewProps) {
  // ── Voter identity: restore from localStorage if the player is present ───
  const storedIdentity = !guestName ? getStoredVoterIdentity() : null;
  const presentIds = match.present_ids || [];
  // Single-use invite link: travels with the vote and is consumed server-side.
  const guestToken = useAppStore(s => s.guestToken);

  const storedPlayer = storedIdentity
    ? (players.find(p => p.id === storedIdentity.playerId && presentIds.includes(p.id))
       ?? players.find(p => p.name === storedIdentity.name && presentIds.includes(p.id)))
    : null;

  // ── Draft persistence: restore in-progress vote so a refresh / screen-lock
  //    resumes from the last completed step (not step 0).
  //    Draft takes priority over storedPlayer; guests never have a draft.
  const draft = !guestName ? loadVoteDraft(match.id) : null;
  const draftVoterPlayer = draft?.voterPlayerId != null
    ? (players.find(p => p.id === draft.voterPlayerId) ?? null)
    : null;

  const [voterName,           setVoterName]           = useState(guestName || draft?.voterName || storedPlayer?.name || '');
  const [selectedVoterPlayer, setSelectedVoterPlayer] = useState<Player | null>(draftVoterPlayer ?? storedPlayer ?? null);
  // Draft step > storedPlayer recognition > step 0
  const [step,         setStep]         = useState(guestName ? 1 : draft ? draft.step : storedPlayer ? 1 : 0);
  const [best1,        setBest1]        = useState<Player | null>(draft?.best1Id != null ? (players.find(p => p.id === draft.best1Id) ?? null) : null);
  const [best1Comment, setBest1Comment] = useState(draft?.best1Comment ?? '');
  const [best2,        setBest2]        = useState<Player | null>(draft?.best2Id != null ? (players.find(p => p.id === draft.best2Id) ?? null) : null);
  const [best2Comment, setBest2Comment] = useState(draft?.best2Comment ?? '');
  const [best3,        setBest3]        = useState<Player | null>(draft?.best3Id != null ? (players.find(p => p.id === draft.best3Id) ?? null) : null);
  const [best3Comment, setBest3Comment] = useState(draft?.best3Comment ?? '');
  const [lemon,        setLemon]        = useState<Player | null>(draft?.lemonId != null ? (players.find(p => p.id === draft.lemonId) ?? null) : null);
  const [lemonComment, setLemonComment] = useState(draft?.lemonComment ?? '');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [checking,     setChecking]     = useState(false);
  const [checkError,   setCheckError]   = useState<string | null>(null);

  // With auto-advance, the next step would otherwise open wherever the long
  // player list left the page — bring the top of the vote card back into view.
  const topRef = useRef<HTMLDivElement>(null);
  const scrollToTop = () =>
    requestAnimationFrame(() =>
      topRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    );

  const pepiteCount  = match.pepite_count ?? 2;
  const lemonStep    = pepiteCount === 3 ? 4 : 3;
  const summaryStep  = pepiteCount === 3 ? 5 : 4;
  const stepBarCount = pepiteCount === 3 ? 4 : 3;

  // Picks are passed explicitly by the tap handlers: the matching setState has
  // not been applied yet when the draft is written.
  const buildDraft = (draftStep: number, picks: Partial<Picks> = {}): VoteDraft => {
    const p: Picks = { best1, best2, best3, lemon, ...picks };
    return {
      step: draftStep,
      voterName,
      voterPlayerId: selectedVoterPlayer?.id ?? null,
      best1Id: p.best1?.id ?? null,  best1Comment,
      best2Id: p.best2?.id ?? null,  best2Comment,
      best3Id: p.best3?.id ?? null,  best3Comment,
      lemonId: p.lemon?.id ?? null,  lemonComment,
    };
  };

  // Save a draft snapshot then show nextStep, so a refresh always resumes at
  // the step the voter last reached, with their selections intact.
  const goToStep = (nextStep: number, picks: Partial<Picks> = {}) => {
    if (!guestName) saveVoteDraft(match.id, buildDraft(nextStep, picks));
    setStep(nextStep);
    scrollToTop();
  };

  // Comments are typed on the recap: keep the draft in sync so a screen-lock
  // does not lose them.
  useEffect(() => {
    if (step === summaryStep && !guestName) saveVoteDraft(match.id, buildDraft(summaryStep));
    // buildDraft reads the latest state; only comment edits should re-save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [best1Comment, best2Comment, best3Comment, lemonComment]);

  // ── Tap handlers: one tap = one pick = next step ──────────────────────────
  // Re-picking an earlier rank drops a later pick that became a duplicate
  // (submit_vote rejects the same player twice).
  const pickBest1 = (p: Player) => {
    const next = { best1: p, best2: best2?.id === p.id ? null : best2, best3: best3?.id === p.id ? null : best3 };
    setBest1(next.best1); setBest2(next.best2); setBest3(next.best3);
    goToStep(2, next);
  };
  const pickBest2 = (p: Player) => {
    const next = { best2: p, best3: best3?.id === p.id ? null : best3 };
    setBest2(next.best2); setBest3(next.best3);
    goToStep(3, next); // 3 = third pépite (3-pépite mode) or citron (2-pépite mode)
  };
  const pickBest3 = (p: Player) => { setBest3(p); goToStep(lemonStep, { best3: p }); };
  const pickLemon = (p: Player) => { setLemon(p); goToStep(summaryStep, { lemon: p }); };

  // Absent players are collapsed by default on the lemon step.
  // Reset the collapsed state every time the lemon step is entered.
  const [absentOpen, setAbsentOpen] = useState(false);
  useEffect(() => { if (step === lemonStep) setAbsentOpen(false); }, [step, lemonStep]);

  const present = players.filter(p =>  presentIds.includes(p.id));
  // Absents can still get the citron — but not players archived from the roster.
  const absent  = players.filter(p => !presentIds.includes(p.id) && !p.archived_at);

  // Real-time vote count — updated via Realtime subscription in useRealtime()
  const { data: voteCount = 0 } = useVoteCount(match.id);
  const presentCount = present.length;

  // Tapping your first name checks you haven't voted yet, then starts the vote.
  const pickIdentity = async (p: Player) => {
    setVoterName(p.name);
    setSelectedVoterPlayer(p);
    setAlreadyVoted(false);
    setCheckError(null);
    setChecking(true);
    let voted = false;
    try {
      voted = await api.hasVoted(match.id, p.name, p.id);
    } catch {
      // Réseau instable (vestiaire) — ne pas bloquer le votant sur
      // « Vérification… ». submit_vote dédoublonne de toute façon.
      setChecking(false);
      setCheckError('Connexion instable. Touche ton prénom pour réessayer.');
      return;
    }
    setChecking(false);
    if (voted) { setAlreadyVoted(true); return; }
    // A new identity starts from blank picks (you can't be your own pépite).
    setBest1(null); setBest2(null); setBest3(null); setLemon(null);
    setBest1Comment(''); setBest2Comment(''); setBest3Comment(''); setLemonComment('');
    saveVoteDraft(match.id, {
      step: 1, voterName: p.name, voterPlayerId: p.id,
      best1Id: null, best1Comment: '',
      best2Id: null, best2Comment: '',
      best3Id: null, best3Comment: '',
      lemonId: null, lemonComment: '',
    });
    setStep(1);
    scrollToTop();
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    const votePayload = {
      match_id: match.id, voter_name: voterName,
      ...(selectedVoterPlayer ? { voter_player_id: selectedVoterPlayer.id } : {}),
      best1_id: best1?.id,   best1_comment: best1Comment,
      best2_id: best2?.id,   best2_comment: best2Comment,
      ...(pepiteCount === 3 ? { best3_id: best3?.id, best3_comment: best3Comment } : {}),
      lemon_id: lemon?.id,   lemon_comment: lemonComment,
      ...(guestName && guestToken ? { guest_token: guestToken } : {}),
    };

    // ── Offline-first: if device is offline, queue locally and proceed ──────
    if (!navigator.onLine) {
      saveOfflineVote(votePayload);
      clearVoteDraft(match.id);
      markVotedLocally(match.id);
      saveVoterIdentity(voterName, selectedVoterPlayer?.id ?? null);
      setSubmitting(false);
      onVoted(voterName, selectedVoterPlayer?.id);
      return;
    }

    try {
      await api.submitVote(votePayload);
      if (onGuestVoted) await onGuestVoted();
      clearVoteDraft(match.id);
      markVotedLocally(match.id);
      saveVoterIdentity(voterName, selectedVoterPlayer?.id ?? null);
      onVoted(voterName, selectedVoterPlayer?.id);
    } catch (err) {
      // Transient network failure → save offline and proceed optimistically
      if (isNetworkError(err)) {
        saveOfflineVote(votePayload);
        clearVoteDraft(match.id);
        markVotedLocally(match.id);
        saveVoterIdentity(voterName, selectedVoterPlayer?.id ?? null);
        setSubmitting(false);
        onVoted(voterName, selectedVoterPlayer?.id);
        return;
      }
      setSubmitError(classifyVoteError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!match.is_open || (match.phase && match.phase !== 'voting')) return (
    <div className="content"><div className="empty">🔒 Vote clôturé.<br />Consulte les résultats.</div></div>
  );

  const summaryRows = [
    { key: 'best1', player: best1, comment: best1Comment, setComment: setBest1Comment,
      icon: '⭐', iconClass: 'row-icon gold', iconStyle: undefined,
      tagClass: 'tag tag-gold', tag: pepiteCount === 3 ? '3 pts' : '2 pts' },
    { key: 'best2', player: best2, comment: best2Comment, setComment: setBest2Comment,
      icon: '⭐', iconClass: 'row-icon', iconStyle: { background: 'var(--gold-subtle)', opacity: 0.7 },
      tagClass: 'tag tag-dim', tag: pepiteCount === 3 ? '2 pts' : '1 pt' },
    ...(pepiteCount === 3 ? [{ key: 'best3', player: best3, comment: best3Comment, setComment: setBest3Comment,
      icon: '⭐', iconClass: 'row-icon', iconStyle: { background: 'var(--gold-subtle)', opacity: 0.4 },
      tagClass: 'tag tag-dim', tag: '1 pt' }] : []),
    { key: 'lemon', player: lemon, comment: lemonComment, setComment: setLemonComment,
      icon: '🍋', iconClass: 'row-icon lemon', iconStyle: undefined,
      tagClass: 'tag tag-lemon', tag: 'Citron' },
  ];

  return (
    <div className="content" ref={topRef}>
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
          {/* Context banner for first-time voters */}
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
              Ton vote reste anonyme pour l'équipe.
            </div>
          </div>
          <p className="section-label mb-4">Qui es-tu ?</p>
          <div className="player-grid">
            {present.map(p => (
              <button key={String(p.id)} className={`player-chip ${voterName === p.name ? 'sel-1st' : ''}`}
                aria-pressed={voterName === p.name} disabled={checking}
                onClick={() => void pickIdentity(p)}>{p.name}</button>
            ))}
          </div>
          <div aria-live="polite">
            {checking && (
              <div style={{ color: 'var(--label3)', fontSize: 13, marginTop: 8 }}>Vérification…</div>
            )}
            {alreadyVoted && (
              <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>
                Tu as déjà voté pour ce match.
              </div>
            )}
            {checkError && (
              <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>
                ⚠️ {checkError}
              </div>
            )}
          </div>

          {/* Vote progress on identity step */}
          {voteCount > 0 && presentCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <span style={{
                display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                background: 'var(--green)', animation: 'livePulse 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 12, color: 'var(--label3)' }}>
                <strong style={{ color: 'var(--label2)' }}>{voteCount}</strong> / {presentCount} ont déjà voté
              </span>
            </div>
          )}
        </>
      )}

      {step >= 1 && step <= summaryStep - 1 && (
        <>
          {/* Identity banner: shown when the voter was auto-recognised (stored
              identity or restored draft) so they can confirm or change */}
          {selectedVoterPlayer && step === 1 && !guestName && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg2)', borderRadius: 'var(--radius-sm)',
              padding: '10px 14px', marginBottom: 8, marginTop: 8,
            }}>
              <span style={{ fontSize: 15 }}>👤</span>
              <span style={{ fontSize: 13, color: 'var(--label2)', flex: 1 }}>
                Tu votes en tant que <strong style={{ color: 'var(--label)' }}>{voterName}</strong>
              </span>
              <button
                onClick={() => { clearVoteDraft(match.id); setVoterName(''); setSelectedVoterPlayer(null); setStep(0); }}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 12, color: 'var(--label3)', cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Changer
              </button>
            </div>
          )}

          <div className="step-bar mt-8" role="progressbar" aria-label="Progression du vote"
            aria-valuemin={1} aria-valuemax={stepBarCount} aria-valuenow={step}>
            {Array.from({ length: stepBarCount }, (_, i) => i + 1).map(i => (
              <div key={i} className={`step-seg ${step > i ? 'done' : step === i ? 'active' : ''}`} />
            ))}
          </div>

          {/* Real-time vote counter */}
          {presentCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginBottom: 12,
            }}>
              <span style={{
                display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                background: voteCount > 0 ? 'var(--green)' : 'var(--label4)',
                animation: voteCount > 0 ? 'livePulse 2s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize: 12, color: 'var(--label3)' }}>
                <strong style={{ color: 'var(--label2)' }}>{voteCount}</strong>
                {' '}/ {presentCount} ont voté
              </span>
            </div>
          )}

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
                    aria-pressed={best1?.id === p.id}
                    onClick={() => pickBest1(p)}>{p.name}</button>
                ))}
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
                    aria-pressed={best2?.id === p.id}
                    onClick={() => pickBest2(p)}>{p.name}</button>
                ))}
              </div>
              <button className="btn btn-secondary btn-full mt-12" onClick={() => goToStep(1)}>Retour</button>
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
                    aria-pressed={best3?.id === p.id}
                    onClick={() => pickBest3(p)}>{p.name}</button>
                ))}
              </div>
              <button className="btn btn-secondary btn-full mt-12" onClick={() => goToStep(2)}>Retour</button>
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
                    aria-pressed={lemon?.id === p.id}
                    onClick={() => pickLemon(p)}>{p.name}</button>
                ))}
              </div>
              {absent.length > 0 && (
                <>
                  <button
                    onClick={() => setAbsentOpen(o => !o)}
                    aria-expanded={absentOpen}
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
                          aria-pressed={lemon?.id === p.id}
                          onClick={() => pickLemon(p)}
                          style={{ opacity: lemon?.id === p.id ? 1 : 0.5, borderStyle: 'dashed' }}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <button className="btn btn-secondary btn-full mt-12" onClick={() => goToStep(lemonStep - 1)}>Retour</button>
            </>
          )}
        </>
      )}

      {step === summaryStep && (
        <>
          <p className="section-label mt-8 mb-4">Récapitulatif</p>
          <div className="group">
            {summaryRows.map(r => (
              <div key={r.key} className="row" style={{ flexWrap: 'wrap' }}>
                <div className={r.iconClass} style={r.iconStyle}>{r.icon}</div>
                <div className="row-body">
                  <div className="row-title">{r.player?.name}</div>
                </div>
                <span className={r.tagClass}>{r.tag}</span>
                <input
                  aria-label={`Commentaire sur ${r.player?.name ?? ''} (optionnel)`}
                  placeholder={`Pourquoi ${r.player?.name ?? ''} ? (optionnel)`}
                  value={r.comment}
                  maxLength={COMMENT_MAX_LENGTH}
                  onChange={e => r.setComment(e.target.value)}
                  style={{ flexBasis: '100%', marginTop: 8, minHeight: 44, padding: '10px 14px' }}
                />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--label3)', textAlign: 'center', marginBottom: 12 }}>
            Ton vote reste anonyme pour l'équipe.
          </p>
          {submitError && (
            <div role="alert" style={{
              background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.25)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 12,
              fontSize: 13, color: 'var(--red, #ff3b30)', textAlign: 'center',
            }}>
              ⚠️ {submitError}
            </div>
          )}
          <div className="flex gap-8">
            <button className="btn btn-secondary" onClick={() => goToStep(lemonStep)}>Modifier</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={submit}>
              {submitting ? 'Envoi…' : submitError ? 'Réessayer' : 'Rendre mon verdict →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
