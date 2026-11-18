const VIEWER_KEY = 'pepite_viewer_key';

let memoryKey: string | null = null;

function randomKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * A random key for this device, kept in localStorage: it tells phones apart
 * without saying anything about who holds them (no player, no account).
 * Without storage (private mode, blocked site data) it lasts until the page
 * is reloaded.
 */
export function viewerKey(storage?: Storage): string {
  try {
    const store = storage ?? window.localStorage;
    const saved = store.getItem(VIEWER_KEY);
    if (saved) return saved;
    const key = randomKey();
    store.setItem(VIEWER_KEY, key);
    return key;
  } catch {
    memoryKey ??= randomKey();
    return memoryKey;
  }
}

/**
 * The mascots' seed for this device: each phone draws its own line, and keeps
 * it, so teammates can compare what Pépite and Citron told them.
 */
export function viewerSeed(seed: string, storage?: Storage): string {
  return `${seed}:${viewerKey(storage)}`;
}
