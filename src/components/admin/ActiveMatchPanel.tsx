import { useState } from 'react';
import { copyToClipboard } from '@/utils/clipboard';
import { humanizeError } from '@/utils/errors';
import { shuffleRevealOrder } from '@/utils/vote';
import { extendDeadline, formatDeadline, isDeadlinePassed, DEADLINE_EXTENSION_MINUTES } from '@/utils/deadline';
import { buildReminderMessage } from '@/utils/reminder';
import { useNow } from '@/hooks/useNow';
import { useVotes } from '@/hooks/queries';
import { useCloseMatch, useStartCounting, useUpdateMatch, useSendVoteReminder, useDeleteVote } from '@/hooks/mutations';
import type { Match, Org, Player } from '@/types';
import { NotifyTeamButton } from './NotifyTeamButton';
import type { ConfirmFn, Notify } from './shared';

interface ActiveMatchPanelProps {
  activeMatch: Match;
  players: Player[];
  currentOrg: Org | null;
  notify: Notify;
  confirm: ConfirmFn;
  onCopyOrgLink: () => void;
  onLinkShared?: () => void;
  onGoToResults?: () => void;
}

/**
 * The match being voted on: live count, deadline, vote link, reveal button,
 * who voted (with reminders and vote cancelling) and the discreet close link.
 */
