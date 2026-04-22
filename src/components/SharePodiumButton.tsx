import { useState } from 'react';
import { generatePodiumImage } from '../utils/generatePodiumImage';
import type { Match } from '../types';

interface RankedEntry {
  id: string | number;
  name: string;
  pts: number;
  absent?: boolean;
}

interface SharePodiumButtonProps {
  match: Match;
  pepiteRanked: RankedEntry[];
  lemonRanked: RankedEntry[];
  isDark: boolean;
}

type ShareState = 'idle' | 'generating' | 'done' | 'error';

export function SharePodiumButton({ match, pepiteRanked, lemonRanked, isDark }: SharePodiumButtonProps) {
  const [state, setState] = useState<ShareState>('idle');

  const handleShare = async () => {
    if (state === 'generating') return;
    setState('generating');

    try {
      const matchDate = new Date(match.created_at).toLocaleDateString('fr-BE', {
        day: 'numeric', month: 'short', year: 'numeric',
      });

      const blob = await generatePodiumImage({ matchLabel: match.label, matchDate, pepiteRanked, lemonRanked, isDark });
      const file = new File([blob], `podium-${match.label}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Podium — ${match.label}` });
        setState('done');
        setTimeout(() => setState('idle'), 2500);
        return;
      }

      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `podium-${match.label}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setState('done');
      setTimeout(() => setState('idle'), 2500);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setState('idle');
        return;
      }
      console.error('SharePodiumButton:', err);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const label: Record<ShareState, string> = {
    idle:       'Partager le podium',
    generating: 'Génération…',
    done:       '✓ Image prête',
    error:      'Erreur, réessaie',
  };

  return (
    <button
      onClick={handleShare}
      disabled={state === 'generating'}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '13px 20px',
        background: state === 'done'  ? 'rgba(52,199,89,0.15)'
                  : state === 'error' ? 'rgba(255,59,48,0.12)'
                  : 'var(--bg3)',
        border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600,
        color: state === 'done'  ? '#34C759'
             : state === 'error' ? 'var(--red, #ff3b30)'
             : 'var(--label2)',
        cursor: state === 'generating' ? 'default' : 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {state === 'generating' ? (
        <Spinner />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      )}
      {label[state]}
    </button>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .sp { transform-origin: 12px 12px; animation: spin 0.7s linear infinite; }
      `}</style>
      <g className="sp">
        <path d="M12 2a10 10 0 010 20" opacity="0.25"/>
        <path d="M12 2a10 10 0 0110 10" opacity="1"/>
      </g>
    </svg>
  );
}
