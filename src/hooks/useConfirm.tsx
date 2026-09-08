import { useCallback, useState } from 'react';
import { useModalA11y } from '@/hooks/useModalA11y';

/**
 * Promise-based confirmation modal — replaces window.confirm(), which is
 * unreliable in iOS PWA standalone mode (the native dialog may not appear).
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   ...
 *   if (!(await confirm({ message: 'Supprimer ?', danger: true }))) return;
 *   ...
 *   return (<>{confirmDialog}{...}</>);
 */
interface ConfirmOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ ...opts, resolve })),
    [],
  );

  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const confirmDialog = pending ? (
    <ConfirmModal
      {...pending}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, confirmDialog };
}

function ConfirmModal({
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  const dialogRef = useModalA11y(onCancel);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        style={{
          background: 'var(--bg2)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--separator)', padding: '20px 20px 16px',
          width: '100%', maxWidth: 360,
        }}
      >
        <p style={{ fontSize: 15, color: 'var(--label)', lineHeight: 1.5, marginBottom: 18 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            style={{ flex: 1 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
