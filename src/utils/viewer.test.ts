import { describe, expect, it } from 'vitest';
import { viewerKey, viewerSeed } from './viewer';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: k => data.get(k) ?? null,
    key: i => [...data.keys()][i] ?? null,
    removeItem: k => { data.delete(k); },
    setItem: (k, v) => { data.set(k, v); },
  };
}

describe('viewerKey', () => {
  it('keeps one key per device, a different one on another device', () => {
    const phone = memoryStorage();
    const other = memoryStorage();
    expect(viewerKey(phone)).toBe(viewerKey(phone));
    expect(viewerKey(phone)).not.toBe(viewerKey(other));
  });

  it('still gives a stable key without storage', () => {
    const broken = { getItem: () => { throw new Error('blocked'); } } as unknown as Storage;
    expect(viewerKey(broken)).toBe(viewerKey(broken));
  });
});

describe('viewerSeed', () => {
  it('adds the device to the seed', () => {
    const phone = memoryStorage();
    expect(viewerSeed('reveal:1', phone)).toBe(`reveal:1:${viewerKey(phone)}`);
  });
});
