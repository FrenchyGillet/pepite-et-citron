import { track, EVENTS } from '@/utils/analytics';
import type { Player } from '@/types';

interface Props {
  onUpgrade: () => void;
  players?: Player[];
}

// Deterministic fake scores from player index so the preview looks realistic
const FAKE_SCORES = [87, 62, 48, 31, 22, 14];
const FALLBACK_NAMES = ['Théo', 'Maxime', 'Jordan', 'Kevin'];

export function StatsLockedView({ onUpgrade, players }: Props) {
  const previewRows: Array<{ name: string; pct: number }> =
    players && players.length > 0
      ? players.slice(0, 4).map((p, i) => ({ name: p.name, pct: FAKE_SCORES[i] ?? 10 }))
      : FALLBACK_NAMES.map((name, i) => ({ name, pct: FAKE_SCORES[i] }));

  return (
    <div style={{
      minHeight: '60dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      {/* Blurred preview — real player names, fake scores */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 320, marginBottom: 32 }}>
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--separator)',
          borderRadius: 20,
          padding: '24px 20px',
          filter: 'blur(5px)',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.7,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--label3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Classement saison
          </div>
          {previewRows.map(({ name, pct }, i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 20, fontSize: 13, fontWeight: 700, color: i === 0 ? 'var(--gold)' : 'var(--label3)', textAlign: 'center' }}>
                {i === 0 ? '⭐' : `${i + 1}`}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--label)', textAlign: 'left' }}>{name}</div>
                <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? '#FFD700' : 'var(--label4)', borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? 'var(--gold)' : 'var(--label3)', minWidth: 36, textAlign: 'right' }}>{pct} pts</div>
            </div>
          ))}
        </div>
        {/* Overlay lock badge */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 20,
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
            borderRadius: 14, padding: '10px 20px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Réservé au plan Pro</span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, letterSpacing: -0.4 }}>
        Stats de saison
      </div>
      <div style={{ fontSize: 15, color: 'var(--label2)', lineHeight: 1.6, maxWidth: 280, marginBottom: 28 }}>
        Le classement cumulé de la saison, l'historique de tous vos matchs et les tendances par joueur — réservés au plan Pro.
      </div>

      <button
        onClick={() => { track(EVENTS.UPGRADE_CLICKED, { source: 'stats' }); onUpgrade(); }}
        style={{
          background: '#FFD700',
          color: '#000',
          border: 'none',
          borderRadius: 14,
          padding: '15px 32px',
          fontSize: 16,
          fontWeight: 800,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        Passer Pro — dès 12,99 €/an →
      </button>

      <div style={{ fontSize: 12, color: 'var(--label3)' }}>
        Résiliation en un clic · Paiement sécurisé Stripe
      </div>
    </div>
  );
}
