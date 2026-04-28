import { useState, useEffect } from 'react';
import { computeScores } from '@/utils';
import { displayName } from '@/utils/player';
import { AnimatedNumber } from './AnimatedNumber';
import type { Vote, Player, EntityId } from '@/types';

interface Tiebreakers {
  best_id?: EntityId;
  lemon_id?: EntityId;
}

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

export function PodiumView({ votes, present, allPlayers, tiebreakers = {}, pepiteCount = 2 }: PodiumViewProps) {
  const [podiumTab, setPodiumTab] = useState<'pepite' | 'citron'>('pepite');
  const [ready,     setReady]     = useState(false);

  useEffect(() => { requestAnimationFrame(() => setReady(true)); }, []);
  // Reset animation when tab changes
  useEffect(() => { setReady(false); requestAnimationFrame(() => setReady(true)); }, [podiumTab]);

  const { best, lemon } = computeScores(votes, present, allPlayers, pepiteCount);
  const everyone   = allPlayers || present;
  const presentIds = new Set(present.map(p => p.id));

  const buildRanked = (scores: typeof best, tieKey: keyof Tiebreakers, pool: Player[]): RankedPlayer[] =>
    pool
      .map(p => ({ ...p, pts: scores[p.id]?.pts || 0, comments: scores[p.id]?.comments || [], absent: !presentIds.has(p.id) }))
      .filter(p => p.pts > 0)
      .sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : tiebreakers[tieKey] === a.id ? -1 : tiebreakers[tieKey] === b.id ? 1 : 0);

  const isPepite = podiumTab === 'pepite';
  const ranked   = isPepite ? buildRanked(best, 'best_id', present) : buildRanked(lemon, 'lemon_id', everyone);
  const color    = isPepite ? 'var(--gold)'  : 'var(--lemon)';
  const colorDim = isPepite ? 'var(--gold-dim)' : 'var(--lemon-dim)';

  const [first, second, third] = ranked;

  // Stagger delays for podium slots: 2nd=0ms, 1st=80ms, 3rd=160ms (center last for drama)
  const slotDelay = (place: number) => place === 1 ? 80 : place === 2 ? 0 : 160;

  const Slot = ({ player, place, height }: { player: RankedPlayer | undefined; place: number; height: number }) => {
    const isFirst   = place === 1;
    const nameColor = isFirst ? color : place === 2 ? 'var(--label2)' : 'var(--label3)';
    const delay     = slotDelay(place);
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {player ? (
          <>
            {isFirst && <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 5 }}>👑</div>}
            <div style={{ fontSize: isFirst ? 15 : 13, fontWeight: 700, color: nameColor, textAlign: 'center', lineHeight: 1.2, marginBottom: 2, padding: '0 4px' }}>{displayName(player)}</div>
            {player.absent && <div style={{ fontSize: 10, color: 'var(--label4)', marginBottom: 2, fontStyle: 'italic' }}>absent</div>}
            <div style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 8 }}>
              <AnimatedNumber value={player.pts} delay={delay} /> pt{player.pts > 1 ? 's' : ''}
            </div>
          </>
        ) : (
          <div style={{ height: 56 }} />
        )}
        <div style={{
          height: ready ? height : 0,
          width: '100%',
          borderRadius: '8px 8px 0 0',
          background: isFirst ? colorDim : 'var(--bg3)',
          border: isFirst ? `1px solid ${color}` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          transition: `height 0.85s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        }}>
          <span style={{ fontSize: isFirst ? 28 : 20, fontWeight: 800, color: isFirst ? color : 'var(--label4)' }}>{place}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: 4, marginBottom: 20 }}>
        {([{ id: 'pepite', label: '⭐  Pépites' }, { id: 'citron', label: '🍋  Citrons' }] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setPodiumTab(id)} style={{
            flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: podiumTab === id ? 'var(--bg3)' : 'transparent',
            color: podiumTab === id ? 'var(--label)' : 'var(--label3)',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <div className="group" style={{ marginBottom: 16 }}>
          <div className="row"><span style={{ color: 'var(--label3)', fontSize: 14 }}>Aucun vote.</span></div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            <Slot player={second} place={2} height={80} />
            <Slot player={first}  place={1} height={112} />
            <Slot player={third}  place={3} height={56} />
          </div>
          <div style={{ height: 4, background: 'var(--bg3)', borderRadius: '0 0 8px 8px', marginBottom: 24 }} />

          {first?.comments?.length > 0 && (
            <>
              <p className="section-label mb-4">Commentaires sur {displayName(first)}</p>
              <div className="group" style={{ marginBottom: 16 }}>
                {first.comments.map((c, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--separator)' }}>
                    <div style={{ fontSize: 13, color: 'var(--label2)', fontStyle: 'italic', lineHeight: 1.5 }}>"{c}"</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {ranked.length > 3 && (
            <>
              <p className="section-label mb-4">Suite du classement</p>
              <div className="group" style={{ marginBottom: 16 }}>
                {ranked.slice(3).map((p, i) => (
                  <div key={String(p.id)} className="row">
                    <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0, color: 'var(--label3)' }}>{i + 4}</div>
                    <div className="row-body"><div className="row-title">{displayName(p)}</div></div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{
                          width: ready ? `${(p.pts / (ranked[0]?.pts || 1)) * 100}%` : '0%',
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
