import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/api';
import { orgSetupSchema, type OrgSetupFormValues } from '@/schemas';
import { humanizeError } from '@/utils/errors';
import { track, EVENTS } from '@/utils/analytics';
import type { Org } from '@/types';

interface OrgCreateFormProps {
  onOrgCreated: (org: Org) => void;
  submitLabel?: string;
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{msg}</p> : null;

/** The actual name/slug form — embeddable on its own (ProfileView) or inside
 *  the full-screen OrgSetupView (first-time onboarding). */
export function OrgCreateForm({ onOrgCreated, submitLabel = "Créer l'équipe →" }: OrgCreateFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrgSetupFormValues>({
    resolver: zodResolver(orgSetupSchema),
    defaultValues: { name: '', slug: '' },
  });

  // Auto-derive slug from name unless the user has manually edited it
  const name = watch('name');
  const slug = watch('slug');

  useEffect(() => {
    // Only auto-fill when the slug still matches what toSlug(name) would produce
    // (i.e. the user hasn't manually diverged it)
    const derived = toSlug(name ?? '');
    if (slug === '' || slug === toSlug(name?.slice(0, -1) ?? '')) {
      setValue('slug', derived, { shouldValidate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const org = await api.createOrg(data.name.trim(), data.slug.trim());
      track(EVENTS.ORG_CREATED);
      onOrgCreated(org);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setError('name', { message: 'Ce nom d\'équipe est déjà utilisé. Essayez un autre nom.' });
      } else {
        setError('root', { message: humanizeError(err, "Impossible de créer l'équipe. Réessaie.") });
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label htmlFor="org-create-name" style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
          Nom de l'équipe
        </label>
        <input
          id="org-create-name"
          placeholder="ex : HC Montréal Rive-Sud"
          style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.name ? 'var(--red)' : undefined }}
          {...register('name')}
        />
        <FieldError msg={errors.name?.message} />
      </div>

      {/* Slug is auto-generated from name — hidden from user */}
      <input type="hidden" {...register('slug')} />

      {slug && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg3)', borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
        }}>
          <span style={{ fontSize: 16 }}>🔗</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--label3)', marginBottom: 2 }}>
              Lien de vote de votre équipe
            </div>
            <div style={{ fontSize: 12, color: 'var(--label2)', wordBreak: 'break-all' }}>
              {window.location.origin}/vote?org=<strong>{slug}</strong>
            </div>
          </div>
        </div>
      )}

      {errors.root && (
        <div style={{
          background: 'rgba(255,80,80,.12)', border: '1px solid rgba(255,80,80,.3)',
          borderRadius: 'var(--radius-sm)', padding: '10px 12px',
          fontSize: 13, color: 'var(--red)',
        }}>
          {errors.root.message}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Création…' : submitLabel}
      </button>
    </form>
  );
}

interface OrgSetupViewProps {
  onOrgCreated: (org: Org) => void;
  userEmail?: string;
  /** Back to the previous screen (shown when creating the team was optional). */
  onBack?: () => void;
}

/** Full-screen wrapper used for first-time onboarding (no org yet at all). */
export function OrgSetupView({ onOrgCreated, userEmail, onBack }: OrgSetupViewProps) {
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

      <div style={{ width: '100%', maxWidth: 400, background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--label)', marginBottom: 6 }}>
            Créez votre équipe 🎉
          </div>
          <div style={{ fontSize: 13, color: 'var(--label3)' }}>
            Bienvenue {userEmail} — configurez votre espace en 30 secondes.
          </div>
        </div>

        <OrgCreateForm onOrgCreated={onOrgCreated} />
      </div>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            marginTop: 16, background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--label3)', textDecoration: 'underline',
          }}
        >
          ← Retour
        </button>
      )}
    </div>
  );
}
