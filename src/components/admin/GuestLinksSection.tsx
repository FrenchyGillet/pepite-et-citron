import { useState } from 'react';
import { guestNameSchema } from '@/schemas';
import { track, EVENTS } from '@/utils/analytics';
import { copyToClipboard } from '@/utils/clipboard';
import { humanizeError } from '@/utils/errors';
import { useGuestTokens } from '@/hooks/queries';
import { useCreateGuestToken, useDeleteGuestToken } from '@/hooks/mutations';
import type { EntityId, GuestToken } from '@/types';
import type { ConfirmFn, Notify } from './shared';

/** Single-use invite links for supporters, during the voting phase. */
export function GuestLinksSection({ matchId, notify, confirm }: { matchId: EntityId; notify: Notify; confirm: ConfirmFn }) {
  const [guestInput,  setGuestInput]  = useState('');
  const [guestError,  setGuestError]  = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: guestTokens = [] } = useGuestTokens(matchId);
  const createGuestTokenMutation = useCreateGuestToken(matchId);
  const deleteGuestTokenMutation = useDeleteGuestToken(matchId);

  const createGuestLink = () => {
    const result = guestNameSchema.safeParse({ name: guestInput });
    if (!result.success) { setGuestError(result.error.issues[0].message); return; }
    setGuestError(null);
    const { name } = result.data;
    createGuestTokenMutation.mutate({ name, id: matchId }, {
      onSuccess: () => { setGuestInput(''); notify(`Lien créé pour ${name}`); },
    });
  };

  const copyGuestLink = async (token: string) => {
    await copyToClipboard(`${window.location.origin}/vote?guest=${token}`);
    track(EVENTS.GUEST_LINK_COPIED);
    setCopiedToken(token);
    notify('Lien copié !');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const revokeGuest = async (gt: GuestToken) => {
    if (!(await confirm({
      message: gt.used
        ? `Retirer ${gt.name} de la liste ? Son vote reste compté.`
        : `Révoquer le lien de ${gt.name} ? Il ne pourra plus voter avec ce lien.`,
      confirmLabel: gt.used ? 'Retirer' : 'Révoquer', danger: true,
    }))) return;
    deleteGuestTokenMutation.mutate(gt.id, { onError: (err) => notify(humanizeError(err)) });
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 15 }}>🔗</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--label)' }}>Supporters invités</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 12 }}>
        Crée un lien unique par invité pour qu'il puisse voter depuis son téléphone.
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
                    {gt.used ? '✓ A voté' : 'En attente'}
                  </div>
                </div>
                {!gt.used && (
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13, whiteSpace: 'nowrap' }}
                    onClick={() => void copyGuestLink(gt.token)}>
                    {copiedToken === gt.token ? 'Copié !' : 'Copier le lien'}
                  </button>
                )}
                <button onClick={() => void revokeGuest(gt)}
                  aria-label={`Révoquer le lien de ${gt.name}`} title="Révoquer le lien"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--label4)', padding: '4px 8px' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-8" style={{ marginBottom: guestError ? 4 : 0 }}>
        <input aria-label="Prénom du supporter" placeholder="Prénom du supporter" value={guestInput}
          onChange={e => { setGuestInput(e.target.value); setGuestError(null); }}
          onKeyDown={e => e.key === 'Enter' && createGuestLink()}
          style={{ borderColor: guestError ? 'var(--red)' : undefined }} />
        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '12px 16px' }}
          onClick={createGuestLink}>Créer</button>
      </div>
      {guestError && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{guestError}</p>}
    </div>
  );
}
