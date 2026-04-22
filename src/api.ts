import { SUPABASE_URL } from './config';
import { supabase, authClient } from './supabaseClient';
import type {
  API, Player, Match, Vote, GuestToken, Org, OrgMember, Team, EntityId, UserSession,
} from './types';

export const DEMO_MODE = SUPABASE_URL.includes("VOTRE_PROJET");

// ─── Timeout helper pour les RPCs Supabase SDK ────────────────────────────────
// authClient.rpc() n'a pas de timeout natif → on le wrape avec Promise.race.
function rpcWithTimeout<T>(fn: () => PromiseLike<T>, ms = 10000): Promise<T> {
  return Promise.race([
    Promise.resolve(fn()),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Délai dépassé — vérifie ta connexion et réessaie.")), ms)
    ),
  ]);
}

// ─── Retry helper ─────────────────────────────────────────────────────────────
// Réessaie automatiquement les erreurs réseau transitoires (pas les 4xx auth).
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const isLast       = attempt === retries;
      const isNetworkErr = error.name === 'AbortError' || error.name === 'TypeError'
        || error.message?.includes('fetch') || error.message?.includes('network');
      const isClientErr  = /Erreur 4\d\d/.test(error.message);
      if (isLast || isClientErr || !isNetworkErr) throw error;
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw new Error('withRetry exhausted');
}

// Org courante (défini au login ou via ?org=slug)
let _orgId: string | null = null;
export function setCurrentOrgId(id: string | null): void { _orgId = id; }
export function getCurrentOrgId(): string | null { return _orgId; }

// ─── Demo state ───────────────────────────────────────────────────────────────
export let demoState = {
  players: [
    { id: 1, name: "Antoine" }, { id: 2, name: "Baptiste" },
    { id: 3, name: "Clément" }, { id: 4, name: "David" },
    { id: 5, name: "Étienne" }, { id: 6, name: "Florian" },
    { id: 7, name: "Guillaume" }, { id: 8, name: "Hugo" },
    { id: 9, name: "Julien" }, { id: 10, name: "Kevin" },
  ] as Player[],
  matches:      [] as Match[],
  votes:        [] as Vote[],
  teams:        [] as Team[],
  guestTokens:  [] as GuestToken[],
  nextId:       100,
  currentSeason: 1,
  seasonNames:  {} as Record<number, string>,
};

