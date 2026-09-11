import { useState } from 'react';
import { humanizeError } from '@/utils/errors';

// ── Manage subscription (Stripe billing portal) ───────────────────────────────
export function ManageSubscriptionButton({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [detail,  setDetail]  = useState<string | null>(null);

  const openPortal = async () => {
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Session expirée, reconnecte-toi');
      const res  = await fetch('/api/create-portal-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ orgId }),
      });
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string; detail?: string };
      if (!res.ok || !data.url) {
        setDetail(data.detail ?? `HTTP ${res.status}`);
        throw new Error(data.error || 'Erreur inattendue');
      }
      window.location.href = data.url;
    } catch (err) {
      setError(humanizeError(err));
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        className="btn btn-secondary btn-full"
        style={{ fontSize: 13 }}
        onClick={openPortal}
        disabled={loading}
      >
        {loading ? 'Redirection…' : '💳 Gérer mon abonnement'}
      </button>
      {error && (
        <p role="alert" style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
          {error}
          {detail && <span style={{ display: 'block', fontSize: 11, color: 'var(--label3)', marginTop: 2 }}>Détail : {detail}</span>}
        </p>
      )}
    </div>
  );
}
