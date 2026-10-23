import { useState } from 'react';
import { guestNameSchema } from '@/schemas';
import { track, EVENTS } from '@/utils/analytics';
import { copyToClipboard } from '@/utils/clipboard';
import { humanizeError } from '@/utils/errors';
import { useGuestTokens } from '@/hooks/queries';
import { useCreateGuestToken, useDeleteGuestToken } from '@/hooks/mutations';
import type { EntityId, GuestToken } from '@/types';
import type { ConfirmFn, Notify } from './shared';
import { t } from '@/i18n';

/** Single-use invite links for supporters, during the voting phase. */
export function GuestLinksSection({ orgId, matchId, notify, confirm }: { orgId?: string; matchId: EntityId; notify: Notify; confirm: ConfirmFn }) {
  const [guestInput,  setGuestInput]  = useState('');
  const [guestError,  setGuestError]  = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: guestTokens = [] } = useGuestTokens(matchId);
  const createGuestTokenMutation = useCreateGuestToken(orgId, matchId);
  const deleteGuestTokenMutation = useDeleteGuestToken(matchId);

  const createGuestLink = () => {
    const result = guestNameSchema.safeParse({ name: guestInput });
    if (!result.success) { setGuestError(result.error.issues[0].message); return; }
    setGuestError(null);
    const { name } = result.data;
    createGuestTokenMutation.mutate({ name, id: matchId }, {
      onSuccess: () => { setGuestInput(''); notify(t('guests.created', { name })); },
    });
  };

  const copyGuestLink = async (token: string) => {
    await copyToClipboard(`${window.location.origin}/vote?guest=${token}`);
    track(EVENTS.GUEST_LINK_COPIED);
    setCopiedToken(token);
    notify(t('common.copied'));
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const revokeGuest = async (gt: GuestToken) => {
    if (!(await confirm({
      message: gt.used
        ? t('guests.removeConfirm', { name: gt.name })
        : t('guests.revokeConfirm', { name: gt.name }),
      confirmLabel: t(gt.used ? 'guests.remove' : 'guests.revoke'), danger: true,
    }))) return;
    deleteGuestTokenMutation.mutate(gt.id, { onError: (err) => notify(humanizeError(err)) });
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 15 }}>🔗</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--label)' }}>{t('guests.title')}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 12 }}>
        {t('guests.intro')}
      </p>
      {guestTokens.length > 0 && (
        <div className="group" style={{ marginBottom: 12 }}>
          {guestTokens.map((gt, i) => (
            <div key={String(gt.id)}>
              {i > 0 && <div style={{ height: 1, background: 'var(--separator)', margin: '0 16px' }} />}
              <div className="row">
                <div className="row-body">
                  <div className="row-title" style={{ color: gt.used ? 'var(--label3)' : 'var(--label)' }}>{gt.name}</div>
                  <div className="row-sub" style={{ color: gt.used ? 'var(--green)' : 'var(--label3)' }}>
                    {t(gt.used ? 'guests.voted' : 'guests.waiting')}
                  </div>
                </div>
                {!gt.used && (
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13, whiteSpace: 'nowrap' }}
                    onClick={() => void copyGuestLink(gt.token)}>
                    {t(copiedToken === gt.token ? 'guests.copied' : 'guests.copyLink')}
                  </button>
                )}
                <button onClick={() => void revokeGuest(gt)}
                  aria-label={t('guests.revokeOf', { name: gt.name })} title={t('guests.revokeLink')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--label4)', padding: '4px 8px' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-8" style={{ marginBottom: guestError ? 4 : 0 }}>
        <input aria-label={t('guests.nameLabel')} placeholder={t('guests.nameLabel')} value={guestInput}
          onChange={e => { setGuestInput(e.target.value); setGuestError(null); }}
          onKeyDown={e => e.key === 'Enter' && createGuestLink()}
          style={{ borderColor: guestError ? 'var(--red)' : undefined }} />
        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '12px 16px' }}
          onClick={createGuestLink}>{t('guests.create')}</button>
      </div>
      {guestError && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{guestError}</p>}
    </div>
  );
}
