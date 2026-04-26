import { track, EVENTS } from '@/utils/analytics';

interface Props {
  onUpgrade: () => void;
}

export function StatsLockedView({ onUpgrade }: Props) {
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
      {/* Blurred preview */}
      <div style={{
        width: '100%', maxWidth: 320,
        background: 'var(--bg2)',
        border: '1px solid var(--separator)',
        borderRadius: 20,
        padding: '24px 20px',
        marginBottom: 32,
        filter: 'blur(4px)',
        pointerEvents: 'none',
        userSelect: 'none',
        opacity: 0.6,
      }}>
        {[['Théo', 87], ['Maxime', 62], ['Jordan', 48], ['Kevin', 31]].map(([name, pct]) => (
          <div key={name as string} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 28, fontSize: 13, fontWeight: 700, color: 'var(--label2)' }}>
              {name === 'Théo' ? '⭐' : ''}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--label)', textAlign: 'left' }}>{name as string}</div>
              <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct as number}%`, background: '#FFD700', borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--label2)' }}>{pct as number} pts</div>
          </div>
        ))}
      </div>

      {/* Lock icon */}
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>

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
