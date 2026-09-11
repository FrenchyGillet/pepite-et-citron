import { useState } from 'react';
import { useModalA11y } from '@/hooks/useModalA11y';
import { humanizeError } from '@/utils/errors';
import { postToApi } from '@/lib/serverApi';

interface Props {
  orgId: string;
  onClose: () => void;
  /** Plan chosen on the landing page, if any. */
  initialPlan?: Plan;
}

type Plan = 'monthly' | 'annual';

const FEATURES_FREE = [
  'Vote illimité après chaque match',
  'Résultats et podium en temps réel',
  'Partage du podium en image',
];
const FEATURES_PRO = [
  'Statistiques et classement de la saison',
  'Historique complet de tous vos matchs',
  'Tendances par joueur & assiduité',
];

export function UpgradeModal({ orgId, onClose, initialPlan = 'annual' }: Props) {
  const [plan,    setPlan]    = useState<Plan>(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [detail,  setDetail]  = useState<string | null>(null);
  const dialogRef = useModalA11y(onClose);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const res = await postToApi('/api/create-checkout-session', { orgId, plan });
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string; detail?: string };
      if (!res.ok || !data.url) {
        setDetail(data.detail ?? `HTTP ${res.status}`);
        throw new Error(data.error || 'Erreur serveur');
      }
      window.location.href = data.url;
    } catch (err) {
      setError(humanizeError(err));
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
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Passer à Pépite & Citron Pro"
        style={{
          background: 'var(--bg2)', borderRadius: '24px 24px 0 0',
          padding: '32px 24px 40px', width: '100%', maxWidth: 480,
          border: '1px solid var(--separator)',
        }}
      >

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
              Pépite &amp; Citron Pro
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
              Tout pour votre saison
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
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
                background: plan === p ? 'var(--gold-fill)' : 'var(--bg3)',
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
                <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, background: plan === 'annual' ? 'rgba(0,0,0,0.12)' : 'rgba(255,215,0,0.15)', color: plan === 'annual' ? '#000' : 'var(--gold)', borderRadius: 6, padding: '2px 6px', display: 'inline-block' }}>
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
              <span style={{ color: 'var(--green)', fontSize: 16 }}>✓</span> {f}
            </div>
          ))}
          <div style={{ margin: '8px 0', height: 1, background: 'var(--separator)' }} />
          {FEATURES_PRO.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 14, color: 'var(--label)', fontWeight: 500 }}>
              <span style={{ color: 'var(--gold)', fontSize: 16 }}>⭐</span> {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        {error && (
          <div role="alert" style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12, textAlign: 'center' }}>
            {error}
            {detail && (
              <div style={{ fontSize: 11, color: 'var(--label3)', marginTop: 4, wordBreak: 'break-word' }}>
                Détail : {detail}
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width: '100%', padding: '17px', borderRadius: 16,
            background: 'var(--gold-fill)', color: '#000', border: 'none',
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

