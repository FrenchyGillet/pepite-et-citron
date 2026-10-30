// ─── Domain types ────────────────────────────────────────────────────────────
// IDs: UUID strings in production, numbers in demo mode.
export type EntityId = string | number;

export interface Player {
  id: EntityId;
  name: string;
  org_id?: string;
  nickname?:   string | null;
  user_id?:    string | null;
  avatar_url?: string | null;
  /** Picked in Profile, from AVATAR_EMOJIS / AVATAR_COLORS (src/utils/avatar.ts). */
  avatar_emoji?: string | null;
  avatar_color?: string | null;
  /** Set when the admin archives the player: out of every picker, history kept. */
  archived_at?: string | null;
}

export type MatchPhase = 'voting' | 'counting' | 'closed';

export interface Match {
  id: EntityId;
  label: string;
  is_open: boolean;
  phase: MatchPhase;
  present_ids: EntityId[];
  reveal_order: EntityId[];
  revealed_count: number;
  season: number;
  team_id: EntityId | null;
  created_at: string;
  org_id?: string;
  tiebreakers?: Record<string, EntityId>;
  pepite_count?: 2 | 3;
  /** After this time submit_vote refuses ballots (null = no deadline). */
  vote_deadline?: string | null;
  /** Ballots received, kept by a trigger on votes (20260013). */
  vote_count?: number;
  /** The schedule that opened this vote on its own (20260021). */
  schedule_id?: EntityId | null;
  /** Result entered by hand for a match played without a vote (no ballots). */
  manual_result?: ManualResult | null;
}

/**
 * Result of a match nobody launched a vote for, entered afterwards from the
 * history. Points are optional: without them the match only counts in the
 * Pépite / Citron titles and the attendance, not in the season points.
 */
export interface ManualResult {
  /** Podium order, first = the Pépite (1 to pepite_count players). */
  best_ids: EntityId[];
  lemon_id: EntityId;
  /** Totals by player id, when someone counted them. */
  best_pts?: Record<string, number>;
  lemon_pts?: Record<string, number>;
}

export type OrgRole = 'admin' | 'captain' | 'voter';

export interface Vote {
  id?: EntityId;
  match_id: EntityId;
  voter_name: string;
  /** Player who cast the vote — set for logged-in voters, NULL for guests. */
  voter_player_id?: EntityId | null;
  best1_id?: EntityId;
  best2_id?: EntityId;
  best3_id?: EntityId;
  lemon_id?: EntityId;
  best1_comment?: string;
  best2_comment?: string;
  best3_comment?: string;
  lemon_comment?: string;
  /** Client-side only: single-use invite link, consumed by submit_vote. Not a column. */
  guest_token?: string;
}

export interface GuestToken {
  id: EntityId;
  token: string;
  name: string;
  match_id: EntityId;
  used: boolean;
  created_at: string;
  org_id?: string;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  role?: OrgRole | null;
  plan?: 'free' | 'pro';
}

/**
 * A scheduled match (20260021): once (starts_at) or every week or every
 * other week (weekday + start_time, in the team's timezone; 20260025). The
 * vote opens on its own at kick-off + the team's delay.
 */
export interface MatchSchedule {
  id: EntityId;
  label: string | null;
  starts_at: string | null;
  /** 0 = Sunday … 6 = Saturday, as Date.getDay(). */
  weekday: number | null;
  /** "HH:MM" (local to `timezone`). */
  start_time: string | null;
  timezone: string;
  team_id: EntityId | null;
  pepite_count: 2 | 3;
  /** Repeating: every week (1) or every other week (2). */
  interval_weeks: 1 | 2;
  /** Next kick-off whose vote has not opened yet, and its opening time. */
  next_kick_off: string;
  opens_at: string;
}

export interface MatchScheduleInput {
  label: string | null;
  starts_at: string | null;
  weekday: number | null;
  start_time: string | null;
  timezone: string;
  team_id: EntityId | null;
  pepite_count: 2 | 3;
  locale: 'fr' | 'en' | 'nl';
  interval_weeks: 1 | 2;
  /** Repeating: local "YYYY-MM-DD" of the first match (sets the weeks off). */
  first_on: string | null;
}

export interface OrgMember {
  user_id: string;
  email: string;
  role: OrgRole;
}

export interface Team {
  id: EntityId;
  name: string;
  player_ids: EntityId[];
  org_id?: string;
}

export interface ManualMatchInput {
  label: string;
  presentIds: EntityId[];
  teamId: EntityId | null;
  season: number;
  pepiteCount: 2 | 3;
  /** ISO date of the match (it is usually entered days later). */
  playedAt: string;
  result: ManualResult;
}

// ─── Score types ─────────────────────────────────────────────────────────────

export interface ScoreEntry {
  pts: number;
  comments: string[];
}

export type ScoreMap = Record<EntityId, ScoreEntry>;

export interface Scores {
  best: ScoreMap;
  lemon: ScoreMap;
}

