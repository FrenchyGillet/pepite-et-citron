import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/api';
import { loginSchema, signupSchema, type AuthFormValues } from '@/schemas';
import { OnboardingModal } from '@/components/OnboardingModal';
import { track, EVENTS } from '@/utils/analytics';
import type { UserSession } from '@/types';

interface AuthViewProps {
  onAuth: (session: UserSession) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 4 }}>{msg}</p> : null;

export function AuthView({ onAuth }: AuthViewProps) {
  const [mode,      setMode]      = useState<AuthMode>('login');
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

  const switchMode = (next: AuthMode) => {
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
        setResetSent(true);
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'Une erreur est survenue');
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
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Une erreur est survenue');
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
          Votre app de vote pour le match
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: 24 }}>

        {mode !== 'forgot' && (
          /* Mode toggle — login / signup */
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
            {([{ id: 'login', label: 'Se connecter' }, { id: 'signup', label: 'Créer un compte' }] as const).map(t => (
              <button key={t.id} onClick={() => switchMode(t.id)} style={{
                flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: mode === t.id ? 'var(--bg)' : 'transparent',
                color: mode === t.id ? 'var(--label)' : 'var(--label3)',
                boxShadow: mode === t.id ? '0 1px 3px rgba(0,0,0,.3)' : 'none',
              }}>{t.label}</button>
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
              Retour
            </button>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--label)', marginBottom: 4 }}>
              Mot de passe oublié
            </div>
            <div style={{ fontSize: 13, color: 'var(--label3)', lineHeight: 1.5 }}>
              Saisis ton adresse email. Tu recevras un lien pour créer un nouveau mot de passe.
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
              Email envoyé !
            </div>
            <div style={{ fontSize: 13, color: 'var(--label3)', lineHeight: 1.5 }}>
              Vérifie ta boîte mail et clique sur le lien pour réinitialiser ton mot de passe.
            </div>
            <button
              onClick={() => switchMode('login')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--label3)', marginTop: 16,
                textDecoration: 'underline', textDecorationColor: 'var(--label4)',
              }}
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
                Adresse email
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.email ? '#ff6b6b' : undefined }}
                {...register('email')}
              />
              <FieldError msg={errors.email?.message} />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
                  Mot de passe
                </label>
                <input
                  type="password"
                  placeholder={mode === 'signup' ? '8 caractères minimum' : 'Votre mot de passe'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.password ? '#ff6b6b' : undefined }}
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
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            {apiError && (
              <div style={{
                background: 'rgba(255,80,80,.12)', border: '1px solid rgba(255,80,80,.3)',
                borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                fontSize: 13, color: '#ff6b6b',
              }}>
                {apiError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ marginTop: 4 }}>
              {isSubmitting
                ? (mode === 'signup' ? 'Création…' : mode === 'forgot' ? 'Envoi…' : 'Connexion…')
                : (mode === 'signup' ? 'Créer mon compte' : mode === 'forgot' ? 'Envoyer le lien' : 'Se connecter')
              }
            </button>
          </form>
        )}
      </div>

      <div style={{ marginTop: 24, textAlign: 'center', maxWidth: 340 }}>
        <button
          onClick={() => setShowGuide(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--label3)', marginBottom: 16,
            textDecoration: 'underline', textDecorationColor: 'var(--label4)',
            textUnderlineOffset: 3,
          }}
        >
          📖 Comment ça marche ?
        </button>
        <p style={{ fontSize: 12, color: 'var(--label4)', lineHeight: 1.6 }}>
          Vous souhaitez voter ?{' '}
          <span style={{ color: 'var(--label3)' }}>
            Utilisez le lien partagé par votre capitaine.
          </span>
        </p>
        <p style={{ marginTop: 12, fontSize: 11, color: 'var(--label4)' }}>
          En créant un compte, vous acceptez notre{' '}
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--label3)', textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            politique de confidentialité
          </a>.
        </p>
      </div>

      {showGuide && <OnboardingModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
