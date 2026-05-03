/**
 * SeasonTeaser — Mini locked season leaderboard shown to free users after results.
 *
 * Shows the real top-3 players of the current season with their names visible
 * but their scores blurred and locked. Creates concrete FOMO and drives Pro upgrades.
 * Only rendered when there are at least 2 closed matches this season (1 match = not
 * yet meaningful for a "season" story).
 */
import { useAllVotes, useMatches, useTeams, useCurrentSeason } from '@/hooks/queries';
import { computeSeasonStats } from '@/utils/season';
import { track, EVENTS } from '@/utils/analytics';
import type { Player } from '@/types';

interface Props {
  orgId?: string | null;
  players: Player[];
  onUpgrade: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function SeasonTeaser({ orgId, players, onUpgrade }: Props) {
  const { data: allVotes   = [] } = useAllVotes(orgId);
  const { data: allMatches = [] } = useMatches(orgId);
  const { data: allTeams   = [] } = useTeams(orgId);
  const { data: currentSeason = 1 } = useCurrentSeason(orgId);

  // Only count closed matches (not the currently open/counting one)
  const seasonMatches = allMatches.filter(m =>
    (m.season || 1) === currentSeason && !m.is_open && m.phase !== 'voting' && m.phase !== 'counting'
  );

  // Need at least 2 closed matches to tell a meaningful season story
  if (seasonMatches.length < 2) return null;

  const { rankedBest, totalMatches } = computeSeasonStats(
    players, seasonMatches, allVotes, allTeams
  );

  const top3 = rankedBest.filter(p => p.matchesPlayed > 0).slice(0, 3);
  if (top3.length === 0) return null;

  const leader = top3[0];

  return (
    <div style={{
      marginTop: 8, marginBottom: 4,
      background: 'var(--bg2)',
      border: '1px solid var(--separator)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid var(--separator)',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
            🏆 Classement de saison
          </div>
          <div style={{ fontSize: 11, color: 'var(--label3)', marginTop: 2 }}>
            {totalMatches} match{totalMatches > 1 ? 's' : ''} · Saison {currentSeason}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--gold)',
          background: 'var(--gold-dim)', borderRadius: 20,
          padding: '3px 8px', letterSpacing: '0.06em',
        }}>PRO</span>
      </div>

      {/* Leader highlight (visible name, blurred score) */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(255,214,10,0.04)',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '0.5px solid var(--separator)',
      }}>
        <span style={{ fontSize: 20 }}>🥇</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
            {leader.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--label3)', marginTop: 1 }}>
            {leader.matchesPlayed} match{leader.matchesPlayed > 1 ? 's' : ''} joué{leader.matchesPlayed > 1 ? 's' : ''}
          </div>
        </div>
        {/* Score blurred */}
        <div style={{ filter: 'blur(6px)', userSelect: 'none', pointerEvents: 'none' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)' }}>
            {leader.bestPts} pts
          </span>
        </div>
      </div>

      {/* Rest of top 3 — names visible, scores blurred */}
      {top3.slice(1).map((p, i) => (
        <div key={p.name} style={{
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: i < top3.length - 2 ? '0.5px solid var(--separator)' : 'none',
        }}>
          <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>
            {MEDALS[i + 1]}
          </span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--label2)' }}>
              {p.name}
            </span>
          </div>
          <div style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--label3)' }}>
              {p.bestPts} pts
            </span>
          </div>
        </div>
      ))}

      {/* CTA */}
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--separator)' }}>
        <button
          onClick={() => { track(EVENTS.UPGRADE_CLICKED, { source: 'season_teaser' }); onUpgrade(); }}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'linear-gradient(135deg, rgba(255,214,10,0.15) 0%, rgba(255,214,10,0.08) 100%)',
            border: '1px solid var(--gold-dim)',
            borderRadius: 'var(--radius)',
            padding: '11px 16px',
            fontSize: 14, fontWeight: 700, color: 'var(--gold)',
            cursor: 'pointer',
          }}
        >
          <span>🔓</span>
          Débloquer le classement complet →
        </button>
      </div>
    </div>
  );
}
