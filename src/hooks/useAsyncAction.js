import { useState, useCallback } from 'react';

/**
 * Hook pour encapsuler n'importe quelle action async avec état loading/error.
 *
 * const { loading, error, run } = useAsyncAction();
 * await run(() => api.createMatch(...));   // loading passe à true, puis false
 *
 * Options :
 *   onError(err)  — callback en cas d'erreur (ex : afficher un toast)
 *   onSuccess(result) — callback en cas de succès
 */
export function useAsyncAction({ onError, onSuccess } = {}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const run = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      onSuccess?.(result);
      return result;
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
      onError?.(err);
      throw err;           // re-throw pour que l'appelant puisse réagir si besoin
    } finally {
      setLoading(false);
    }
  }, [onError, onSuccess]);

  return { loading, error, run, clearError: () => setError(null) };
}