export interface RankedPlayer extends Player {
  pts: number;
  comments: string[];
  rank?: number;
  absent?: boolean;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserSession {
  user: {
    id: string;
    email?: string;
  };
  access_token?: string;
}

// ─── API interface ────────────────────────────────────────────────────────────

/**
 * Data access. Every team-scoped call names its team (`orgId`): a request
 * made for one team can never load another, whatever the screen shows by the
 * time it runs (two teams on one phone, a vote link opened while loading).
 */
export interface API {
  // Auth
  signUp(email: string, password: string): Promise<unknown>;
  signIn(email: string, password: string): Promise<unknown>;
  signOut(): Promise<void>;
  getSession(): Promise<UserSession | null>;
  onAuthChange(callback: (event: string, session: UserSession | null) => void): { unsubscribe: () => void };
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  deleteAccount(): Promise<void>;

  // Orgs
  createOrg(name: string, slug: string): Promise<Org>;
  getMyOrgs(): Promise<Org[]>;
  getOrgBySlug(slug: string): Promise<Org | null>;
  getOrgMembers(orgId: string): Promise<OrgMember[]>;
  addMember(email: string, orgId: string, role?: OrgRole): Promise<void>;
  removeMember(userId: string, orgId: string): Promise<unknown>;
  /** The caller's "vote ouvert" email preference for this team (F10). */
  getEmailNotifications(orgId: string): Promise<boolean>;
  setEmailNotifications(orgId: string, enabled: boolean): Promise<void>;
  selfJoinOrg(orgId: string): Promise<void>;

  // Players
  getPlayers(orgId: string): Promise<Player[]>;
  addPlayer(orgId: string, name: string): Promise<Player>;
  addPlayers(orgId: string, names: string[]): Promise<Player[]>;
  removePlayer(id: EntityId): Promise<unknown>;
  setPlayerArchived(id: EntityId, archived: boolean): Promise<void>;
  updatePlayer(id: EntityId, data: Partial<Pick<Player, 'nickname' | 'avatar_url' | 'avatar_emoji' | 'avatar_color'>>): Promise<unknown>;
  linkPlayer(playerId: EntityId): Promise<unknown>;

  // Matches
  getActiveMatch(orgId: string): Promise<Match | null>;
  getMatches(orgId: string): Promise<Match[]>;
  getMatchById(id: EntityId): Promise<Match | null>;
  createMatch(orgId: string, label: string, presentIds: EntityId[], teamId: EntityId | null, season: number, pepiteCount?: 2 | 3, voteDeadline?: string | null): Promise<Match>;
  /** A closed match carrying a hand-entered result (no vote). */
  createManualMatch(orgId: string, input: ManualMatchInput): Promise<Match>;
  closeMatch(id: EntityId): Promise<unknown>;
  startCounting(id: EntityId, order: EntityId[]): Promise<unknown>;
  revealNext(id: EntityId, count: number): Promise<unknown>;
  updateMatch(id: EntityId, data: Partial<Match>): Promise<unknown>;
  deleteMatch(id: EntityId): Promise<unknown>;

  // Scheduled matches (20260021)
  /** Upcoming scheduled matches of the current team, soonest first. */
  getUpcomingSchedules(orgId: string): Promise<MatchSchedule[]>;
  createSchedule(orgId: string, input: MatchScheduleInput): Promise<void>;
  deleteSchedule(id: EntityId): Promise<void>;
  /** « Ouvrir maintenant »: opens the schedule's next occurrence now. */
  openScheduleNow(id: EntityId): Promise<Match>;
  /** « Pas de match ce jour-là »: skips a repeating match's next occurrence; returns the one after. */
  skipNextOccurrence(id: EntityId): Promise<string | null>;
  /** Minutes between kick-off and the vote opening; null = never set (90). */
  getVoteOpenDelay(orgId: string): Promise<number | null>;
  setVoteOpenDelay(orgId: string, minutes: number): Promise<void>;

  // Season
  getCurrentSeason(orgId: string): Promise<number>;
  advanceSeason(orgId: string): Promise<number>;
  getSeasonName(orgId: string, season: number): Promise<string | null>;
  setSeasonName(orgId: string, season: number, name: string): Promise<void>;

  // Votes
  hasVoted(matchId: EntityId, voterName: string, voterPlayerId?: EntityId | null): Promise<boolean>;
  getVoteCount(matchId: EntityId): Promise<number>;
  submitVote(vote: Vote): Promise<void>;
  getVotes(matchId: EntityId, orgSlug?: string | null): Promise<Vote[]>;
  getAllVotes(orgId: string): Promise<Vote[]>;
  deleteVote(voteId: EntityId): Promise<void>;

  // Teams
  getTeams(orgId: string): Promise<Team[]>;
  createTeam(orgId: string, name: string, playerIds: EntityId[]): Promise<Team>;
  updateTeam(id: EntityId, playerIds: EntityId[]): Promise<unknown>;
  deleteTeam(id: EntityId): Promise<unknown>;

  // Guest tokens
  createGuestToken(orgId: string, name: string, matchId: EntityId): Promise<string>;
  getGuestTokens(matchId: EntityId): Promise<GuestToken[]>;
  validateGuestToken(token: string): Promise<GuestToken | null>;
  deleteGuestToken(id: EntityId): Promise<unknown>;

  // Push notifications
  subscribePush(orgId: string, sub: PushSubscriptionJSON): Promise<void>;
  unsubscribePush(orgId: string, endpoint: string): Promise<void>;
}

// ─── Push notification types ──────────────────────────────────────────────────

export type PushNotificationType = 'vote_open' | 'results_ready';

export interface PushPayload {
  type: PushNotificationType;
  title: string;
  body: string;
  url?: string;
}
