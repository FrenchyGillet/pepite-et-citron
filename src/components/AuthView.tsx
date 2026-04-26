import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/api';
import { loginSchema, signupSchema, type AuthFormValues } from '@/schemas';
import { OnboardingModal } from '@/components/OnboardingModal';
import type { UserSession } from '@/types';

interface AuthViewProps {
  onAuth: (session: UserSession) => void;
}

type AuthMode = 'login' | 'signup';

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 4 }}>{msg}</p> : null;

export function AuthView({ onAuth }: AuthViewProps) {
  const [mode,      setMode]      = useState<AuthMode>('login');
  const [apiError,  setApiError]  = useState<string | null>(null);
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
    reset();
    clearErrors();
  };

  const onSubmit = handleSubmit(async (data) => {
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
      if (session) onAuth(session);
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
        {/* Mode toggle */}
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
              ? (mode === 'signup' ? 'Création…' : 'Connexion…')
              : (mode === 'signup' ? 'Créer mon compte' : 'Se connecter')
            }
          </button>
        </form>
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
      </div>

      {showGuide && <OnboardingModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
