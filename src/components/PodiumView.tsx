import { useState, useEffect } from 'react';
import { computeScores } from '@/utils';
import { rankWithTies, type RankGroup, type Tiebreakers } from '@/utils/scoring';
import { displayName, initials, avatarColor } from '@/utils/player';
import { AnimatedNumber } from './AnimatedNumber';
import type { Vote, Player } from '@/types';

interface PodiumViewProps {
  votes: Vote[];
  present: Player[];
  allPlayers?: Player[];
  tiebreakers?: Tiebreakers;
  pepiteCount?: 2 | 3;
}

interface RankedPlayer extends Player {
  pts: number;
  comments: string[];
  absent: boolean;
}

/** Podium positions, left to right: 2nd step, top step, 3rd step. */
const POSITIONS = [
  { index: 1, height: 80,  delay: 0   },
  { index: 0, height: 112, delay: 80  }, // center last-but-one for drama
  { index: 2, height: 56,  delay: 160 },
] as const;

const joinNames = (players: RankedPlayer[]) => {
  const names = players.map(displayName);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0] ?? '';
};

interface PodiumSlotProps {
  group: RankGroup<RankedPlayer> | undefined;
  isTop: boolean;
  height: number;
  delay: number;
  ready: boolean;
  color: string;
  colorDim: string;
}

