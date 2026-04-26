/**
 * Umami analytics — thin wrapper around window.umami.track().
 *
 * Silent no-op when:
 *   - VITE_UMAMI_WEBSITE_ID is not set (dev / CI)
 *   - The Umami script hasn't finished loading
 *
 * Usage:
 *   import { track } from '@/utils/analytics';
 *   track('vote_completed', { matchId: 'abc', pepiteCount: 3 });
 */

type TrackData = Record<string, string | number | boolean>;

export function track(event: string, data?: TrackData): void {
  try {
    window.umami?.track(event, data);
  } catch {
    // Never let analytics crash the app
  }
}

// ── Event catalogue ────────────────────────────────────────────────────────────
// Centralised constants avoid typos across components.

export const EVENTS = {
  // Auth
  AUTH_LOGIN:           'auth_login',
  AUTH_SIGNUP:          'auth_signup',

  // Voting
  VOTE_COMPLETED:       'vote_completed',

  // Admin actions
  MATCH_CREATED:        'match_created',
  PLAYER_ADDED:         'player_added',
  ORG_LINK_COPIED:      'org_link_copied',
  GUEST_LINK_COPIED:    'guest_link_copied',

  // Conversion funnel
  UPGRADE_CLICKED:      'upgrade_clicked',
  PROMO_SIGNUP_CLICKED: 'promo_signup_clicked',
  PROMO_RESULTS_CLICKED:'promo_results_clicked',
} as const;
