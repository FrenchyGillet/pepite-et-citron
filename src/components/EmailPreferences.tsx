import { useEmailNotifications } from '@/hooks/queries';
import { useSetEmailNotifications } from '@/hooks/mutations';
import { humanizeError } from '@/utils/errors';

/** Profil → "Emails de vote": the member's own preference for this team (F10). */
export function EmailPreferences({ orgId, orgName }: { orgId: string; orgName: string }) {
  const { data: enabled, isLoading, isError } = useEmailNotifications(orgId);
  const setPreference = useSetEmailNotifications(orgId);
  const checked = setPreference.isPending ? !!setPreference.variables : enabled !== false;

  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '12px 16px', marginTop: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--label)' }}>Emails de vote</div>
        <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2, lineHeight: 1.4 }}>
          {isError
            ? 'Impossible de charger ta préférence pour le moment.'
            : `Un email quand un vote est ouvert dans ${orgName}.`}
        </div>
        {setPreference.isError && (
          <div role="alert" style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
            {humanizeError(setPreference.error)}
          </div>
        )}
      </div>
      <input
        type="checkbox"
        role="switch"
        aria-label="Recevoir les emails de vote"
        checked={checked}
        disabled={isLoading || isError || setPreference.isPending}
        onChange={e => setPreference.mutate(e.target.checked)}
        style={{ width: 22, height: 22, accentColor: 'var(--gold-fill)', flexShrink: 0 }}
      />
    </label>
  );
}
