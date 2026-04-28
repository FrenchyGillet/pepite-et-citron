import { useNavigate } from 'react-router-dom';
import { api, DEMO_MODE } from '@/api';
import { useAppStore } from '@/store/appStore';
import { track, EVENTS } from '@/utils/analytics';
import { hasVotedLocally } from '@/utils/vote';
import { VoteView } from './VoteView';
import { EmptyState } from './EmptyState';
import { GuestPromoView } from './GuestPromoView';
import type { Player, Match, EntityId } from '@/types';

interface VoteTabProps {
  isAdmin:    boolean;
  activeMatch: Match | null;
  lastMatch:  Match | null;
  players:    Player[];
}

export function VoteTab({ isAdmin, activeMatch, lastMatch, players }: VoteTabProps) {
  const session            = useAppStore(s => s.session);
  const guestStatus        = useAppStore(s => s.guestStatus);
  const guestName          = useAppStore(s => s.guestName);
  const guestToken         = useAppStore(s => s.guestToken);
  const isVoterSession     = useAppStore(s => s.isVoterSession);
  const votedThisSession   = useAppStore(s => s.votedThisSession);
  const voterName          = useAppStore(s => s.voterName);
  const currentOrg         = useAppStore(s => s.currentOrg);
  const setVotedThisSession = useAppStore(s => s.setVotedThisSession);
  const setVoterName        = useAppStore(s => s.setVoterName);
  const setPendingPlayerId  = useAppStore(s => s.setPendingPlayerId);
  const setGuestToken      = useAppStore(s => s.setGuestToken);
  const navigate           = useNavigate();

  // Voter-link users (no account) see the promo screen after voting;
  // authenticated users go directly to /results.
  const isAnonymousVoter = !DEMO_MODE && !session && isVoterSession;

  const handleVoted = (name: string, playerId?: EntityId) => {
    setVotedThisSession(true);
    setVoterName(name);
    // Remember which player this voter is so we can auto-link after signup.
    // Only for anonymous team voters (not guest-token supporters).
    if (playerId && isAnonymousVoter && !guestToken) {
      setPendingPlayerId(playerId);
    }
    track(EVENTS.VOTE_COMPLETED, { anonymous: isAnonymousVoter });
    if (!isAnonymousVoter) navigate('/results');
    // else: stay on VoteTab — GuestPromoView is rendered below
  };

  const handleGuestVoted = async () => {
    if (guestToken) await api.useGuestToken(guestToken);
    setGuestToken(null);
  };

  const phase = activeMatch?.phase || 'voting';

  if (guestStatus === 'checking') return (
    <EmptyState
      icon={<><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5" strokeLinecap="round"/></>}
      title="Vérification…"
      subtitle="Validation de ton lien d'invitation"
    />
  );

  if (guestStatus === 'invalid') return (
    <EmptyState
      icon={<><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></>}
      title="Lien invalide"
      subtitle="Ce lien a déjà été utilisé ou n'existe pas."
    />
  );

  if (!votedThisSession && !hasVotedLocally(activeMatch?.id) && activeMatch && phase === 'voting') {
    return (
      <VoteView
        players={players}
        match={activeMatch}
        onVoted={handleVoted}
        guestName={guestName}
        onGuestVoted={handleGuestVoted}
      />
    );
  }

  if ((votedThisSession || hasVotedLocally(activeMatch?.id)) && phase === 'voting') {
    if (isAnonymousVoter) {
      // ?org= voters: can browse results (isVoterLink stays true via isVoterSession)
      // ?guest= voters: results are locked, so hide that button
      return (
        <GuestPromoView
          canSeeResults={!guestToken && guestStatus !== 'valid'}
          voterName={voterName}
          orgName={currentOrg?.name ?? null}
        />
      );
    }
    return (
      <EmptyState
        icon={<><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
        title="Vote enregistré"
        subtitle="Les résultats se mettent à jour en temps réel."
        action={{ label: 'Voir les résultats', onClick: () => navigate('/results') }}
      />
    );
  }

  if (!guestName && !activeMatch && !lastMatch) {
    return (
      <EmptyState
        icon={<><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></>}
        title={isVoterSession ? "Pas encore de vote ouvert" : "Pas de match ce soir"}
        subtitle={
          isVoterSession
            ? "Ton capitaine n'a pas encore lancé le vote. Reviens quand il partage le lien !"
            : isAdmin
              ? "Ouvre un match depuis l'onglet Admin pour lancer le vote."
              : "Ton capitaine n'a pas encore ouvert le vote."
        }
        action={isAdmin ? { label: 'Ouvrir un match', onClick: () => navigate('/admin') } : null}
      />
    );
  }

  if (!guestName && ((!activeMatch && lastMatch) || (activeMatch && phase !== 'voting'))) {
    return (
      <EmptyState
        icon={<><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>}
        title="Vote terminé"
        subtitle={isVoterSession ? "Le vote est clôturé pour ce match. Résultats visibles ci-dessous." : "La période de vote est clôturée."}
        action={{ label: 'Voir les résultats', onClick: () => navigate('/results') }}
      />
    );
  }

  return null;
}
