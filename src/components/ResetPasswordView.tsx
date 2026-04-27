import { useState } from 'react';
import { api } from '@/api';
import { useAppStore } from '@/store/appStore';

export function ResetPasswordView() {
  const setPasswordRecovery = useAppStore(s => s.setPasswordRecovery);

  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [done,        setDone]        = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      await api.updatePassword(password);
      setDone(true);
      // Give user 2 s to read the success message, then clear recovery mode
      // so the app continues as a normal authenticated session.
      setTimeout(() => setPasswordRecovery(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

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

      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--label)', marginBottom: 6 }}>
              Mot de passe mis à jour
            </div>
            <div style={{ fontSize: 13, color: 'var(--label3)' }}>
              Tu vas être redirigé vers l'app…
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--label)', marginBottom: 4 }}>
                Nouveau mot de passe
              </div>
              <div style={{ fontSize: 13, color: 'var(--label3)' }}>
                Choisis un nouveau mot de passe pour ton compte.
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  placeholder="8 caractères minimum"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  placeholder="Répète ton nouveau mot de passe"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(255,80,80,.12)', border: '1px solid rgba(255,80,80,.3)',
                  borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                  fontSize: 13, color: '#ff6b6b',
                }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ marginTop: 4 }}>
                {isSubmitting ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
