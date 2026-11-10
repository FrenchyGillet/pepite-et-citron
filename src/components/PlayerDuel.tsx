import { useState, type CSSProperties } from 'react';
import type { Player } from '@/types';
import type { MatchResult } from '@/utils/awards';
import { duel, type DuelSide } from '@/utils/compare';
import { track, EVENTS } from '@/utils/analytics';
import { t, type TKey } from '@/i18n';

const select: CSSProperties = {
  flex: 1, minWidth: 0, background: 'var(--bg3)', color: 'var(--label)', border: 'none',
  borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 15, outline: 'none',
};

const ROWS: Array<[TKey, keyof DuelSide]> = [
  ['stats.comparePlayed', 'played'],
  ['stats.comparePepitePts', 'bestPts'],
  ['stats.comparePepites', 'pepites'],
  ['stats.compareCitronPts', 'lemonPts'],
  ['stats.compareCitrons', 'citrons'],
];

/**
 * Saison (Pro): two players side by side, on the season's counted matches.
 * Folded behind one button so the page stays light.
 */
export function PlayerDuel({ players, results, defaultIds }: {
  players: Player[];
  results: MatchResult[];
  /** The first two of the Pépite ranking, preselected. */
  defaultIds: [string | undefined, string | undefined];
}) {
  const [open, setOpen] = useState(false);
  const played = players.filter(p => results.some(r => r.present.has(String(p.id))));
  const [a, setA] = useState<string>(defaultIds[0] ?? String(played[0]?.id ?? ''));
  const [b, setB] = useState<string>(defaultIds[1] ?? String(played[1]?.id ?? ''));
  if (played.length < 2) return null;

  const nameOf = (id: string) => players.find(p => String(p.id) === id)?.name ?? '?';
  const d = a && b && a !== b ? duel(results, a, b) : null;

  return (
    <div style={{ marginBottom: 16 }}>
      <button className="tag tag-dim" aria-expanded={open}
        onClick={() => { if (!open) track(EVENTS.PLAYERS_COMPARED); setOpen(o => !o); }}>
        {open ? t('stats.compareHide') : t('stats.compare')}
      </button>
      {open && (
        <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: 12, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select aria-label={t('stats.compareA')} style={select} value={a} onChange={e => setA(e.target.value)}>
              {played.map(p => <option key={String(p.id)} value={String(p.id)}>{p.name}</option>)}
            </select>
            <select aria-label={t('stats.compareB')} style={select} value={b} onChange={e => setB(e.target.value)}>
              {played.map(p => <option key={String(p.id)} value={String(p.id)}>{p.name}</option>)}
            </select>
          </div>
          {d && (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ color: 'var(--label3)', fontSize: 12 }}>
                    <th />
                    <th scope="col" style={{ textAlign: 'right', padding: '4px 0', fontWeight: 600 }}>{nameOf(a)}</th>
                    <th scope="col" style={{ textAlign: 'right', padding: '4px 0', fontWeight: 600 }}>{nameOf(b)}</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(([label, key]) => {
                    const va = d.a[key], vb = d.b[key];
                    // Highlight the better side: more is better, except for the citron.
                    const lowerWins = key === 'lemonPts' || key === 'citrons';
                    const best = va === vb ? null : (va > vb) !== lowerWins ? 'a' : 'b';
                    const cell = (s: 'a' | 'b'): CSSProperties => ({
                      textAlign: 'right', padding: '6px 0',
                      fontWeight: best === s ? 700 : 400, color: best === s ? 'var(--label)' : 'var(--label2)',
                    });
                    return (
                      <tr key={key} style={{ borderTop: '1px solid var(--separator)' }}>
                        <th scope="row" style={{ textAlign: 'left', padding: '6px 0', fontWeight: 400, color: 'var(--label3)' }}>{t(label)}</th>
                        <td style={cell('a')}>{va}</td>
                        <td style={cell('b')}>{vb}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ fontSize: 13, color: 'var(--label2)', margin: '10px 0 0', lineHeight: 1.45 }}>
                {d.together === 0 ? t('stats.compareNone') : [
                  t('stats.compareTogether', { count: d.together }),
                  t('stats.compareAhead', { name: nameOf(a), count: d.aAhead }),
                  t('stats.compareAhead', { name: nameOf(b), count: d.bAhead }),
                ].join(' · ')}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
