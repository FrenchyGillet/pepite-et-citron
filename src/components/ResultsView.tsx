import { lazy, Suspense, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, PEPITE_POINTS } from '@/utils';
import { computeResultsSummary } from '@/utils/scoring';
import { localDateKey } from '@/utils/schedule';
import { Scoreboard } from './Scoreboard';
import { PodiumView } from './PodiumView';
import { EmptyState } from './EmptyState';
import { MascotTalk } from './MascotTalk';
import { SharePodiumButton } from './SharePodiumButton';
import { SeasonTeaser } from './SeasonTeaser';
import { useVotes, useVoteCount } from '@/hooks/queries';
import { useRevealNext, useCloseMatch, useUpdateMatch } from '@/hooks/mutations';
import { track, EVENTS } from '@/utils/analytics';
import { sharedLandingUrl } from '@/utils/share';
import type { Player, Match, EntityId } from '@/types';
import { t } from '@/i18n';
import { RevealAnnouncements } from './RevealAnnouncements';

// Organisers only, with the schedule form: kept out of the main bundle.
const NextMatchCard = lazy(() => import('./NextMatchCard').then(m => ({ default: m.NextMatchCard })));

interface ResultsViewProps {
  players: Player[];
  match: Match | null;
  isAdmin: boolean;
  isDark: boolean;
  orgId?: string | null;
  isPro?: boolean;
  onUpgrade?: () => void;
}

interface TiebreakerCardProps {
  title: string;
  color: 'gold' | 'lemon';
  field: string;
  tiedPlayers: Player[];
  step?: string;
  disabled: boolean;
  onPick: (field: string, playerId: EntityId) => void;
}

