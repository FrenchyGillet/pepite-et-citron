import { useEffect, useState } from 'react';
import { api } from '@/api';
import { useAppStore } from '@/store/appStore';

interface JoinOrgViewProps {
  orgId:   string;
  orgName: string;
}

/**
 * Shown instead of OrgSetupView when a voter signed up via the ?org= link.
 * Auto-joins the org as 'voter', then reloads orgs so the main app can open.
 */
export function JoinOrgView({ orgId, orgName }: JoinOrgViewProps) {
  const [status, setStatus] = useState<'joining' | 'done' | 'error'>('joining');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadOrgs         = useAppStore(s => s.loadOrgs);
  const setPendingOrgId  = useAppStore(s => s.setPendingOrgId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await api.selfJoinOrg(orgId);
        if (cancelled) return;
        setPendingOrgId(null);
        await loadOrgs();
        if (!cancelled) setStatus('done');
      } catch (err) {
        if (cancelled) return;
        console.warn('selfJoinOrg failed:', err);
        // Even if auto-join fails (RLS), clear pending so app doesn't loop
        setPendingOrgId(null);
        setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue');
        setStatus('error');
        // Force orgs reload so the app can continue (user just won't be a member)
        await loadOrgs().catch(() => {});
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (status === 'joining' || status === 'done') {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', background: 'var(--bg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="header-logo" style={{ fontSize: 28 }}>
            <span className="header-pepite">Pépite</span>
            <span className="header-amp"> & </span>
            <span className="header-citron">Citron</span>
          </div>
        </div>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,215,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          {status === 'done' ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#32D74B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '3px solid rgba(255,215,0,0.3)',
              borderTopColor: '#FFD700',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--label)', marginBottom: 8, textAlign: 'center' }}>
          {status === 'done' ? `Bienvenue dans ${orgName} ! 🎉` : 'Connexion à l\'équipe…'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--label3)', textAlign: 'center', lineHeight: 1.6 }}>
          {status === 'done'
            ? 'Tu peux maintenant voter et suivre tes stats de saison.'
            : `Liaison de ton compte à ${orgName}…`}
        </div>
      </div>
    );
  }

  // error — RLS blocked the insert (missing policy); show a graceful fallback
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="header-logo" style={{ fontSize: 28 }}>
          <span className="header-pepite">Pépite</span>
          <span className="header-amp"> & </span>
          <span className="header-citron">Citron</span>
        </div>
      </div>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--bg2)', borderRadius: 'var(--radius-lg)',
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--label)', marginBottom: 8 }}>
          Compte créé !
        </div>
        <p style={{ fontSize: 14, color: 'var(--label3)', lineHeight: 1.6, marginBottom: 20 }}>
          Ton compte est prêt. Demande à ton capitaine de t&apos;ajouter dans l&apos;équipe{' '}
          <strong style={{ color: 'var(--label)' }}>{orgName}</strong> pour accéder aux stats de saison.
        </p>
        {errorMsg && (
          <p style={{ fontSize: 11, color: 'var(--label4)', fontFamily: 'monospace', marginBottom: 12 }}>
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