export const demoAPI: API = {
  // Auth (stubs pour le mode démo)
  signUp:       () => Promise.resolve({ user: { id: "demo" } }),
  signIn:       () => Promise.resolve({ user: { id: "demo" } }),
  signOut:      () => Promise.resolve(),
  getSession:   () => Promise.resolve({ user: { id: "demo", email: "demo@demo.com" } }),
  onAuthChange: () => ({ unsubscribe: () => {} }),
  createOrg:    (name, slug) => Promise.resolve({ id: "demo-org", name, slug }),
  getMyOrg:     () => Promise.resolve({ id: "demo-org", name: "Demo", slug: "demo", role: "admin" }),
  getMyOrgs:    () => Promise.resolve([{ id: "demo-org", name: "Demo", slug: "demo", role: "admin" }]),
  getOrgBySlug: () => Promise.resolve({ id: "demo-org", name: "Demo", slug: "demo" }),
  getOrgMembers: () => Promise.resolve([] as OrgMember[]),
  addMember:    () => Promise.resolve(),
  removeMember: () => Promise.resolve(),

  // Données
  getPlayers:     () => Promise.resolve([...demoState.players]),
  addPlayer:      (name) => {
    const p: Player = { id: demoState.nextId++, name };
    demoState.players.push(p);
    return Promise.resolve(p);
  },
  removePlayer:   (id) => {
    demoState.players = demoState.players.filter(p => p.id !== id);
    return Promise.resolve(true);
  },
  getActiveMatch: () => Promise.resolve(
    demoState.matches.find(m => m.is_open || m.phase === "counting") ?? null
  ),
  getMatches:     () => Promise.resolve([...demoState.matches].reverse()),
  createMatch: (label, presentIds, teamId, season) => {
    const m: Match = {
      id: demoState.nextId++, label, present_ids: presentIds,
      is_open: true, phase: "voting", reveal_order: [], revealed_count: 0,
      season: season || demoState.currentSeason, team_id: teamId ?? null,
      created_at: new Date().toISOString(),
    };
    demoState.matches.push(m);
    return Promise.resolve(m);
  },
  closeMatch:    (id) => {
    const m = demoState.matches.find(m => m.id === id);
    if (m) { m.is_open = false; m.phase = "closed"; }
    return Promise.resolve(true);
  },
  startCounting: (id, order) => {
    const m = demoState.matches.find(m => m.id === id);
    if (m) { m.is_open = false; m.phase = "counting"; m.reveal_order = order; m.revealed_count = 0; }
    return Promise.resolve(true);
  },
  revealNext:    (id, count) => {
    const m = demoState.matches.find(m => m.id === id);
    if (m) m.revealed_count = count;
    return Promise.resolve(true);
  },
  updateMatch:   (id, data) => {
    const m = demoState.matches.find(m => m.id === id);
    if (m) Object.assign(m, data);
    return Promise.resolve(true);
  },
  deleteMatch:   (id) => {
    demoState.matches = demoState.matches.filter(m => m.id !== id);
    demoState.votes   = demoState.votes.filter(v => v.match_id !== id);
    return Promise.resolve(true);
  },
  getCurrentSeason: () => Promise.resolve(demoState.currentSeason),
  advanceSeason:    () => { demoState.currentSeason++; return Promise.resolve(demoState.currentSeason); },
  getSeasonName:    (season) => Promise.resolve(demoState.seasonNames[season] ?? null),
  setSeasonName:    (season, name) => { demoState.seasonNames[season] = name; return Promise.resolve(); },
  hasVoted:         (matchId, voterName) => Promise.resolve(
    demoState.votes.some(v => v.match_id === matchId && v.voter_name === voterName)
  ),
  submitVote:       (vote) => { demoState.votes.push({ ...vote, id: demoState.nextId++ }); return Promise.resolve(); },
  getVotes:         (matchId) => Promise.resolve(demoState.votes.filter(v => v.match_id === matchId)),
  getAllVotes:       () => Promise.resolve([...demoState.votes]),
  getTeams:         () => Promise.resolve([...demoState.teams]),
  createTeam:       (name, playerIds) => {
    const t: Team = { id: demoState.nextId++, name, player_ids: playerIds };
    demoState.teams.push(t);
    return Promise.resolve(t);
  },
  deleteTeam:       (id) => {
    demoState.teams = demoState.teams.filter(t => t.id !== id);
    return Promise.resolve(true);
  },
  createGuestToken: (name, matchId) => {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    demoState.guestTokens.push({ id: demoState.nextId++, token, name, match_id: matchId, used: false, created_at: new Date().toISOString() });
    return Promise.resolve(token);
  },
  getGuestTokens:     (matchId) => Promise.resolve(demoState.guestTokens.filter(t => t.match_id === matchId)),
  validateGuestToken: (token)   => Promise.resolve(demoState.guestTokens.find(t => t.token === token) ?? null),
  useGuestToken:      (token)   => {
    const t = demoState.guestTokens.find(t => t.token === token);
    if (t) t.used = true;
    return Promise.resolve(true);
  },
  deleteGuestToken:   (id) => {
    demoState.guestTokens = demoState.guestTokens.filter(t => t.id !== id);
    return Promise.resolve(true);
  },
  getMatchById: (id) => Promise.resolve(demoState.matches.find(m => m.id === id) ?? null),
};

