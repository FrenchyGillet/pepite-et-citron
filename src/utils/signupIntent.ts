/**
 * Remembers that a visitor clicked "Passer Pro" on the landing page, so the
 * upgrade offer can be shown once they have signed up and created their team
 * (the landing links to /login?mode=signup&plan=annual|monthly).
 * sessionStorage: the intent only lives in the tab that followed the link.
 */
export type UpgradePlan = 'monthly' | 'annual';

const UPGRADE_INTENT_KEY = 'pepite_upgrade_intent';

export function parseUpgradePlan(value: string | null | undefined): UpgradePlan | null {
  return value === 'monthly' || value === 'annual' ? value : null;
}

export function saveUpgradeIntent(plan: UpgradePlan, storage: Storage = window.sessionStorage): void {
  try { storage.setItem(UPGRADE_INTENT_KEY, plan); } catch { /* storage unavailable */ }
}

/** Returns the saved plan and forgets it (the offer is shown once). */
export function takeUpgradeIntent(storage: Storage = window.sessionStorage): UpgradePlan | null {
  try {
    const plan = parseUpgradePlan(storage.getItem(UPGRADE_INTENT_KEY));
    storage.removeItem(UPGRADE_INTENT_KEY);
    return plan;
  } catch {
    return null;
  }
}
