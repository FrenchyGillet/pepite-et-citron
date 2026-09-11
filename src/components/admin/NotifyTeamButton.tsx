import { useState } from 'react';

// ── Notify team button ────────────────────────────────────────────────────────
export function NotifyTeamButton({
  voteUrl,
  matchLabel,
  onFallback,
}: {
  voteUrl: string;
  matchLabel: string;
  onFallback: () => void;
}) {
  const [sent, setSent] = useState(false);

  const handleNotify = async () => {
    const text = `🗳️ Vote ouvert — ${matchLabel}\nVotez maintenant : ${voteUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      } catch {
        // user cancelled
      }
    } else {
      onFallback();
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }
  };

  return (
    <button
      onClick={() => void handleNotify()}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: sent
          ? 'rgba(48,209,88,0.12)'
          : 'linear-gradient(135deg, rgba(255,214,10,0.12) 0%, rgba(255,214,10,0.06) 100%)',
        border: `1px solid ${sent ? 'var(--green)' : 'var(--gold-dim)'}`,
        borderRadius: 'var(--radius)',
        padding: '13px 20px',
        fontSize: 15, fontWeight: 700,
        color: sent ? 'var(--green)' : 'var(--gold)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ fontSize: 18 }}>{sent ? '✅' : '📣'}</span>
      {sent ? 'Envoyé !' : 'Prévenir l\'équipe'}
    </button>
  );
}