// ── Share results via Web Share API (iMessage, WhatsApp, etc.) ────────────────
function ShareResultsButton({
  match,
  pepiteRanked,
  lemonWinners,
}: {
  match: Match;
  /** Tiebreaker-aware order (computeResultsSummary). */
  pepiteRanked: Array<{ name: string }>;
  /** Every citron while a tie is open — never an arbitrary one. */
  lemonWinners: Array<{ name: string }>;
}) {
  const [shared, setShared] = useState(false);

  const buildText = () => {
    const pepiteNames = pepiteRanked.slice(0, 2).map(p => p.name).join(' & ');
    const lemonName   = lemonWinners.map(p => p.name).join(' & ');
    const lines = [
      `🏆 ${match.label}`,
      pepiteNames ? t('results.sharePepite', { names: pepiteNames }) : '',
      lemonName   ? t('results.shareCitron', { names: lemonName })   : '',
      '',
      t('results.shareVia'),
      sharedLandingUrl('results'),
    ].filter(Boolean);
    return lines.join('\n');
  };

  const handleShare = async () => {
    const text = buildText();
    if (navigator.share) {
      try {
        await navigator.share({ text });
        track(EVENTS.RESULTS_SHARED, { method: 'share' });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } catch {
        // user cancelled — no-op
      }
    } else {
      // Desktop fallback: open WhatsApp web
      track(EVENTS.RESULTS_SHARED, { method: 'whatsapp' });
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <button
      onClick={handleShare}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: shared ? 'rgba(48,209,88,0.12)' : 'var(--bg2)',
        border: `1px solid ${shared ? 'var(--green)' : 'var(--separator2)'}`,
        borderRadius: 'var(--radius)',
        padding: '13px 20px',
        fontSize: 15, fontWeight: 600,
        color: shared ? 'var(--green)' : 'var(--label2)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ fontSize: 18 }}>{shared ? '✅' : '💬'}</span>
      {shared ? t('results.shared') : t('results.sendResults')}
    </button>
  );
}

// Module-level so React keeps their DOM between renders (a component defined
// inside ResultsView is a new type on every render and remounts).
function MatchHeader({ match, badge }: { match: Match; badge: ReactNode }) {
  return (
    <div className="flex-between mt-4 mb-12">
      <div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{match.label}</div>
        <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>{formatDate(match.created_at)}</div>
      </div>
      {badge}
    </div>
  );
}

function TiebreakerCard({ title, color, field, tiedPlayers, step, disabled, onPick }: TiebreakerCardProps) {
  return (
    <div style={{
      background: color === 'gold' ? 'rgba(255,214,10,0.06)' : 'rgba(170,221,0,0.06)',
      border: `1px solid ${color === 'gold' ? 'var(--gold-dim)' : 'var(--lemon-dim)'}`,
      borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{t('results.tie', { title })}</div>
        {step && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--label3)',
            background: 'var(--bg3)', borderRadius: 20,
            padding: '2px 8px', letterSpacing: '0.05em',
          }}>{step}</span>
        )}
      </div>
      <div style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 12 }}>
        {t('results.tiedPlayers', { names: tiedPlayers.map(p => p.name).join(` ${t('results.tiedAnd')} `) })}<br />
        {color === 'lemon'
          ? t('results.beerLost')
          : t('results.beerWon')}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tiedPlayers.map(p => (
          <button
            key={String(p.id)}
            className="btn btn-secondary"
            disabled={disabled}
            onClick={() => onPick(field, p.id)}
          >
            {color === 'lemon' ? '🍋' : '🍺'} {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ResultsView({ players, match, isAdmin, isDark, orgId, isPro, onUpgrade }: ResultsViewProps) {
  const navigate = useNavigate();
  const [localRevealedCount, setLocalRevealedCount] = useState<number | null>(null);
  // Keyed by match: closing refetches the match (briefly null), which must
  // not hide the podium the admin just opened.
  const [podiumRevealedId,   setPodiumRevealedId]   = useState<EntityId | null>(null);
  const podiumRevealed    = match != null && podiumRevealedId === match.id;
  const setPodiumRevealed = () => { if (match) setPodiumRevealedId(match.id); };

  useEffect(() => { setLocalRevealedCount(null); }, [match?.id]);

  const { data: votes = [], isLoading } = useVotes(match?.id);
  // During the vote, non-admins get no ballot rows (get_match_votes) — only the
  // count RPC tells them how many votes are in.
  const { data: voteCount = 0 } = useVoteCount(match?.id);
  const revealNextMutation  = useRevealNext(orgId);
  const closeMatchMutation  = useCloseMatch(orgId);
  const updateMatchMutation = useUpdateMatch(orgId);

  if (!match) return (
    <div className="content">
      <EmptyState
        icon={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>}
        title={t('results.noRecent')}
        subtitle={t('results.noRecentHint')}
        mascot={<MascotTalk situations={['noResults']} seed={`${orgId}:${localDateKey(new Date())}`} />}
      />
    </div>
  );
  if (isLoading) return <div className="content"><div className="empty">Chargement…</div></div>;

  const present = players.filter(p => (match.present_ids || []).includes(p.id));
  const phase = match.phase || 'voting';
  const pepiteCount = match.pepite_count ?? 2;

  if (phase === 'voting') {
    return (
      <div className="content">
        <MatchHeader match={match} badge={<span className="badge badge-open">{t('results.voteOpen')}</span>} />
        <div style={{
          background: 'var(--bg2)', borderRadius: 'var(--radius-lg)',
          padding: '40px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{t('results.hidden')}</div>
          <div style={{ fontSize: 13, color: 'var(--label3)', lineHeight: 1.6 }}>
            {t('results.hiddenHint')}<br />
            <span style={{ color: 'var(--label2)', fontWeight: 500 }}>{voteCount}</span> {t('results.received', { count: voteCount, present: present.length })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'counting') {
    const revealOrder    = match.reveal_order || [];
    const revealedCount  = localRevealedCount ?? (match.revealed_count || 0);
    const isDone         = revealedCount >= revealOrder.length;

    const currentVoteId   = !isDone ? revealOrder[revealedCount] : null;
    const currentVote     = currentVoteId != null ? votes.find(v => v.id === currentVoteId) : null;
    const revealedVoteIds = revealOrder.slice(0, revealedCount);
    const revealedVotes   = votes.filter(v => v.id != null && revealedVoteIds.includes(v.id as EntityId));

    const playerName = (id: EntityId | undefined) => players.find(p => p.id === id)?.name || '?';

    // Pépite rows shown on the reveal card — driven by the match mode so the
    // 3-pépite scale (3-2-1) and the 3rd pick are never hidden.
    const pepitePoints = PEPITE_POINTS[pepiteCount];
    const pepiteRows = currentVote
      ? [
          { rank: 1, label: t('results.rankPepite'), id: currentVote.best1_id, comment: currentVote.best1_comment },
          { rank: 2, label: t('results.rank2'), id: currentVote.best2_id, comment: currentVote.best2_comment },
          ...(pepiteCount === 3
            ? [{ rank: 3, label: t('results.rank3'), id: currentVote.best3_id, comment: currentVote.best3_comment }]
            : []),
        ]
      : [];

    // The admin who just revealed the ballots goes straight to the podium:
    // once the provisional board is complete, a "Révéler" gate was where
    // counting stopped, leaving the match stuck in counting.
    const handleFinish = () => closeMatchMutation.mutate(match.id, {
      onSuccess: () => {
        track(EVENTS.COUNTING_FINISHED, { votes: revealOrder.length });
        track(EVENTS.PODIUM_REVEALED, { admin: true });
        setPodiumRevealed();
      },
    });

    const handleNext = () => {
      const next = revealedCount + 1;
      if (next >= revealOrder.length) { handleFinish(); return; }
      setLocalRevealedCount(next);
      revealNextMutation.mutate({ id: match.id, count: next });
    };

    return (
      <div className="content">
        <MatchHeader match={match} badge={<span className="badge" style={{ background: 'rgba(170,221,0,0.15)', color: 'var(--lemon)' }}>{t('results.counting')}</span>} />

        {!isAdmin ? (
          // Non-admins watch the reveal — they only receive the ballots the
          // admin has already revealed (get_match_votes), and cannot advance it.
          <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: '24px 16px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{isDone ? '🎉' : '🥁'}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {isDone ? t('results.allRevealed') : t('results.countingNow')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--label3)' }}>
              {isDone
                ? t('results.finalSoon')
                : t('results.revealedBy', { n: revealedCount, total: revealOrder.length })}
            </div>
          </div>
        ) : !isDone && currentVote ? (
          <div key={revealedCount} style={{
            background: 'var(--bg2)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--separator2)', marginBottom: 16, overflow: 'hidden',
            animation: 'revealPop 0.3s ease',
          }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--label2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {t('results.voteN', { n: revealedCount + 1, total: revealOrder.length })}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {revealOrder.map((_, i) => (
                  <div key={i} style={{
                    width: i === revealedCount ? 14 : 7, height: 7,
                    borderRadius: 4,
                    background: i < revealedCount ? 'var(--label2)' : i === revealedCount ? 'var(--gold)' : 'var(--bg4)',
                    transition: 'all 0.3s ease',
                  }} />
                ))}
              </div>
            </div>

            <div>
              {pepiteRows.map((row, i) => {
                const first = i === 0;
                const points = pepitePoints[row.rank - 1];
                return (
                  <div key={row.rank} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: first ? '16px 16px 14px' : '14px 16px', borderBottom: '1px solid var(--separator)', borderLeft: `4px solid ${first ? 'var(--gold)' : 'rgba(255,214,10,0.35)'}` }}>
                    <div style={{ fontSize: first ? 26 : 22, lineHeight: 1, opacity: first ? 1 : 0.5 }}>⭐</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: first ? 'var(--gold)' : 'rgba(255,214,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                        {t('results.rowPoints', { label: row.label, count: points })}
                      </div>
                      <div style={{ fontSize: first ? 22 : 19, fontWeight: first ? 800 : 700, color: first ? 'var(--gold)' : 'var(--label)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>{playerName(row.id)}</div>
                      {row.comment && <div style={{ fontSize: 12, color: 'var(--label3)', fontStyle: 'italic', marginTop: 5 }}>"{row.comment}"</div>}
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px 16px', borderLeft: '4px solid var(--lemon)' }}>
                <div style={{ fontSize: 24, lineHeight: 1 }}>🍋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--lemon)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{t('results.citron')}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--lemon)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>{playerName(currentVote.lemon_id)}</div>
                  {currentVote.lemon_comment && <div style={{ fontSize: 12, color: 'var(--label3)', fontStyle: 'italic', marginTop: 5 }}>"{currentVote.lemon_comment}"</div>}
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--separator)' }}>
              <button className="btn btn-primary btn-full" onClick={handleNext} disabled={closeMatchMutation.isPending}>
                {revealedCount + 1 < revealOrder.length ? t('results.nextVote') : t('results.seeFinal')}
              </button>
            </div>
          </div>
        ) : isDone ? (
          <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: '24px 16px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t('results.allRevealedBang')}</div>
            <div style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 16 }}>{t('results.showFinalHint')}</div>
            <button className="btn btn-primary btn-full" onClick={handleFinish} disabled={closeMatchMutation.isPending}>{t('results.showFinal')}</button>
          </div>
        ) : (
          // Vote référencé par reveal_order mais introuvable (supprimé, ou pas
          // encore synchronisé) — ne jamais bloquer le dépouillement.
          <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: '24px 16px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏭️</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t('results.voteGone')}</div>
            <div style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 16 }}>{t('results.voteGoneHint')}</div>
            <button className="btn btn-primary btn-full" onClick={handleNext} disabled={closeMatchMutation.isPending}>
              {revealedCount + 1 < revealOrder.length ? t('results.nextVote') : t('results.seeFinal')}
            </button>
          </div>
        )}

        {revealedCount > 0 && (
          <div style={{
            border: '1px dashed var(--separator2)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 14px 4px',
            marginTop: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--lemon)',
                animation: 'livePulse 1.4s ease-in-out infinite',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--label3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {t('results.provisional', { count: revealedCount, n: revealedCount, total: revealOrder.length })}
              </span>
            </div>
            <Scoreboard votes={revealedVotes} present={present} allPlayers={players} pepiteCount={pepiteCount} />
          </div>
        )}
      </div>
    );
  }

  // ── CLOSED ──
  const tiebreakers = match.tiebreakers || {};

  const {
    pepiteRanked, lemonRanked, lemonWinners, ghosts,
    bestTied, lemonTied, bestTiedPlayers, lemonTiedPlayers,
  } = computeResultsSummary(votes, present, players, pepiteCount, tiebreakers);

  const setTiebreaker = (field: string, playerId: EntityId) => {
    track(EVENTS.TIEBREAKER_RESOLVED, { field });
    updateMatchMutation.mutate({ id: match.id, data: { tiebreakers: { ...tiebreakers, [field]: playerId } } });
  };

  // ── Tiebreaker sequencing ─────────────────────────────────────────────────
  // Show tiebreakers one at a time (Pépite first, then Citron) so the admin
  // cannot miss the second one. The podium is hidden until all ties are resolved,
  // otherwise resolving the first tie makes the podium look "final" and the
  // second tiebreaker card goes unnoticed.
  const totalTies    = (bestTied  ? 1 : 0) + (lemonTied  ? 1 : 0);
  const resolvedTies = (tiebreakers.best_id  ? 1 : 0) + (tiebreakers.lemon_id ? 1 : 0);
  const pendingBest  = isAdmin && bestTied  && !tiebreakers.best_id;
  const pendingLemon = isAdmin && lemonTied && !tiebreakers.lemon_id;
  // Show Pépite first; show Citron only once Pépite is resolved (or not tied)
  const showBestCard  = pendingBest;
  const showLemonCard = pendingLemon && !pendingBest;
  const hasPendingTie = pendingBest || pendingLemon;

  const stepLabel = (n: number) => totalTies > 1 ? `${n}/${totalTies}` : undefined;

  return (
    <div className="content">
      <MatchHeader match={match} badge={<span className="badge badge-closed">{t('results.closed')}</span>} />
      {showBestCard  && <TiebreakerCard disabled={updateMatchMutation.isPending} onPick={setTiebreaker} title={t('results.pepite')} color="gold"  field="best_id"  tiedPlayers={bestTiedPlayers}  step={stepLabel(resolvedTies + 1)} />}
      {showLemonCard && <TiebreakerCard disabled={updateMatchMutation.isPending} onPick={setTiebreaker} title={t('results.citronShort')} color="lemon" field="lemon_id" tiedPlayers={lemonTiedPlayers} step={stepLabel(resolvedTies + 1)} />}
      {/* Podium is hidden until all tiebreakers are resolved AND the reveal button is pressed */}
      {hasPendingTie ? (
        <div style={{
          background: 'var(--bg2)', borderRadius: 'var(--radius-lg)',
          padding: '32px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏆</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--label2)' }}>
            {totalTies > 1 ? t('results.afterTies', { count: totalTies }) : t('results.afterTie')}
          </div>
        </div>
      ) : !podiumRevealed ? (
        <div style={{
          background: 'var(--bg2)', borderRadius: 'var(--radius-lg)',
          padding: '40px 24px', textAlign: 'center', marginBottom: 8,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12, lineHeight: 1 }}>🏆</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.3px' }}>{t('results.verdict')}</div>
          <div style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 24, lineHeight: 1.5 }}>
            {t('results.votesSpoke')}<br />{t('results.readyToDiscover')}
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={() => { track(EVENTS.PODIUM_REVEALED, { admin: isAdmin }); setPodiumRevealed(); }}
            style={{ fontSize: 17, fontWeight: 800 }}
          >
            {t('results.reveal')}
          </button>
        </div>
      ) : (
        <div style={{ animation: 'podiumReveal 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <PodiumView votes={votes} present={present} allPlayers={players} tiebreakers={tiebreakers} pepiteCount={pepiteCount} />
          {pepiteRanked.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SharePodiumButton
                match={match}
                pepiteRanked={pepiteRanked}
                lemonRanked={lemonRanked}
                isDark={isDark !== false}
              />
              <ShareResultsButton match={match} pepiteRanked={pepiteRanked} lemonWinners={lemonWinners} />
            </div>
          )}
        </div>
      )}

      {ghosts.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: 'var(--label4)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 10,
          }}>
            {t('results.ghosts', { count: ghosts.length })}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ghosts.map(p => (
              <div key={String(p.id)} style={{
                padding: '7px 14px', background: 'var(--bg2)',
                borderRadius: 20, fontSize: 13,
                color: 'var(--label4)', fontWeight: 500,
              }}>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Post-podium CTAs ─────────────────────────────────────────────── */}
      {podiumRevealed && (
        <div style={{ marginTop: 8, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RevealAnnouncements orgId={orgId} match={match} players={players} />

          {/* Organisers: line up the next vote while the team is still here. */}
          {isAdmin && !match.manual_result && (
            <Suspense fallback={null}><NextMatchCard orgId={orgId} match={match} /></Suspense>
          )}

          {/* Pro: shortcut to season stats */}
          {isPro && (
            <button
              onClick={() => navigate('/stats')}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,214,10,0.07)', border: '1px solid var(--gold-dim)',
                borderRadius: 'var(--radius-lg)', padding: '14px 16px',
                fontSize: 14, fontWeight: 600, color: 'var(--gold)', cursor: 'pointer',
              }}
            >
              <span>{t('results.seeSeason')}</span>
              <span style={{ opacity: 0.7 }}>→</span>
            </button>
          )}

          {/* Free: season teaser (real data, locked scores) + fallback nudge */}
          {!isPro && onUpgrade && (
            <>
              <SeasonTeaser orgId={orgId} players={players} onUpgrade={onUpgrade} />
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,215,0,0.07) 0%, rgba(255,215,0,0.03) 100%)',
                border: '1px solid var(--gold-dim)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>📊</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)', marginBottom: 3 }}>
                    {t('results.proStats')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--label3)', lineHeight: 1.4 }}>
                    {t('results.proStatsHint')}
                  </div>
                </div>
                <button
                  onClick={() => { track(EVENTS.UPGRADE_CLICKED, { source: 'results' }); onUpgrade(); }}
                  style={{
                    background: 'var(--gold-fill)', color: '#000', border: 'none',
                    borderRadius: 10, padding: '9px 14px',
                    fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {t('results.seePro')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
