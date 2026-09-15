import { afterEach, describe, expect, it, vi } from 'vitest';
import { EVENTS, identify, track } from '@/utils/analytics';

describe('analytics', () => {
  afterEach(() => {
    delete window.umami;
  });

  it('is a no-op when the Umami script is absent', () => {
    expect(() => track(EVENTS.VOTE_COMPLETED)).not.toThrow();
    expect(() => identify({ plan: 'pro' })).not.toThrow();
  });

  it('forwards events and session data to Umami', () => {
    const umami = { track: vi.fn(), identify: vi.fn() };
    window.umami = umami;

    track(EVENTS.MATCH_CREATED, { playerCount: 12 });
    identify({ audience: 'admin', plan: 'free' });

    expect(umami.track).toHaveBeenCalledWith('match_created', { playerCount: 12 });
    expect(umami.identify).toHaveBeenCalledWith({ audience: 'admin', plan: 'free' });
  });

  it('never lets a tracker failure reach the app', () => {
    window.umami = {
      track:    () => { throw new Error('blocked'); },
      identify: () => { throw new Error('blocked'); },
    };
    expect(() => track(EVENTS.PODIUM_SHARED)).not.toThrow();
    expect(() => identify({ plan: 'pro' })).not.toThrow();
  });

  it('keeps event names within Umami limits and unique', () => {
    const names = Object.values(EVENTS);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z_]{1,50}$/);
  });
});
