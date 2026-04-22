import { useState, useCallback } from 'react';

interface UseAsyncActionOptions<T> {
  onError?: (err: Error) => void;
  onSuccess?: (result: T) => void;
}

interface UseAsyncActionReturn<T> {
  loading: boolean;
  error: string | null;
  run: (fn: () => Promise<T>) => Promise<T>;
  clearError: () => void;
}

export function useAsyncAction<T = unknown>({ onError, onSuccess }: UseAsyncActionOptions<T> = {}): UseAsyncActionReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      onSuccess?.(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      onError?.(err instanceof Error ? err : new Error(message));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onError, onSuccess]);

  return { loading, error, run, clearError: () => setError(null) };
}
