/**
 * Umami analytics — thin wrapper around window.umami.
 *
 * Silent no-op when the Umami script is absent: blocked by an ad blocker, not
 * loaded (tests), or on a host outside `data-domains` (localhost, previews).
 *
 * Never send personal data: no names, emails, ids, match labels or tokens —
 * only counts, booleans and short enums. app.html strips query strings and
 * hashes from page views (?guest= tokens, recovery links).
 *
 * Usage:
 *   import { track, EVENTS } from '@/utils/analytics';
 *   track(EVENTS.VOTE_COMPLETED, { anonymous: true });
 */

type TrackData = Record<string, string | number | boolean>;

// ── Event catalogue ────────────────────────────────────────────────────────────
// Centralised constants avoid typos across components.

export const EVENTS = {
  // App lifecycle
  APP_LAUNCHED:               'app_launched',
  PWA_INSTALLED:              'pwa_installed',
  SCREEN_CRASHED:             'screen_crashed',
  THEME_TOGGLED:              'theme_toggled',
  FEEDBACK_CLICKED:           'feedback_clicked',

  // Auth
  AUTH_LOGIN:                 'auth_login',
  AUTH_SIGNUP:                'auth_signup',
  AUTH_FAILED:                'auth_failed',
  AUTH_GUIDE_OPENED:          'auth_guide_opened',
  PASSWORD_RESET_REQUESTED:   'password_reset_requested',
  PASSWORD_RESET_COMPLETED:   'password_reset_completed',
  SIGNED_OUT:                 'signed_out',

  // Onboarding funnel: landing → signup → team created / joined → first match
  ORG_CREATED:                'org_created',
  FIRST_VOTE_LAUNCHED:        'first_vote_launched',
  QUICK_START_FAILED:         'quick_start_failed',
  ORG_JOINED:                 'org_joined',
  ORG_SWITCHED:               'org_switched',
  NO_TEAM_CREATE_CLICKED:     'no_team_create_clicked',
  ONBOARDING_CLOSED:          'onboarding_closed',
  SETUP_CHECKLIST_DISMISSED:  'setup_checklist_dismissed',

  // Voting (player side)
  VOTER_LINK_OPENED:          'voter_link_opened',
  GUEST_LINK_INVALID:         'guest_link_invalid',
  VOTE_STARTED:               'vote_started',
  VOTE_ALREADY_CAST:          'vote_already_cast',
  VOTE_COMPLETED:             'vote_completed',
  VOTE_FAILED:                'vote_failed',
  VOTE_QUEUED_OFFLINE:        'vote_queued_offline',
  VOTE_OFFLINE_SYNCED:        'vote_offline_synced',
  VOTE_OFFLINE_DROPPED:       'vote_offline_dropped',

  // Match lifecycle (admin side)
  MATCH_CREATED:              'match_created',
  VOTE_LINK_SHARED:           'vote_link_shared',
  VOTE_QR_SHOWN:              'vote_qr_shown',
  VOTE_DEADLINE_EXTENDED:     'vote_deadline_extended',
  VOTE_REMINDER_SENT:         'vote_reminder_sent',
  VOTE_CANCELLED_BY_ADMIN:    'vote_cancelled_by_admin',
  MATCH_CLOSED_WITHOUT_COUNT: 'match_closed_without_count',
  COUNTING_STARTED:           'counting_started',
  COUNTING_FINISHED:          'counting_finished',
  TIEBREAKER_RESOLVED:        'tiebreaker_resolved',
  MATCH_DELETED:              'match_deleted',
  MANUAL_RESULT_SAVED:        'manual_result_saved',

  // Results
  PODIUM_REVEALED:            'podium_revealed',
  PODIUM_SHARED:              'podium_shared',
  RESULTS_SHARED:             'results_shared',

  // Team management
  PLAYER_ADDED:               'player_added',
  LINEUP_CREATED:             'lineup_created',
  MEMBER_ADDED:               'member_added',
  MEMBER_PROMOTED:            'member_promoted',
  CAPTAIN_APPOINTED:          'captain_appointed',
  CAPTAIN_REMOVED:            'captain_removed',
  SEASON_ADVANCED:            'season_advanced',
  ORG_LINK_COPIED:            'org_link_copied',
  GUEST_LINK_COPIED:          'guest_link_copied',

  // Profile & notifications
  PLAYER_CLAIMED:             'player_claimed',
  NICKNAME_SAVED:             'nickname_saved',
  EMAIL_NOTIFICATIONS_TOGGLED:'email_notifications_toggled',
  PUSH_ENABLED:               'push_enabled',
  PUSH_DENIED:                'push_denied',
  PUSH_FAILED:                'push_failed',
  PUSH_DISABLED:              'push_disabled',
  PUSH_BANNER_DISMISSED:      'push_banner_dismissed',
  ACCOUNT_DELETED:            'account_deleted',

  // Conversion funnel
  UPGRADE_CLICKED:            'upgrade_clicked',
  UPGRADE_MODAL_DISMISSED:    'upgrade_modal_dismissed',
  CHECKOUT_STARTED:           'checkout_started',
  CHECKOUT_FAILED:            'checkout_failed',
  CHECKOUT_COMPLETED:         'checkout_completed',
  BILLING_PORTAL_OPENED:      'billing_portal_opened',
  PROMO_SIGNUP_CLICKED:       'promo_signup_clicked',
  PROMO_RESULTS_CLICKED:      'promo_results_clicked',
} as const;

export type AnalyticsEvent = typeof EVENTS[keyof typeof EVENTS];

export function track(event: AnalyticsEvent, data?: TrackData): void {
  try {
    window.umami?.track(event, data);
  } catch {
    // Never let analytics crash the app
  }
}

/**
 * Attach properties to the current Umami session so every page view and event
 * can be segmented (e.g. role, plan). Same rule: nothing personal.
 */
export function identify(data: TrackData): void {
  try {
    window.umami?.identify(data);
  } catch {
    // Never let analytics crash the app
  }
}

/** 'standalone' when launched from the home screen (installed PWA). */
export function displayMode(): 'standalone' | 'browser' {
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone ? 'standalone' : 'browser';
}

/** Call once at startup: app launch (installed or not) + PWA installation. */
export function trackAppLaunch(): void {
  track(EVENTS.APP_LAUNCHED, { display: displayMode(), online: navigator.onLine });
  window.addEventListener('appinstalled', () => track(EVENTS.PWA_INSTALLED));
}
