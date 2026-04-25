import { useState, useEffect, type ReactNode } from 'react';
import { formatDate } from '@/utils';
import { computeResultsSummary } from '@/utils/scoring';
import { Scoreboard } from './Scoreboard';
import { PodiumView } from './PodiumView';
import { EmptyState } from './EmptyState';
import { SharePodiumButton } from './SharePodiumButton';
import { useVotes } from '@/hooks/queries';
import { useRevealNext, useCloseMatch, useUpdateMatch } from '@/hooks/mutations';
import type { Player, Match, EntityId } from '@/types';

interface ResultsViewProps {
  players: Player[];
  match: Match | null;
  isAdmin: boolean;
  isDark: boolean;
  orgId?: string | null;
}

interface TiebreakerCardProps {
  title: string;
  color: 'gold' | 'lemon';
  field: string;
  tiedPlayers: Player[];
}

export function ResultsView({ players, match, isAdmin, isDark, orgId }: ResultsViewProps) {
  const [localRevealedCount, setLocalRevealedCount] = useState<number | null>(null);

  useEffect(() => { setLocalRevealedCount(null); }, [match?.id]);

  const { data: votes = [], isLoading } = useVotes(match?.id);
  const revealNextMutation  = useRevealNext(orgId);
  const closeMatchMutation  = useCloseMatch(orgId);
  const updateMatchMutation = useUpdateMatch(orgId);

  if (!match) return (
    <div className="content">
      <EmptyState
        icon={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>}
        title="Aucun match récent"
        subtitle="Les résultats s'afficheront ici une fois le premier match clôturé."
      />
    </div>
  );
  if (isLoading) return <div className="content"><div className="empty">Chargement…</div></div>;

  const present = players.filter(p => (match.present_ids || []).includes(p.id));
  const phase = match.phase || 'voting';

  const MatchHeader = ({ badge }: { badge: ReactNode }) => (
    <div className="flex-between mt-4 mb-12">
      <div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{match.label}</div>
        <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>{formatDate(match.created_at)}</div>
      </div>
      {badge}
    </div>
  );

  if (phase === 'voting') {
    return (
      <div className="content">
        <MatchHeader badge={<span className="badge badge-open">Vote en cours</span>} />
        <div style={{
          background: 'var(--bg2)', borderRadius: 'var(--radius-lg)',
          padding: '40px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Résultats masqués</div>
          <div style={{ fontSize: 13, color: 'var(--label3)', lineHeight: 1.6 }}>
            Le classement sera révélé une fois le vote clôturé.<br />
            <span style={{ color: 'var(--label2)', fontWeight: 500 }}>{votes.length}</span> vote{votes.length !== 1 ? 's' : ''} reçu{votes.length !== 1 ? 's' : ''} sur {present.length} joueur{present.length !== 1 ? 's' : ''}.
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

    const handleNext = () => {
      const next = revealedCount + 1;
      setLocalRevealedCount(next);
      revealNextMutation.mutate({ id: match.id, count: next });
    };

    const handleFinish = () => closeMatchMutation.mutate(match.id);

    return (
      <div className="content">
        <MatchHeader badge={<span className="badge" style={{ background: 'rgba(170,221,0,0.15)', color: 'var(--lemon)' }}>Dépouillement</span>} />

        {!isDone && currentVote ? (
          <div key={revealedCount} style={{
            background: 'var(--bg2)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--separator2)', marginBottom: 16, overflow: 'hidden',
            animation: 'revealPop 0.3s ease',
          }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--label2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Vote {revealedCount + 1} / {revealOrder.length}
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
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 16px 14px', borderBottom: '1px solid var(--separator)', borderLeft: '4px solid var(--gold)' }}>
                <div style={{ fontSize: 26, lineHeight: 1 }}>⭐</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>La Pépite · 2 pts</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>{playerName(currentVote.best1_id)}</div>
                  {currentVote.best1_comment && <div style={{ fontSize: 12, color: 'var(--label3)', fontStyle: 'italic', marginTop: 5 }}>"{currentVote.best1_comment}"</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', borderBottom: '1px solid var(--separator)', borderLeft: '4px solid rgba(255,214,10,0.35)' }}>
                <div style={{ fontSize: 22, lineHeight: 1, opacity: 0.5 }}>⭐</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,214,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>2ème · 1 pt</div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--label)', letterSpacing: '-0.2px' }}>{playerName(currentVote.best2_id)}</div>
                  {currentVote.best2_comment && <div style={{ fontSize: 12, color: 'var(--label3)', fontStyle: 'italic', marginTop: 5 }}>"{currentVote.best2_comment}"</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px 16px', borderLeft: '4px solid var(--lemon)' }}>
                <div style={{ fontSize: 24, lineHeight: 1 }}>🍋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--lemon)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Le Citron</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--lemon)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>{playerName(currentVote.lemon_id)}</div>
                  {currentVote.lemon_comment && <div style={{ fontSize: 12, color: 'var(--label3)', fontStyle: 'italic', marginTop: 5 }}>"{currentVote.lemon_comment}"</div>}
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--separator)' }}>
              <button className="btn btn-primary btn-full" onClick={handleNext}>
                {revealedCount + 1 < revealOrder.length ? 'Vote suivant →' : 'Voir le classement final →'}
              </button>
            </div>
          </div>
        ) : isDone ? (
          <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: '24px 16px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Tous les votes ont été révélés !</div>
            <div style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 16 }}>Affiche le classement définitif pour tout le monde.</div>
            <button className="btn btn-primary btn-full" onClick={handleFinish}>Afficher le classement final</button>
          </div>
        ) : null}

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
                Classement provisoire · {revealedCount}/{revealOrder.length} vote{revealedCount > 1 ? 's' : ''} révélé{revealedCount > 1 ? 's' : ''}
              </span>
            </div>
            <Scoreboard votes={revealedVotes} present={present} allPlayers={players} pepiteCount={match.pepite_count ?? 2} />
          </div>
        )}
      </div>
    );
  }

  // ── CLOSED ──
  const tiebreakers = match.tiebreakers || {};

  const {
    pepiteRanked, lemonRanked, ghosts,
    bestTied, lemonTied, bestTiedPlayers, lemonTiedPlayers,
  } = computeResultsSummary(votes, present, players, match.pepite_count ?? 2);

  const setTiebreaker = (field: string, playerId: EntityId) => {
    updateMatchMutation.mutate({ id: match.id, data: { tiebreakers: { ...tiebreakers, [field]: playerId } } });
  };

  const TiebreakerCard = ({ title, color, field, tiedPlayers }: TiebreakerCardProps) => (
    <div style={{
      background: color === 'gold' ? 'rgba(255,214,10,0.06)' : 'rgba(170,221,0,0.06)',
      border: `1px solid ${color === 'gold' ? 'var(--gold-dim)' : 'var(--lemon-dim)'}`,
      borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: 12,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🍺 Égalité — {title}</div>
      <div style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 12 }}>
        {tiedPlayers.map(p => p.name).join(' et ')} sont à égalité.<br />Qui a gagné le concours de bière ?
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tiedPlayers.map(p => (
          <button key={String(p.id)} className="btn btn-secondary" onClick={() => setTiebreaker(field, p.id)}>
            🍺 {p.name}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="content">
      <MatchHeader badge={<span className="badge badge-closed">Clôturé</span>} />
      {isAdmin && bestTied  && !tiebreakers.best_id  && <TiebreakerCard title="Pépite" color="gold"  field="best_id"  tiedPlayers={bestTiedPlayers}  />}
      {isAdmin && lemonTied && !tiebreakers.lemon_id && <TiebreakerCard title="Citron" color="lemon" field="lemon_id" tiedPlayers={lemonTiedPlayers} />}
      <PodiumView votes={votes} present={present} allPlayers={players} tiebreakers={tiebreakers} pepiteCount={match.pepite_count ?? 2} />

      {ghosts.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: 'var(--label4)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 10,
          }}>
            👻 Fantômes · {ghosts.length}
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

      {pepiteRanked.length > 0 && (
        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <SharePodiumButton
            match={match}
            pepiteRanked={pepiteRanked}
            lemonRanked={lemonRanked}
            isDark={isDark !== false}
          />
        </div>
      )}
    </div>
  );
}
