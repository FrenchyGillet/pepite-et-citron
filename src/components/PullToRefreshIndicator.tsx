/**
 * PullToRefreshIndicator
 *
 * Indicateur visuel du geste pull-to-refresh.
 * Apparaît sous le header et suit le doigt jusqu'au threshold,
 * puis tourne en spinner pendant le refresh.
 */
import React from 'react';
import { PTR_THRESHOLD } from '@/hooks/usePullToRefresh';

interface Props {
  pullY:        number;
  isRefreshing: boolean;
}

export function PullToRefreshIndicator({ pullY, isRefreshing }: Props) {
  if (pullY === 0 && !isRefreshing) return null;

  // progress 0→1 pendant le pull, 1 pendant le refresh
  const progress = isRefreshing ? 1 : Math.min(pullY / PTR_THRESHOLD, 1);
  // hauteur de l'indicateur suit le doigt (avec un peu de marge)
  const translateY = isRefreshing ? 0 : pullY - PTR_THRESHOLD;

  // Rotation de la flèche : 0° en bas de page, 180° au threshold (ready)
  const arrowRotation = progress * 180;

  return (
    <div
      aria-hidden
      style={{
        position:   'fixed',
        top:        0,
        left:       '50%',
        transform:  `translateX(-50%) translateY(${translateY}px)`,
        zIndex:     9998,
        width:      40,
        height:     40,
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        // Pas de transition pendant le pull (suit le doigt) ; snap-back animé à la fin
        transition: pullY === 0 ? 'transform 0.3s ease' : 'none',
      }}
    >
      <div style={{
        width:        36,
        height:       36,
        borderRadius: '50%',
        background:   'var(--bg2)',
        border:       '1px solid var(--separator2)',
        boxShadow:    '0 2px 12px rgba(0,0,0,0.4)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        opacity:      Math.max(progress * 1.5, 0.3), // fade-in progressif
        transition:   'opacity 0.1s',
      }}>
        {isRefreshing ? (
          /* Spinner tournant pendant le refresh */
          <svg
            width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="var(--gold)" strokeWidth="2.5"
            strokeLinecap="round"
            style={{ animation: 'spin 0.7s linear infinite' }}
          >
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        ) : (
          /* Flèche qui pointe vers le bas, tourne à 180° quand prêt */
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill="none"
            stroke={progress >= 1 ? 'var(--gold)' : 'var(--label3)'}
            strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{
              transform:  `rotate(${arrowRotation}deg)`,
              transition: 'stroke 0.15s, transform 0.1s',
            }}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        )}
      </div>
    </div>
  );
}
