/**
 * Personal data this app keeps on the device, cleared on sign-out and after
 * account deletion so the next person on a shared phone sees nothing of it.
 *
 * Kept on purpose: the theme and small UI flags (dismissed banners, checklist),
 * and the offline vote queue (pepite_offline_vote_v*) — a ballot waiting for
 * the network belongs to the voter and must still be sent.
 */
const PERSONAL_KEYS = [
  'pepite_query_cache',     // persisted TanStack cache: ballots, comments, rosters
  'pepite_voter_identity',  // "who am I" on the vote screen
  'pepite_voted',           // matches already voted from this device
  'pepite_pending_org',     // team to join after signup (?org= link)
];
const PERSONAL_PREFIXES = [
  'pepite_vote_draft_',     // unfinished ballots (picks + comments)
  'pepite_orgs_v',          // cached team list
];

export function clearLocalPersonalData(storage: Storage = window.localStorage): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (PERSONAL_KEYS.includes(key) || PERSONAL_PREFIXES.some(p => key.startsWith(p))) {
        storage.removeItem(key);
      }
    }
  } catch {
    // Storage unavailable (private mode, blocked site data): nothing to clear.
  }
}

/**
 * Stops this browser's push subscription, so a signed-out account no longer
 * receives its team's notifications on this device. The server row goes stale
 * and is removed at the next send (web-push answers 410).
 */
export async function unsubscribeDeviceFromPush(): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    await subscription?.unsubscribe();
    window.localStorage.removeItem('pepite_push_subscribed');
  } catch {
    // Best-effort
  }
}
