import { useState } from 'react';

interface Props {
  orgId: string;
  onClose: () => void;
}

type Plan = 'monthly' | 'annual';

const FEATURES_FREE = [
  'Vote illimité après chaque match',
  'Résultats en temps réel',
  'Liens invité pour les coéquipiers',
];
const FEATURES_PRO = [
  'Statistiques de saison complètes',
  'Historique de tous vos matchs',
  'Sans publicité',
  'Support prioritaire',
];

export function UpgradeModal({ orgId, onClose }: Props) {
  const [plan,    setPlan]    = useState<Plan>('annual');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orgId, plan }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || 'Erreur serveur');
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg2)', borderRadius: '24px 24px 0 0',
        padding: '32px 24px 40px', width: '100%', maxWidth: 480,
        border: '1px solid var(--separator)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#FFD700', marginBottom: 6 }}>
              Pépite &amp; Citron Pro
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
              Débloquez toutes les stats
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--bg3)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: 'var(--label2)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>

        {/* Plan toggle */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24,
        }}>
          {(['monthly', 'annual'] as Plan[]).map(p => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              style={{
                background: plan === p ? '#FFD700' : 'var(--bg3)',
                color:      plan === p ? '#000'    : 'var(--label)',
                border:     plan === p ? 'none'    : '1px solid var(--separator)',
                borderRadius: 14, padding: '14px 12px', cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                {p === 'monthly' ? 'Mensuel' : 'Annuel'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>
                {p === 'monthly' ? '2,99 €' : '12,99 €'}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>
                {p === 'monthly' ? 'par mois' : 'par an · économisez 63 %'}
              </div>
              {p === 'annual' && (
                <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, background: plan === 'annual' ? 'rgba(0,0,0,0.12)' : 'rgba(255,215,0,0.15)', color: plan === 'annual' ? '#000' : '#FFD700', borderRadius: 6, padding: '2px 6px', display: 'inline-block' }}>
                  MEILLEURE OFFRE
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Feature list */}
        <div style={{ marginBottom: 24 }}>
          {FEATURES_FREE.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 14, color: 'var(--label2)' }}>
              <span style={{ color: '#32D74B', fontSize: 16 }}>✓</span> {f}
            </div>
          ))}
          <div style={{ margin: '8px 0', height: 1, background: 'var(--separator)' }} />
          {FEATURES_PRO.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 14, color: 'var(--label)', fontWeight: 500 }}>
              <span style={{ color: '#FFD700', fontSize: 16 }}>⭐</span> {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        {error && (
          <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width: '100%', padding: '17px', borderRadius: 16,
            background: '#FFD700', color: '#000', border: 'none',
            fontSize: 16, fontWeight: 800, cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Redirection…' : `Passer Pro — ${plan === 'monthly' ? '2,99 €/mois' : '12,99 €/an'} →`}
        </button>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--label3)', marginTop: 12 }}>
          Résiliation en un clic · Paiement sécurisé Stripe
        </div>
      </div>
    </div>
  );
}