// ─── Real API ─────────────────────────────────────────────────────────────────
export const realAPI: API = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  signUp: async (email, password) => {
    const { data, error } = await authClient.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  signIn: async (email, password) => {
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  signOut: async () => {
    await authClient.auth.signOut();
  },
  getSession: async (): Promise<UserSession | null> => {
    const { data: { session } } = await authClient.auth.getSession();
    return session as UserSession | null;
  },
  onAuthChange: (callback) => {
    const { data: { subscription } } = authClient.auth.onAuthStateChange(
      (event, session) => callback(event, session as UserSession | null)
    );
    return subscription;
  },

  // ── Organisations ─────────────────────────────────────────────────────────
  createOrg: async (name, slug) => {
    const suffix = () => Math.random().toString(36).slice(2, 6);
    const candidates = [slug, `${slug}-${suffix()}`, `${slug}-${suffix()}`];

    let finalSlug: string | null = null;
    for (const s of candidates) {
      const { error } = await rpcWithTimeout(() =>
        authClient.rpc("create_organization", { org_name: name, org_slug: s })
      );
      if (!error) { finalSlug = s; break; }
      const isDuplicate = error.message?.includes("unique") || error.message?.includes("duplicate") || error.code === "23505";
      if (!isDuplicate) throw new Error(error.message);
    }
    if (!finalSlug) throw new Error("Impossible de créer l'équipe, réessayez.");

    const rows = await supabase.from("organizations").select("*", { filter: `slug=eq.${encodeURIComponent(finalSlug)}` });
    const org = rows[0] as Org | undefined;
    if (!org?.id) throw new Error("Erreur création organisation");
    return org;
  },
  getMyOrgs: async (): Promise<Org[]> => {
    try {
      const { data, error } = await rpcWithTimeout(() => authClient.rpc("get_my_orgs"), 4000);
      if (error) throw new Error(error.message);
      return (data as Org[]) || [];
    } catch (rpcErr) {
      console.warn("get_my_orgs RPC indisponible, fallback REST:", (rpcErr as Error).message);
      let members: Array<{ org_id: string; role?: string }>;
      try {
        members = await supabase.from("org_members").select("org_id,role") as typeof members;
      } catch {
        const rows = await supabase.from("org_members").select("org_id") as Array<{ org_id: string }>;
        members = (rows || []).map(r => ({ org_id: r.org_id, role: "admin" }));
      }
      if (!members?.length) return [];
      const orgIds = members.map(m => m.org_id).join(",");
      const orgs = await supabase.from("organizations").select("*", { filter: `id=in.(${orgIds})` }) as Org[];
      return members.map(m => {
        const org = orgs.find(o => o.id === m.org_id);
        return org ? { ...org, role: (m.role || "admin") as 'admin' | 'voter' } as Org : null;
      }).filter((o): o is Org => o != null);
    }
  },
  getMyOrg: async () => {
    const orgs = await realAPI.getMyOrgs();
    return orgs.find(o => o.role === "admin") || orgs[0] || null;
  },
  getOrgMembers: async (orgId) => {
    const { data, error } = await rpcWithTimeout(() =>
      authClient.rpc("get_org_members", { target_org_id: orgId })
    );
    if (error) throw new Error(error.message);
    return (data as OrgMember[]) || [];
  },
  addMember: async (email, orgId, role = "voter") => {
    const { error } = await rpcWithTimeout(() =>
      authClient.rpc("add_org_member", { member_email: email, target_org_id: orgId, member_role: role })
    );
    if (error) throw new Error(error.message);
  },
  removeMember: async (userId, orgId) => {
    return supabase.from("org_members").delete(`user_id=eq.${userId}&org_id=eq.${orgId}`);
  },
  getOrgBySlug: async (slug) => {
    const rows = await supabase.from("organizations").select("*", { filter: `slug=eq.${slug}` }) as Org[];
    return rows[0] ?? null;
  },

  // ── Joueurs ───────────────────────────────────────────────────────────────
  getPlayers: () =>
    withRetry(async () => {
      const rows = await supabase.from("players").select("*", { filter: `org_id=eq.${_orgId}`, order: "name.asc" });
      return rows as Player[];
    }),
  addPlayer: (name) =>
    withRetry(async () => {
      const rows = await supabase.from("players").insert({ name, org_id: _orgId });
      const r = Array.isArray(rows) ? rows : [rows];
      return r[0] as Player;
    }),
  removePlayer: (id) => supabase.from("players").delete(`id=eq.${id}`),

  // ── Matchs ────────────────────────────────────────────────────────────────
  getActiveMatch: () =>
    withRetry(async () => {
      const rows = await supabase.from("matches").select("*", {
        filter: `or=(is_open.eq.true,phase.eq.counting)&org_id=eq.${_orgId}`,
        order:  "created_at.desc",
      });
      return (Array.isArray(rows) ? (rows[0] as Match | undefined) : null) ?? null;
    }),
  getMatches: () =>
    withRetry(async () => {
      const rows = await supabase.from("matches").select("*", { filter: `org_id=eq.${_orgId}`, order: "created_at.desc" });
      return rows as Match[];
    }),
  createMatch: (label, presentIds, teamId, season) =>
    withRetry(async () => {
      const rows = await supabase.from("matches").insert({
        label, present_ids: presentIds, is_open: true, phase: "voting",
        team_id: teamId ?? null, season: season || 1, org_id: _orgId,
      });
      const r = Array.isArray(rows) ? rows : [rows];
      return r[0] as Match;
    }),
  closeMatch:    (id) => supabase.from("matches").update({ is_open: false, phase: "closed" }, `id=eq.${id}`),
  startCounting: (id, order) => supabase.from("matches").update({ is_open: false, phase: "counting", reveal_order: order, revealed_count: 0 }, `id=eq.${id}`),
  revealNext:    (id, count) => supabase.from("matches").update({ revealed_count: count }, `id=eq.${id}`),
  updateMatch:   (id, data)  => supabase.from("matches").update(data, `id=eq.${id}`),
  deleteMatch:   async (id)  => {
    await supabase.from("votes").delete(`match_id=eq.${id}`);
    return supabase.from("matches").delete(`id=eq.${id}`);
  },
  getMatchById: async (id) => {
    const rows = await supabase.from("matches").select("*", { filter: `id=eq.${id}` }) as Match[];
    return rows[0] ?? null;
  },

  // ── Saison ────────────────────────────────────────────────────────────────
  getCurrentSeason: async () => {
    try {
      const rows = await supabase.from("settings").select("value", { filter: `key=eq.current_season&org_id=eq.${_orgId}` }) as Array<{ value: string }>;
      return parseInt(rows[0]?.value || "1");
    } catch { return 1; }
  },
  advanceSeason: async () => {
    const cur  = await realAPI.getCurrentSeason();
    const next = cur + 1;
    const db   = supabase.from("settings");
    const updated = await db.update({ value: String(next) }, `key=eq.current_season&org_id=eq.${_orgId}`);
    if (!Array.isArray(updated) || updated.length === 0) {
      await db.insert({ key: "current_season", value: String(next), org_id: _orgId });
    }
    return next;
  },
  getSeasonName: async (season) => {
    try {
      const rows = await supabase.from("settings").select("value", { filter: `key=eq.season_name_${season}&org_id=eq.${_orgId}` }) as Array<{ value: string }>;
      return rows[0]?.value ?? null;
    } catch { return null; }
  },
  setSeasonName: async (season, name) => {
    const db = supabase.from("settings");
    const existing = await db.select("value", { filter: `key=eq.season_name_${season}&org_id=eq.${_orgId}` }) as unknown[];
    if (Array.isArray(existing) && existing.length > 0) {
      await db.update({ value: name }, `key=eq.season_name_${season}&org_id=eq.${_orgId}`);
    } else {
      try {
        await db.insert({ key: `season_name_${season}`, value: name, org_id: _orgId });
      } catch {
        await db.update({ value: name }, `key=eq.season_name_${season}&org_id=eq.${_orgId}`);
      }
    }
  },

  // ── Votes ─────────────────────────────────────────────────────────────────
  hasVoted: async (matchId, voterName) => {
    const rows = await supabase.from("votes").select("id", { filter: `match_id=eq.${matchId}&voter_name=eq.${encodeURIComponent(voterName)}` });
    return Array.isArray(rows) && rows.length > 0;
  },
  submitVote: async (vote) => {
    try {
      await supabase.from("votes").insert(vote);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.message?.includes("409") || error.message?.includes("duplicate") || error.message?.includes("unique")) {
        return;
      }
      throw error;
    }
  },
  getVotes: async (matchId) => {
    const rows = await supabase.from("votes").select("*", { filter: `match_id=eq.${matchId}` });
    return rows as Vote[];
  },
  getAllVotes: async () => {
    const matches = await realAPI.getMatches();
    if (!matches?.length) return [];
    const ids = matches.map(m => m.id).join(",");
    const rows = await supabase.from("votes").select("*", { filter: `match_id=in.(${ids})` });
    return rows as Vote[];
  },

  // ── Équipes ───────────────────────────────────────────────────────────────
  getTeams: async () => {
    const rows = await supabase.from("teams").select("*", { filter: `org_id=eq.${_orgId}`, order: "name.asc" });
    return rows as Team[];
  },
  createTeam: async (name, playerIds) => {
    const rows = await supabase.from("teams").insert({ name, player_ids: playerIds, org_id: _orgId });
    const r = Array.isArray(rows) ? rows : [rows];
    return r[0] as Team;
  },
  deleteTeam: (id) => supabase.from("teams").delete(`id=eq.${id}`),

  // ── Guest tokens ──────────────────────────────────────────────────────────
  createGuestToken: async (name, matchId) => {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    await supabase.from("guest_tokens").insert({ token, name, match_id: matchId, org_id: _orgId });
    return token;
  },
  getGuestTokens: async (matchId) => {
    const rows = await supabase.from("guest_tokens").select("*", { filter: `match_id=eq.${matchId}`, order: "created_at.asc" });
    return rows as GuestToken[];
  },
  validateGuestToken: async (token) => {
    const rows = await supabase.from("guest_tokens").select("*", { filter: `token=eq.${token}` }) as GuestToken[];
    return rows[0] ?? null;
  },
  useGuestToken: (token) => supabase.from("guest_tokens").update({ used: true }, `token=eq.${token}`),
  deleteGuestToken: (id) => supabase.from("guest_tokens").delete(`id=eq.${id as EntityId}`),
};

export const api: API = DEMO_MODE ? demoAPI : realAPI;

// ─── Reset pour les tests ─────────────────────────────────────────────────────
export function __resetDemoState(): void {
  demoState.players = [
    { id: 1, name: "Antoine" }, { id: 2, name: "Baptiste" },
    { id: 3, name: "Clément" }, { id: 4, name: "David" },
    { id: 5, name: "Étienne" }, { id: 6, name: "Florian" },
    { id: 7, name: "Guillaume" }, { id: 8, name: "Hugo" },
    { id: 9, name: "Julien" }, { id: 10, name: "Kevin" },
  ];
  demoState.matches       = [];
  demoState.votes         = [];
  demoState.teams         = [];
  demoState.guestTokens   = [];
  demoState.nextId        = 100;
  demoState.currentSeason = 1;
  demoState.seasonNames   = {};
}

export { demoAPI as __demoAPI };
