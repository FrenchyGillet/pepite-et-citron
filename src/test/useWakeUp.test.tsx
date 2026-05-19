import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWakeUp } from '@/hooks/useWakeUp';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

/** Simulate backgrounding the app for `ms` milliseconds then returning. */
function simulateBackground(ms: number) {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  vi.advanceTimersByTime(ms);
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useWakeUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset visibility to 'visible' before each test
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('invalidates all queries when app returns after the threshold (3 s default)', () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);

    renderHook(() => useWakeUp(), { wrapper: makeWrapper(qc) });

    simulateBackground(4_000); // 4 s > 3 s threshold

    expect(invalidateSpy).toHaveBeenCalledOnce();
  });

  it('does NOT invalidate queries when app returns within the threshold', () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);

    renderHook(() => useWakeUp(), { wrapper: makeWrapper(qc) });

    simulateBackground(1_000); // 1 s < 3 s threshold

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('respects a custom minHiddenMs threshold', () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);

    renderHook(() => useWakeUp(10_000), { wrapper: makeWrapper(qc) });

    simulateBackground(6_000); // 6 s < 10 s custom threshold
    expect(invalidateSpy).not.toHaveBeenCalled();

    simulateBackground(11_000); // 11 s > 10 s custom threshold
    expect(invalidateSpy).toHaveBeenCalledOnce();
  });

  it('invalidates again on each subsequent wake-up that exceeds the threshold', () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);

    renderHook(() => useWakeUp(), { wrapper: makeWrapper(qc) });

    simulateBackground(4_000);
    simulateBackground(4_000);

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it('does not invalidate on first render (no background event yet)', () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);

    renderHook(() => useWakeUp(), { wrapper: makeWrapper(qc) });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('removes the event listener when the hook unmounts', () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);

    const { unmount } = renderHook(() => useWakeUp(), { wrapper: makeWrapper(qc) });

    unmount();

    // Event fired after unmount — listener should be gone
    simulateBackground(4_000);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
