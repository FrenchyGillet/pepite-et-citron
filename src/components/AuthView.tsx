import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { api } from '@/api';
import { loginSchema, signupSchema, type AuthFormValues } from '@/schemas';
import { OnboardingModal } from '@/components/OnboardingModal';
import { track, EVENTS } from '@/utils/analytics';
import { humanizeError } from '@/utils/errors';
import { parseUpgradePlan, saveUpgradeIntent } from '@/utils/signupIntent';
import { useAppStore } from '@/store/appStore';
import type { UserSession } from '@/types';
import { useT } from '@/i18n';
import { LanguagePicker } from '@/components/LanguagePicker';

interface AuthViewProps {
  onAuth: (session: UserSession) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{msg}</p> : null;

export function AuthView({ onAuth }: AuthViewProps) {
  // The signup form is for a voter joining their team (pendingOrgId, from the
  // "Rejoindre" button after a vote, /login?mode=signup). Someone creating a
  // team is sent to /start, which also opens their first vote.
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const t              = useT();
  const pendingOrgId   = useAppStore(s => s.pendingOrgId);
  const [mode,      setMode]      = useState<AuthMode>(() => searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [apiError,  setApiError]  = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>();

  // "Passer Pro" on the landing: offer the upgrade once the team exists (App).
  useEffect(() => {
    const plan = parseUpgradePlan(searchParams.get('plan'));
    if (plan) saveUpgradeIntent(plan);
  }, [searchParams]);

  const switchMode = (next: AuthMode) => {
    if (next === 'signup' && !pendingOrgId) { navigate('/start'); return; }
    setMode(next);
    setApiError(null);
    setResetSent(false);
    reset();
    clearErrors();
  };

  const onSubmit = handleSubmit(async (data) => {
    if (mode === 'forgot') {
      setApiError(null);
      try {
        await api.resetPassword(data.email);
        track(EVENTS.PASSWORD_RESET_REQUESTED);
        setResetSent(true);
      } catch (err) {
        setApiError(humanizeError(err));
      }
      return;
    }

    // Validate with mode-appropriate schema
    const schema = mode === 'signup' ? signupSchema : loginSchema;
    const result = schema.safeParse(data);
    if (!result.success) {
      result.error.issues.forEach(({ path, message }) => {
        setError(path[0] as keyof AuthFormValues, { message });
      });
      return;
    }

    setApiError(null);
    try {
      if (mode === 'signup') {
        await api.signUp(data.email, data.password);
      } else {
        await api.signIn(data.email, data.password);
      }
      const session = await api.getSession();
      if (session) {
        track(mode === 'signup' ? EVENTS.AUTH_SIGNUP : EVENTS.AUTH_LOGIN);
        onAuth(session);
      } else {
        // Email confirmation on in Supabase: nothing to sign in with yet.
        setApiError(t('auth.confirmEmail'));
      }
    } catch (err) {
      track(EVENTS.AUTH_FAILED, { mode });
      setApiError(humanizeError(err));
    }
  });

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
        <div style={{ fontSize: 13, color: 'var(--label3)', marginTop: 6 }}>
          {t('auth.tagline')}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: 24 }}>

        {mode !== 'forgot' && (
          /* Mode toggle — login / signup */
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
            {([{ id: 'login', label: t('auth.tabLogin') }, { id: 'signup', label: t('auth.tabSignup') }] as const).map(tab => (
              <button key={tab.id} onClick={() => switchMode(tab.id)} style={{
                flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: mode === tab.id ? 'var(--bg)' : 'transparent',
                color: mode === tab.id ? 'var(--label)' : 'var(--label3)',
                boxShadow: mode === tab.id ? '0 1px 3px rgba(0,0,0,.3)' : 'none',
              }}>{tab.label}</button>
            ))}
          </div>
        )}

        {mode === 'forgot' && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => switchMode('login')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, color: 'var(--label3)', padding: 0, marginBottom: 16,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              {t('auth.back')}
            </button>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--label)', marginBottom: 4 }}>
              {t('auth.forgotTitle')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--label3)', lineHeight: 1.5 }}>
              {t('auth.forgotIntro')}
            </div>
          </div>
        )}

        {/* Reset email sent confirmation */}
        {resetSent ? (
          <div style={{
            background: 'rgba(50,215,75,.1)', border: '1px solid rgba(50,215,75,.25)',
            borderRadius: 'var(--radius-sm)', padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📬</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#32D74B', marginBottom: 6 }}>
              {t('auth.resetSent')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--label3)', lineHeight: 1.5 }}>
              {t('auth.resetSentHint')}
            </div>
            <button
              onClick={() => switchMode('login')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--label3)', marginTop: 16,
                textDecoration: 'underline', textDecorationColor: 'var(--label4)',
              }}
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label htmlFor="auth-email" style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
                {t('auth.emailLabel')}
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
                style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.email ? 'var(--red)' : undefined }}
                {...register('email')}
              />
              <FieldError msg={errors.email?.message} />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label htmlFor="auth-password" style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
                  {t('auth.passwordLabel')}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  placeholder={t(mode === 'signup' ? 'auth.passwordPlaceholderSignup' : 'auth.passwordPlaceholderLogin')}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.password ? 'var(--red)' : undefined }}
                  {...register('password')}
                />
                <FieldError msg={errors.password?.message} />
              </div>
            )}

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: -4 }}>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: 'var(--label3)',
                    textDecoration: 'underline', textDecorationColor: 'var(--label4)',
                    textUnderlineOffset: 2, padding: 0,
                  }}
                >
                  {t('auth.forgotLink')}
                </button>
              </div>
            )}

            {apiError && (
              <div style={{
                background: 'rgba(255,80,80,.12)', border: '1px solid rgba(255,80,80,.3)',
                borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                fontSize: 13, color: 'var(--red)',
              }}>
                {apiError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ marginTop: 4 }}>
              {isSubmitting
                ? t(mode === 'signup' ? 'auth.creating' : mode === 'forgot' ? 'auth.sending' : 'auth.signingIn')
                : t(mode === 'signup' ? 'auth.createAccount' : mode === 'forgot' ? 'auth.sendLink' : 'common.signIn')
              }
            </button>
          </form>
        )}
      </div>

      <div style={{ marginTop: 24, textAlign: 'center', maxWidth: 340 }}>
        <button
          onClick={() => { track(EVENTS.AUTH_GUIDE_OPENED); setShowGuide(true); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--label3)', marginBottom: 16,
            textDecoration: 'underline', textDecorationColor: 'var(--label4)',
            textUnderlineOffset: 3,
          }}
        >
          {t('auth.howItWorks')}
        </button>
        <p style={{ fontSize: 12, color: 'var(--label4)', lineHeight: 1.6 }}>
          {t('auth.wantToVote')}{' '}
          <span style={{ color: 'var(--label3)' }}>
            {t('auth.useCaptainLink')}
          </span>
        </p>
        <p style={{ marginTop: 12, fontSize: 11, color: 'var(--label4)' }}>
          {t('auth.acceptPrefix')}{' '}
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--label3)', textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            {t('common.terms')}
          </a>
          {' '}{t('quickStart.acceptAnd')}{' '}
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--label3)', textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            {t('quickStart.privacyPolicy')}
          </a>.
        </p>
      </div>

      <LanguagePicker compact />

      {showGuide && <OnboardingModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
