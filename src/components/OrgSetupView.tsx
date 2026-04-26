import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/api';
import { orgSetupSchema, type OrgSetupFormValues } from '@/schemas';
import type { Org } from '@/types';

interface OrgSetupViewProps {
  onOrgCreated: (org: Org) => void;
  userEmail?: string;
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
  msg ? <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 4 }}>{msg}</p> : null;

export function OrgSetupView({ onOrgCreated, userEmail }: OrgSetupViewProps) {
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
      onOrgCreated(org);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setError('slug', { message: 'Cet identifiant est déjà pris. Choisissez-en un autre.' });
      } else {
        setError('root', { message: msg });
      }
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

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
              Nom de l'équipe
            </label>
            <input
              placeholder="ex : HC Montréal Rive-Sud"
              style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.name ? '#ff6b6b' : undefined }}
              {...register('name')}
            />
            <FieldError msg={errors.name?.message} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
              Identifiant unique{' '}
              <span style={{ fontWeight: 400, color: 'var(--label4)' }}>(dans l'URL de vote)</span>
            </label>
            <input
              placeholder="hc-montreal"
              style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.slug ? '#ff6b6b' : undefined }}
              {...register('slug', {
                onChange: e => {
                  // Keep only valid slug chars as the user types
                  e.target.value = toSlug(e.target.value);
                },
              })}
            />
            {slug && !errors.slug && (
              <p style={{ fontSize: 11, color: 'var(--label4)', marginTop: 6 }}>
                Lien de vote :{' '}
                <span style={{ color: 'var(--label3)' }}>{window.location.origin}/?org={slug}</span>
              </p>
            )}
            <FieldError msg={errors.slug?.message} />
          </div>

          {errors.root && (
            <div style={{
              background: 'rgba(255,80,80,.12)', border: '1px solid rgba(255,80,80,.3)',
              borderRadius: 'var(--radius-sm)', padding: '10px 12px',
              fontSize: 13, color: '#ff6b6b',
            }}>
              {errors.root.message}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Création…' : "Créer l'équipe →"}
          </button>
        </form>
      </div>
    </div>
  );
}