// One podium step. A step can hold several ex-aequo players: they share the
// rank, the crown (top step) and the points.
function PodiumSlot({ group, isTop, height, delay, ready, color, colorDim }: PodiumSlotProps) {
  const players    = group?.players ?? [];
  const tied       = players.length > 1;
  const nameColor  = isTop ? color : group && group.rank === 2 ? 'var(--label2)' : 'var(--label3)';
  const avatarSize = isTop ? (tied ? 36 : 44) : tied ? 28 : group && group.rank === 2 ? 36 : 30;
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {group ? (
        <>
          <div style={{ display: 'flex', marginBottom: isTop ? 3 : 4 }}>
            {players.slice(0, 3).map((p, i) => (
              <div key={String(p.id)} aria-hidden="true" style={{
                width: avatarSize, height: avatarSize, borderRadius: '50%',
                background: avatarColor(p.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: Math.round(avatarSize * 0.38), fontWeight: 800,
                color: '#fff', letterSpacing: '-0.3px', flexShrink: 0, userSelect: 'none',
                marginLeft: i > 0 ? -8 : 0, border: tied ? '2px solid var(--bg)' : 'none',
              }}>
                {initials(displayName(p))}
              </div>
            ))}
          </div>
          {isTop && <div aria-hidden="true" style={{ fontSize: 26, lineHeight: 1, marginBottom: 5 }}>👑</div>}
          {tied && (
            <div style={{ fontSize: 10, fontWeight: 700, color: nameColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
              Ex-aequo
            </div>
          )}
          <div style={{ fontSize: isTop ? 15 : 13, fontWeight: 700, color: nameColor, textAlign: 'center', lineHeight: 1.2, marginBottom: 2, padding: '0 4px', overflowWrap: 'anywhere' }}>
            {joinNames(players)}
          </div>
          {!tied && players[0]?.absent && <div style={{ fontSize: 10, color: 'var(--label4)', marginBottom: 2, fontStyle: 'italic' }}>absent</div>}
          <div style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 8 }}>
            <AnimatedNumber value={group.pts} delay={delay} /> pt{group.pts > 1 ? 's' : ''}
          </div>
        </>
      ) : (
        <div style={{ height: avatarSize + (isTop ? 3 : 4) }} />
      )}
      <div style={{
        height: ready ? height : 0,
        width: '100%',
        borderRadius: '8px 8px 0 0',
        background: isTop ? colorDim : 'var(--bg3)',
        border: isTop ? `1px solid ${color}` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        transition: `height 0.85s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}>
        {group && (
          <span style={{ fontSize: isTop ? 28 : 20, fontWeight: 800, color: isTop ? color : 'var(--label4)' }}>{group.rank}</span>
        )}
      </div>
    </div>
  );
}

export function PodiumView({ votes, present, allPlayers, tiebreakers = {}, pepiteCount = 2 }: PodiumViewProps) {
  const [podiumTab, setPodiumTab] = useState<'pepite' | 'citron'>('pepite');
  const [ready,     setReady]     = useState(false);

  useEffect(() => { requestAnimationFrame(() => setReady(true)); }, []);
  // Reset animation when tab changes
  useEffect(() => { setReady(false); requestAnimationFrame(() => setReady(true)); }, [podiumTab]);

  const { best, lemon } = computeScores(votes, present, allPlayers, pepiteCount);
  const everyone   = allPlayers || present;
  const presentIds = new Set(present.map(p => p.id));

  const toEntries = (scores: typeof best, pool: Player[]): RankedPlayer[] =>
    pool.map(p => ({ ...p, pts: scores[p.id]?.pts || 0, comments: scores[p.id]?.comments || [], absent: !presentIds.has(p.id) }));

  const isPepite = podiumTab === 'pepite';
  // Same ranking rule as the share image/text and the season stats.
  const groups = isPepite
    ? rankWithTies(toEntries(best, present), tiebreakers.best_id)
    : rankWithTies(toEntries(lemon, everyone), tiebreakers.lemon_id);
  const color    = isPepite ? 'var(--gold)'  : 'var(--lemon)';
  const colorDim = isPepite ? 'var(--gold-dim)' : 'var(--lemon-dim)';

  const winners   = groups[0]?.players ?? [];
  const topScore  = groups[0]?.pts || 1;
  const restStart = 3; // the podium shows the first three rank groups
  const rest      = groups.slice(restStart);

  return (
    <>
      <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: 4, marginBottom: 20 }}>
        {([{ id: 'pepite', label: '⭐  Pépites' }, { id: 'citron', label: '🍋  Citrons' }] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setPodiumTab(id)} aria-pressed={podiumTab === id} style={{
            flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: podiumTab === id ? 'var(--bg3)' : 'transparent',
            color: podiumTab === id ? 'var(--label)' : 'var(--label3)',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="group" style={{ marginBottom: 16 }}>
          <div className="row"><span style={{ color: 'var(--label3)', fontSize: 14 }}>Aucun vote.</span></div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            {POSITIONS.map(({ index, height, delay }) => (
              <PodiumSlot key={index} group={groups[index]} isTop={index === 0}
                height={height} delay={delay} ready={ready} color={color} colorDim={colorDim} />
            ))}
          </div>
          <div style={{ height: 4, background: 'var(--bg3)', borderRadius: '0 0 8px 8px', marginBottom: 24 }} />

          {winners.filter(w => w.comments.length > 0).map(w => (
            <div key={String(w.id)}>
              <p className="section-label mb-4">Commentaires sur {displayName(w)}</p>
              <div className="group" style={{ marginBottom: 16 }}>
                {w.comments.map((c, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--separator)' }}>
                    <div style={{ fontSize: 13, color: 'var(--label2)', fontStyle: 'italic', lineHeight: 1.5 }}>"{c}"</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {rest.length > 0 && (
            <>
              <p className="section-label mb-4">Suite du classement</p>
              <div className="group" style={{ marginBottom: 16 }}>
                {rest.flatMap(g => g.players.map(p => ({ p, rank: g.rank }))).map(({ p, rank }, i) => (
                  <div key={String(p.id)} className="row">
                    <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0, color: 'var(--label3)' }}>{rank}</div>
                    <div className="row-body"><div className="row-title">{displayName(p)}</div></div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{
                          width: ready ? `${(p.pts / topScore) * 100}%` : '0%',
                          background: 'var(--label3)',
                          transition: `width 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${(i + 3) * 80}ms`,
                        }} />
                      </div>
                      <div className="row-value" style={{ color: 'var(--label3)', minWidth: 24, textAlign: 'right' }}>
                        <AnimatedNumber value={p.pts} delay={(i + 3) * 80} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
