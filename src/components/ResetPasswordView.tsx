import { useState } from 'react';
import { api } from '@/api';
import { useAppStore } from '@/store/appStore';
import { humanizeError } from '@/utils/errors';
import { track, EVENTS } from '@/utils/analytics';
import { useT } from '@/i18n';

export function ResetPasswordView() {
  const t = useT();
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
      setError(t('resetPassword.tooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('resetPassword.mismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await api.updatePassword(password);
      track(EVENTS.PASSWORD_RESET_COMPLETED);
      setDone(true);
      // Give user 2 s to read the success message, then clear recovery mode
      // so the app continues as a normal authenticated session.
      setTimeout(() => setPasswordRecovery(false), 2000);
    } catch (err) {
      setError(humanizeError(err));
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
              {t('resetPassword.updated')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--label3)' }}>
              {t('resetPassword.redirecting')}
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--label)', marginBottom: 4 }}>
                {t('resetPassword.title')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--label3)' }}>
                {t('resetPassword.intro')}
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label htmlFor="reset-password" style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
                  {t('resetPassword.newLabel')}
                </label>
                <input
                  id="reset-password"
                  type="password"
                  placeholder={t('resetPassword.newPlaceholder')}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label htmlFor="reset-confirm" style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
                  {t('resetPassword.confirmLabel')}
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  placeholder={t('resetPassword.confirmPlaceholder')}
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
                  fontSize: 13, color: 'var(--red)',
                }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ marginTop: 4 }}>
                {isSubmitting ? t('resetPassword.updating') : t('resetPassword.submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
