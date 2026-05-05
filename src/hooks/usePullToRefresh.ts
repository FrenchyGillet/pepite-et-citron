/**
 * usePullToRefresh — détecte le geste "tirer vers le bas" en haut de page.
 *
 * Retourne :
 *  - pullY        : pixels tirés (0 → THRESHOLD), pour animer l'indicateur
 *  - isRefreshing : true pendant l'exécution du callback onRefresh
 *
 * Ne se déclenche que quand la page est déjà scrollée tout en haut (scrollY ≈ 0).
 * Désactivé quand isRefreshing est déjà true.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export const PTR_THRESHOLD = 72; // px à tirer pour déclencher le refresh
const PTR_MAX     = 110;         // cap élastique
const PTR_DAMPING = 0.45;        // résistance rubber-band au-delà du threshold

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export function usePullToRefresh({ onRefresh, disabled = false }: UsePullToRefreshOptions) {
  const [pullY,        setPullY]        = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs partagées entre les event handlers (pas de re-render)
  const startY      = useRef(0);
  const canPull     = useRef(false); // true UNIQUEMENT si touchstart a eu lieu à scrollY ≈ 0
  const pulling     = useRef(false); // true dès qu'on a commencé à tirer vers le bas
  const refreshing  = useRef(false); // mirror de isRefreshing pour les handlers

  const triggerRefresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setIsRefreshing(true);
    setPullY(PTR_THRESHOLD);
    try {
      await onRefresh();
    } finally {
      refreshing.current = false;
      setIsRefreshing(false);
      setPullY(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      // Réinitialise TOUJOURS le flag — évite les résidus d'un geste précédent
      canPull.current  = false;
      pulling.current  = false;

      if (refreshing.current) return;
      if (window.scrollY > 2) return;

      canPull.current  = true;
      startY.current   = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      // Ignore tout geste qui n'a pas commencé en haut de page
      if (!canPull.current || refreshing.current) return;

      const dy = e.touches[0].clientY - startY.current;

      // Scroll vers le haut ou neutre → rien
      if (dy <= 0) {
        pulling.current = false;
        setPullY(0);
        return;
      }

      // Ignore les containers scrollables internes (textarea, modals, etc.)
      const scrollable = (e.target as Element).closest(
        '[data-no-ptr], textarea, [contenteditable]',
      );
      if (scrollable) {
        canPull.current = false;
        setPullY(0);
        return;
      }

      pulling.current = true;

      // Résistance rubber-band au-delà du seuil
      const damped = dy < PTR_THRESHOLD
        ? dy
        : PTR_THRESHOLD + (dy - PTR_THRESHOLD) * PTR_DAMPING;
      setPullY(Math.min(damped, PTR_MAX));

      // Empêche le scroll natif UNIQUEMENT quand on est en train de tirer
      e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pulling.current || refreshing.current) {
        setPullY(0);
        canPull.current = false;
        pulling.current = false;
        return;
      }

      canPull.current = false;
      pulling.current = false;

      // Lecture via callback pour avoir la valeur fraîche sans dépendance
      setPullY(prev => {
        if (prev >= PTR_THRESHOLD) {
          void triggerRefresh();
          return prev; // triggerRefresh positionne à 0 quand fini
        }
        return 0; // snap-back
      });
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true  });
    document.addEventListener('touchmove',  onTouchMove,  { passive: false }); // passive:false requis pour e.preventDefault()
    document.addEventListener('touchend',   onTouchEnd,   { passive: true  });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, [disabled, triggerRefresh]);

  return { pullY, isRefreshing };
}
