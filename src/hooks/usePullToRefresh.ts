/**
 * usePullToRefresh — détecte le geste "tirer vers le bas" en haut de page.
 *
 * Retourne :
 *  - pullY        : pixels tirés (0 → THRESHOLD), pour animer l'indicateur
 *  - isRefreshing : true pendant l'exécution du callback onRefresh
 *
 * Ne se déclenche que quand la page est déjà scrollée tout en haut (scrollY = 0).
 * Désactivé quand isRefreshing est déjà true (évite les doubles déclenchements).
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export const PTR_THRESHOLD = 72; // px à tirer pour déclencher le refresh
const PTR_MAX      = 110; // élasticity cap (le pull s'arrête ici visuellement)
const PTR_DAMPING  = 0.45; // résistance progressive (rubber-band feeling)

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export function usePullToRefresh({ onRefresh, disabled = false }: UsePullToRefreshOptions) {
  const [pullY,        setPullY]        = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY      = useRef(0);
  const pulling     = useRef(false);
  const refreshing  = useRef(false); // ref mirror pour les event handlers

  const triggerRefresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setIsRefreshing(true);
    setPullY(PTR_THRESHOLD); // freeze l'indicateur à sa position de déclenchement
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      refreshing.current = false;
      setPullY(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing.current) return;
      // Seulement si on est tout en haut de la page
      if (window.scrollY > 2) return;
      startY.current = e.touches[0].clientY;
      pulling.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshing.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { pulling.current = false; setPullY(0); return; }

      // Ignore si on scroll un container scrollable autre que le body
      const target = e.target as Element;
      const scrollable = target.closest('[data-no-ptr]') ||
        target.closest('textarea') ||
        target.closest('[contenteditable]');
      if (scrollable) return;

      pulling.current = true;

      // Rubber-band : résistance progressive au-delà du threshold
      const damped = dy < PTR_THRESHOLD
        ? dy
        : PTR_THRESHOLD + (dy - PTR_THRESHOLD) * PTR_DAMPING;

      setPullY(Math.min(damped, PTR_MAX));

      // Empêcher le scroll natif pendant le pull
      if (dy > 4) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pulling.current || refreshing.current) { setPullY(0); return; }
      pulling.current = false;

      setPullY(prev => {
        if (prev >= PTR_THRESHOLD) {
          void triggerRefresh();
          return prev; // triggerRefresh gère la valeur finale
        }
        return 0; // pas assez tiré → snap back
      });
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove',  onTouchMove,  { passive: false });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, [disabled, triggerRefresh]);

  return { pullY, isRefreshing };
}
