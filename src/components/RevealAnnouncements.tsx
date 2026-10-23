import { t } from '@/i18n';
import { useAllVotes, useMatches } from '@/hooks/queries';
import { matchResults, revealAnnouncements, type Announcement } from '@/utils/awards';
import type { EntityId, Match, Player } from '@/types';
import { holderNames } from './SeasonAwards';

interface RevealAnnouncementsProps {
  orgId?: string | null;
  match: Match;
  players: Player[];
}

/**
 * Résultats, once the podium is revealed (free plan too): the streaks, record
 * and month lead this match produced. Nothing when there is nothing to say.
 */
export function RevealAnnouncements({ orgId, match, players }: RevealAnnouncementsProps) {
  const { data: matches = [] } = useMatches(orgId);
  const { data: votes   = [] } = useAllVotes(orgId);

  // The match being revealed may not be in the cached list yet.
  const season = [...matches.filter(m => m.id !== match.id), match]
    .filter(m => (m.season || 1) === (match.season || 1));
  const announcements = revealAnnouncements(matchResults(players, season, votes), match.id as EntityId);
  if (announcements.length === 0) return null;

  const line = (a: Announcement) => {
    const name = holderNames([a.id], players);
    switch (a.kind) {
      case 'pepiteStreak': return t('awards.pepiteStreak', { name, count: a.count });
      case 'citronStreak': return t('awards.citronStreak', { name, count: a.count });
      case 'record':       return t('awards.record', { name, count: a.count });
      case 'monthLeader':  return t('awards.monthLeader', { name });
    }
  };

  return (
    <div role="status" style={{
      background: 'var(--gold-dim)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 12,
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)', marginBottom: 6 }}>{t('awards.factsTitle')}</div>
      {announcements.map(a => (
        <p key={`${a.kind}-${a.id}`} style={{ fontSize: 14, color: 'var(--label)', lineHeight: 1.5 }}>{line(a)}</p>
      ))}
    </div>
  );
}
