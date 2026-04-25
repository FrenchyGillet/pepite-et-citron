import { useState } from 'react';
import { api } from '@/api';
import type { Org } from '@/types';

interface OrgSetupViewProps {
  onOrgCreated: (org: Org) => void;
  userEmail?: string;
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function OrgSetupView({ onOrgCreated, userEmail }: OrgSetupViewProps) {
  const [name,        setName]        = useState('');
  const [slug,        setSlug]        = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [slugEdited,  setSlugEdited]  = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(toSlug(val));
  };

  const handleSlugChange = (val: string) => {
    setSlug(toSlug(val));
    setSlugEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const org = await api.createOrg(name.trim(), slug.trim());
      onOrgCreated(org);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setError('Ce slug est déjà pris. Choisissez-en un autre.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
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

      <div style={{ width: '100%', maxWidth: 400, background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--label)', marginBottom: 6 }}>
            Créez votre équipe 🎉
          </div>
          <div style={{ fontSize: 13, color: 'var(--label3)' }}>
            Bienvenue {userEmail} — configurez votre espace en 30 secondes.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
              Nom de l'équipe
            </label>
            <input
              value={name} onChange={e => handleNameChange(e.target.value)}
              placeholder="ex : HC Montréal Rive-Sud"
              required maxLength={60}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6 }}>
              Identifiant unique <span style={{ fontWeight: 400, color: 'var(--label4)' }}>(dans l'URL de vote)</span>
            </label>
            <input
              value={slug} onChange={e => handleSlugChange(e.target.value)}
              placeholder="hc-montreal" required maxLength={40}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            {slug && (
              <p style={{ fontSize: 11, color: 'var(--label4)', marginTop: 6 }}>
                Lien de vote : <span style={{ color: 'var(--label3)' }}>{window.location.origin}/?org={slug}</span>
              </p>
            )}
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

          <button type="submit" className="btn btn-primary" disabled={loading || !name.trim() || !slug.trim()}>
            {loading ? 'Création…' : "Créer l'équipe →"}
          </button>
        </form>
      </div>
    </div>
  );
}
