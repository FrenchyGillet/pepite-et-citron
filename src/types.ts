// ─── Domain types ────────────────────────────────────────────────────────────
// IDs: UUID strings in production, numbers in demo mode.
export type EntityId = string | number;

export interface Player {
  id: EntityId;
  name: string;
  org_id?: string;
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
}

export interface Vote {
  id?: EntityId;
  match_id: EntityId;
  voter_name: string;
  best1_id?: EntityId;
  best2_id?: EntityId;
  best3_id?: EntityId;
  lemon_id?: EntityId;
  best1_comment?: string;
  best2_comment?: string;
  best3_comment?: string;
  lemon_comment?: string;
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
  role?: 'admin' | 'voter' | null;
  plan?: 'free' | 'pro';
}

export interface OrgMember {
  user_id: string;
  email: string;
  role: 'admin' | 'voter';
}

export interface Team {
  id: EntityId;
  name: string;
  player_ids: EntityId[];
  org_id?: string;
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
  getMyOrg(): Promise<Org | null>;
  getMyOrgs(): Promise<Org[]>;
  getOrgBySlug(slug: string): Promise<Org | null>;
  getOrgMembers(orgId: string): Promise<OrgMember[]>;
  addMember(email: string, orgId: string, role?: 'admin' | 'voter'): Promise<void>;
  removeMember(userId: string, orgId: string): Promise<unknown>;

  // Players
  getPlayers(): Promise<Player[]>;
  addPlayer(name: string): Promise<Player>;
  removePlayer(id: EntityId): Promise<unknown>;

  // Matches
  getActiveMatch(): Promise<Match | null>;
  getMatches(): Promise<Match[]>;
  getMatchById(id: EntityId): Promise<Match | null>;
  createMatch(label: string, presentIds: EntityId[], teamId: EntityId | null, season: number, pepiteCount?: 2 | 3): Promise<Match>;
  closeMatch(id: EntityId): Promise<unknown>;
  startCounting(id: EntityId, order: EntityId[]): Promise<unknown>;
  revealNext(id: EntityId, count: number): Promise<unknown>;
  updateMatch(id: EntityId, data: Partial<Match>): Promise<unknown>;
  deleteMatch(id: EntityId): Promise<unknown>;

  // Season
  getCurrentSeason(): Promise<number>;
  advanceSeason(): Promise<number>;
  getSeasonName(season: number): Promise<string | null>;
  setSeasonName(season: number, name: string): Promise<void>;

  // Votes
  hasVoted(matchId: EntityId, voterName: string): Promise<boolean>;
  submitVote(vote: Vote): Promise<void>;
  getVotes(matchId: EntityId): Promise<Vote[]>;
  getAllVotes(): Promise<Vote[]>;

  // Teams
  getTeams(): Promise<Team[]>;
  createTeam(name: string, playerIds: EntityId[]): Promise<Team>;
  deleteTeam(id: EntityId): Promise<unknown>;

  // Guest tokens
  createGuestToken(name: string, matchId: EntityId): Promise<string>;
  getGuestTokens(matchId: EntityId): Promise<GuestToken[]>;
  validateGuestToken(token: string): Promise<GuestToken | null>;
  useGuestToken(token: string): Promise<unknown>;
  deleteGuestToken(id: EntityId): Promise<unknown>;
}
