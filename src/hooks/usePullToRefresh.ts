/**
 * usePullToRefresh — détecte le geste "tirer vers le bas" en haut de page.
 *
 * Retourne :
 *  - pullY        : pixels tirés (0 → THRESHOLD), pour animer l'indicateur
 *  - isRefreshing : true pendant l'exécution du callback onRefresh
 *
 * Ne se déclenche que quand la page est déjà scrollée tout en haut (scrollY ≈ 0).
 * Désactivé quand isRefreshing est déjà true.
 *
 * Garanties anti-blocage :
 *  - `triggerRefresh` borne l'attente à PTR_TIMEOUT et avale les erreurs : le
 *    spinner se termine toujours, même si le réseau ne revient jamais.
 *  - `touchcancel` (émis par iOS au lieu de `touchend` sur multi-touch /
 *    interruption système) est traité comme `touchend`.
 *  - le déclenchement du refresh se fait hors de tout updater `setState`.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export const PTR_THRESHOLD = 72; // px à tirer pour déclencher le refresh
const PTR_MAX     = 110;         // cap élastique
const PTR_DAMPING = 0.45;        // résistance rubber-band au-delà du threshold
const PTR_TIMEOUT = 7_000;       // plafond dur : le geste se termine toujours

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
  const pullYRef    = useRef(0);     // mirror de pullY, lisible dans les handlers sans effet de bord

  // setPull garde pullYRef synchronisé avec le state
  const setPull = useCallback((v: number) => {
    pullYRef.current = v;
    setPullY(v);
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setIsRefreshing(true);
    setPull(PTR_THRESHOLD);
    try {
      // Plafond dur : le refetch continue en arrière-plan, on cesse juste
      // d'attendre visuellement si le réseau ne répond pas.
      await Promise.race([
        onRefresh(),
        new Promise<void>(res => setTimeout(res, PTR_TIMEOUT)),
      ]);
    } catch {
      // Refresh best-effort : une erreur ne doit pas laisser l'UI bloquée.
    } finally {
      refreshing.current = false;
      setIsRefreshing(false);
      setPull(0);
    }
  }, [onRefresh, setPull]);

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
        setPull(0);
        return;
      }

      // Ignore les containers scrollables internes (textarea, modals, etc.)
      const scrollable = (e.target as Element).closest(
        '[data-no-ptr], textarea, [contenteditable]',
      );
      if (scrollable) {
        canPull.current = false;
        setPull(0);
        return;
      }

      pulling.current = true;

      // Résistance rubber-band au-delà du seuil
      const damped = dy < PTR_THRESHOLD
        ? dy
        : PTR_THRESHOLD + (dy - PTR_THRESHOLD) * PTR_DAMPING;
      setPull(Math.min(damped, PTR_MAX));

      // Empêche le scroll natif UNIQUEMENT quand on est en train de tirer
      e.preventDefault();
    };

    // touchend ET touchcancel : iOS émet touchcancel au lieu de touchend lors
    // d'un multi-touch, d'une reprise de geste par le système ou d'une
    // interruption (appel, Control Center).
    const endGesture = () => {
      const reached =
        pulling.current && !refreshing.current && pullYRef.current >= PTR_THRESHOLD;

      canPull.current = false;
      pulling.current = false;

      // Déclenchement hors de tout updater setState → pas de double-invoke
      // StrictMode, pas d'updater impur.
      if (reached) void triggerRefresh();
      else setPull(0);
    };

    document.addEventListener('touchstart',  onTouchStart, { passive: true  });
    document.addEventListener('touchmove',   onTouchMove,  { passive: false }); // passive:false requis pour e.preventDefault()
    document.addEventListener('touchend',    endGesture,   { passive: true  });
    document.addEventListener('touchcancel', endGesture,   { passive: true  });

    return () => {
      document.removeEventListener('touchstart',  onTouchStart);
      document.removeEventListener('touchmove',   onTouchMove);
      document.removeEventListener('touchend',    endGesture);
      document.removeEventListener('touchcancel', endGesture);
    };
  }, [disabled, triggerRefresh, setPull]);

  return { pullY, isRefreshing };
}