export function ActiveMatchPanel({ activeMatch, players, currentOrg, notify, confirm, onCopyOrgLink, onLinkShared, onGoToResults }: ActiveMatchPanelProps) {
  const [voterTrackingOpen, setVoterTrackingOpen] = useState(false);

  const { data: matchVotes = [] } = useVotes(activeMatch.id);
  const voteCount = matchVotes.length;
  const phase     = activeMatch.phase || 'voting';

  const closeMatchMutation    = useCloseMatch(currentOrg?.id);
  const startCountingMutation = useStartCounting(currentOrg?.id, activeMatch.label);
  const deleteVoteMutation    = useDeleteVote(activeMatch.id);
  const updateMatchMutation   = useUpdateMatch(currentOrg?.id);
  const sendReminderMutation  = useSendVoteReminder(currentOrg?.id);

  // Voter tracking: match each present player against cast votes — by
  // voter_player_id (reliable, no first-name collisions), falling back to the
  // name for legacy / guest votes. Guest votes are still excluded because a
  // guest has no player id and their name isn't in the present roster.
  const presentPlayers = players.filter(p => activeMatch.present_ids.includes(p.id));
  const votedPlayerIds = new Set(matchVotes.map(v => v.voter_player_id).filter(id => id != null));
  const voterNameSet   = new Set(matchVotes.map(v => v.voter_name));
  const hasPlayerVoted = (p: Player) => votedPlayerIds.has(p.id) || voterNameSet.has(p.name);
  const votedPlayers   = presentPlayers.filter(hasPlayerVoted);
  const pendingPlayers = presentPlayers.filter(p => !hasPlayerVoted(p));

  const voteDeadline = phase === 'voting' ? activeMatch.vote_deadline ?? null : null;
  const now = useNow(30_000, !!voteDeadline);
  const voteUrl = currentOrg?.slug ? `${window.location.origin}/vote?org=${currentOrg.slug}` : null;

  const extendVoteDeadline = () => {
    if (!voteDeadline) return;
    updateMatchMutation.mutate(
      { id: activeMatch.id, data: { vote_deadline: extendDeadline(voteDeadline, Date.now()) } },
      {
        onSuccess: () => notify(`Vote prolongé de ${DEADLINE_EXTENSION_MINUTES} min`),
        onError: (err) => notify(humanizeError(err)),
      },
    );
  };

  // F1: nudge the players who have not voted — a message for the team chat
  // (reaches everyone, account or not) plus a push to those with the app.
  const remindPendingPlayers = async () => {
    if (!voteUrl || pendingPlayers.length === 0) return;
    sendReminderMutation.mutate(
      { matchId: activeMatch.id, matchLabel: activeMatch.label },
      { onSuccess: (sent) => { if (sent) notify(`🔔 Notification envoyée à ${sent} joueur${sent > 1 ? 's' : ''}`); } },
    );
    const text = buildReminderMessage({
      matchLabel: activeMatch.label,
      pendingNames: pendingPlayers.map(p => p.name),
      voteUrl,
      deadline: voteDeadline,
    });
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* user cancelled */ }
    } else {
      await copyToClipboard(text);
      notify('Message copié — colle-le dans le groupe de l\'équipe');
    }
  };

  // Undo a vote cast under a player's name (someone tapped the wrong first
  // name) so the real player can vote. Voting phase only (delete_vote).
  const cancelVote = async (p: Player) => {
    const vote = matchVotes.find(v => v.voter_player_id === p.id)
      ?? matchVotes.find(v => v.voter_player_id == null && v.voter_name === p.name);
    if (vote?.id == null) return;
    if (!(await confirm({
      message: `Annuler le vote de ${p.name} ? Il pourra voter à nouveau.`,
      confirmLabel: 'Annuler le vote', danger: true,
    }))) return;
    deleteVoteMutation.mutate(vote.id, {
      onSuccess: () => notify(`Vote de ${p.name} annulé`),
      onError: (err) => notify(humanizeError(err)),
    });
  };

  const closeMatch = async () => {
    const votes = `${voteCount} vote${voteCount !== 1 ? 's' : ''} reçu${voteCount !== 1 ? 's' : ''}`;
    if (!(await confirm({
      message: `Clore « ${activeMatch.label} » sans dépouiller ? Le vote sera fermé définitivement : les ${votes} ne seront jamais révélés et le match ne comptera pas dans la saison.`,
      confirmLabel: 'Clore sans dépouiller', danger: true,
    }))) return;
    closeMatchMutation.mutate(activeMatch.id, {
      onSuccess: () => notify('Vote clôturé'),
      onError:   (err) => notify(humanizeError(err)),
    });
  };

  const startCounting = () => {
    startCountingMutation.mutate({ id: activeMatch.id, order: shuffleRevealOrder(matchVotes) }, {
      onSuccess: () => onGoToResults?.(),
    });
  };

  return (
    <div className="group">
      <div className="row">
        <div className="row-icon green" style={{ position: 'relative' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--green)',
            animation: 'livePulse 1.8s ease-in-out infinite',
          }} />
        </div>
        <div className="row-body">
          <div className="row-title">{activeMatch.label}</div>
          <div className="row-sub" aria-live="polite" aria-atomic="true">
            {phase === 'voting'   && `${voteCount} vote${voteCount !== 1 ? 's' : ''} reçu${voteCount !== 1 ? 's' : ''} sur ${activeMatch.present_ids.length} joueurs`}
            {phase === 'counting' && `Dépouillement — ${activeMatch.revealed_count || 0}/${(activeMatch.reveal_order || []).length} votes révélés`}
          </div>
        </div>
      </div>
      {phase === 'voting' && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {voteDeadline && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '8px 12px',
            }}>
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 600,
                color: isDeadlinePassed(voteDeadline, now) ? 'var(--red)' : 'var(--label2)',
              }}>
                ⏱ {formatDeadline(voteDeadline, now)}
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}
                disabled={updateMatchMutation.isPending}
                onClick={extendVoteDeadline}>
                +{DEADLINE_EXTENSION_MINUTES} min
              </button>
            </div>
          )}
          {currentOrg?.slug && voteUrl && (
            <>
              <div style={{
                background: 'var(--bg3)', borderRadius: 'var(--radius-sm)',
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--label3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    🔗 Lien de vote
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--label2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {voteUrl}
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}
                  onClick={onCopyOrgLink}>
                  Copier
                </button>
              </div>
              <NotifyTeamButton voteUrl={voteUrl} matchLabel={activeMatch.label} onFallback={onCopyOrgLink} onShared={onLinkShared} />
            </>
          )}
          <button className="btn btn-primary btn-full" onClick={startCounting} disabled={startCountingMutation.isPending || voteCount === 0}>
            {startCountingMutation.isPending ? 'Préparation…' : `Lancer le dépouillement · ${voteCount} vote${voteCount !== 1 ? 's' : ''}`}
          </button>
          {/* ── Voter tracking toggle ───────────────────────── */}
          {presentPlayers.length > 0 && (
            <div>
              <button
                onClick={() => setVoterTrackingOpen(o => !o)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  padding: '6px 0', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--label3)' }}>
                  Qui a voté ?{' '}
                  <span style={{ color: pendingPlayers.length === 0 ? 'var(--green)' : 'var(--label2)', fontWeight: 600 }}>
                    {votedPlayers.length}/{presentPlayers.length}
                  </span>
                </span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                  stroke="var(--label3)" strokeWidth="2" strokeLinecap="round"
                  style={{ transition: 'transform 0.2s', transform: voterTrackingOpen ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
                >
                  <polyline points="5 3 11 8 5 13" />
                </svg>
              </button>
              {voteUrl && pendingPlayers.length > 0 && (
                <button
                  className="btn btn-secondary btn-full"
                  style={{ marginBottom: 8, fontSize: 14 }}
                  onClick={() => void remindPendingPlayers()}>
                  ⏰ Relancer les retardataires ({pendingPlayers.length})
                </button>
              )}
              {voterTrackingOpen && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 8 }}>
                  {[...pendingPlayers, ...votedPlayers].map(p => {
                    const hasVoted = hasPlayerVoted(p);
                    return (
                      <span key={String(p.id)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px', borderRadius: 20, fontSize: 13,
                        background: hasVoted ? 'rgba(48,209,88,0.12)' : 'var(--bg3)',
                        color: hasVoted ? 'var(--green)' : 'var(--label2)',
                        border: `1px solid ${hasVoted ? 'rgba(48,209,88,0.3)' : 'transparent'}`,
                      }}>
                        {hasVoted ? '✓' : '⏳'} {p.name}
                        {hasVoted && (
                          <button
                            onClick={() => void cancelVote(p)}
                            aria-label={`Annuler le vote de ${p.name}`}
                            title="Annuler ce vote"
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'inherit', fontSize: 12, lineHeight: 1,
                              padding: '2px 2px 2px 6px', minHeight: 0,
                            }}
                          >✕</button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Kept discreet, away from the main action: closing skips the
              reveal for good (confirmation dialog). */}
          <button
            onClick={() => void closeMatch()}
            disabled={closeMatchMutation.isPending}
            style={{
              alignSelf: 'center', marginTop: 12, padding: '8px 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--label3)', textDecoration: 'underline',
            }}>
            {closeMatchMutation.isPending ? 'Clôture…' : 'Clore sans dépouiller…'}
          </button>
        </div>
      )}
      {phase === 'counting' && (
        <div style={{ padding: '12px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--label3)', textAlign: 'center' }}>
            Le dépouillement est en cours dans l'onglet Résultats.
          </p>
        </div>
      )}
    </div>
  );
}
