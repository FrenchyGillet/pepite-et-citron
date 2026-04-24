import { api } from '../api';
import { useAppStore } from '../store/appStore';
import { hasVotedLocally } from '../utils/vote';
import { VoteView } from './VoteView';
import { EmptyState } from './EmptyState';
import type { Player, Match } from '../types';

interface VoteTabProps {
  isAdmin:    boolean;
  activeMatch: Match | null;
  lastMatch:  Match | null;
  players:    Player[];
}

export function VoteTab({ isAdmin, activeMatch, lastMatch, players }: VoteTabProps) {
  const guestStatus        = useAppStore(s => s.guestStatus);
  const guestName          = useAppStore(s => s.guestName);
  const guestToken         = useAppStore(s => s.guestToken);
  const votedThisSession   = useAppStore(s => s.votedThisSession);
  const setVotedThisSession = useAppStore(s => s.setVotedThisSession);
  const setGuestToken      = useAppStore(s => s.setGuestToken);
  const setTab             = useAppStore(s => s.setTab);

  const handleVoted = () => { setVotedThisSession(true); setTab('results'); };

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
    return (
      <EmptyState
        icon={<><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
        title="Vote enregistré"
        subtitle="Les résultats se mettent à jour en temps réel."
        action={{ label: 'Voir les résultats', onClick: () => setTab('results') }}
      />
    );
  }

  if (!guestName && !activeMatch && !lastMatch) {
    return (
      <EmptyState
        icon={<><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></>}
        title="Pas de match ce soir"
        subtitle={isAdmin ? "Ouvre un match depuis l'onglet Admin pour lancer le vote." : "Ton capitaine n'a pas encore ouvert le vote."}
        action={isAdmin ? { label: 'Ouvrir un match', onClick: () => setTab('admin') } : null}
      />
    );
  }

  if (!guestName && ((!activeMatch && lastMatch) || (activeMatch && phase !== 'voting'))) {
    return (
      <EmptyState
        icon={<><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>}
        title="Vote terminé"
        subtitle="La période de vote est clôturée."
        action={{ label: 'Voir les résultats', onClick: () => setTab('results') }}
      />
    );
  }

  return null;
}
