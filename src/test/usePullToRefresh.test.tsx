import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePullToRefresh, PTR_THRESHOLD } from '@/hooks/usePullToRefresh';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Dispatch a fabricated touch event on <body> (listeners live on `document`). */
function fireTouch(type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel', clientY = 0) {
  const evt = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(evt, 'touches', { value: [{ clientY }], configurable: true });
  act(() => { document.body.dispatchEvent(evt); });
}

/** Simulate a full pull-down gesture that ends past `endY` pixels from the start. */
function pull(endY: number) {
  fireTouch('touchstart', 0);
  fireTouch('touchmove', endY);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePullToRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // usePullToRefresh only engages at scrollY ≈ 0 — jsdom defaults there.
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs onRefresh and clears isRefreshing when the pull passes the threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));

    pull(PTR_THRESHOLD + 40);
    fireTouch('touchend');

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(result.current.isRefreshing).toBe(true);

    await act(async () => { await Promise.resolve(); });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.pullY).toBe(0);
  });

  it('never stays stuck: a hanging onRefresh is bounded by the timeout', async () => {
    const onRefresh = vi.fn().mockImplementation(() => new Promise<void>(() => {})); // jamais résolue
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));

    pull(PTR_THRESHOLD + 40);
    fireTouch('touchend');
    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(7_000);
      await Promise.resolve();
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.pullY).toBe(0);
  });

  it('a rejected onRefresh does not leave the UI blocked', async () => {
    const onRefresh = vi.fn().mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));

    pull(PTR_THRESHOLD + 40);
    fireTouch('touchend');

    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.pullY).toBe(0);
  });

  it('touchcancel resets the indicator (iOS emits it instead of touchend)', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));

    pull(PTR_THRESHOLD - 20); // en-dessous du seuil : simple snap-back attendu
    expect(result.current.pullY).toBeGreaterThan(0);

    fireTouch('touchcancel');

    expect(result.current.pullY).toBe(0);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, disabled: true }));

    pull(PTR_THRESHOLD + 40);
    fireTouch('touchend');

    expect(onRefresh).not.toHaveBeenCalled();
    expect(result.current.pullY).toBe(0);
  });
});
