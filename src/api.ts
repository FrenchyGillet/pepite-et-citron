import { SUPABASE_URL } from '@/config';
import { supabase } from '@/lib/supabase';
import type {
  API, Player, Match, Vote, GuestToken, Org, OrgMember, Team, UserSession,
} from '@/types';

export const DEMO_MODE = SUPABASE_URL.includes("VOTRE_PROJET");

// ─── RPC with timeout ─────────────────────────────────────────────────────────
function rpcWithTimeout<T>(fn: () => PromiseLike<T>, ms = 10000): Promise<T> {
  return Promise.race([
    Promise.resolve(fn()),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Délai dépassé — vérifie ta connexion et réessaie.")), ms)
    ),
  ]);
}

// ─── Retry on transient failures ─────────────────────────────────────────────
// Single retry authority for the whole API layer: the QueryClient is configured
// with `retry: 0`, so every retry decision lives here. Retries network blips,
// aborts/timeouts and 5xx; never retries 4xx (client errors are permanent).
// Reads and idempotent UPDATEs only: an INSERT that times out after the server
// committed it would be inserted twice.
async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const error  = err instanceof Error ? err : new Error(String(err));
      const status = (err as { status?: number })?.status;
      const isLast       = attempt === retries;
      const isNetworkErr = error.name === 'AbortError' || error.name === 'TypeError'
        || error.message?.includes('fetch') || error.message?.includes('network')
        || error.message?.toLowerCase().includes('abort')
        || error.message?.toLowerCase().includes('délai dépassé');
      const isServerErr  = typeof status === 'number' && status >= 500;
      const isClientErr  = (typeof status === 'number' && status >= 400 && status < 500)
        || /Erreur 4\d\d/.test(error.message);
      const isRetriable  = (isNetworkErr || isServerErr) && !isClientErr;
      if (isLast || !isRetriable) throw error;
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw new Error('withRetry exhausted');
}

// ─── Unwrap SDK { data, error } response ─────────────────────────────────────
async function run<T>(
  builder: PromiseLike<{ data: T | null; error: { message: string } | null; status?: number }>
): Promise<T> {
  const { data, error, status } = await builder;
  if (error) throw Object.assign(new Error(error.message), { status });
  return data as T;
}

// Org courante (défini au login ou via ?org=slug)
let _orgId: string | null = null;
export function setCurrentOrgId(id: string | null): void { _orgId = id; }
export function getCurrentOrgId(): string | null { return _orgId; }

// ─── Demo state ───────────────────────────────────────────────────────────────
export const demoState = {
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
  signUp:         () => Promise.resolve({ user: { id: "demo" } }),
  signIn:         () => Promise.resolve({ user: { id: "demo" } }),
  signOut:        () => Promise.resolve(),
  getSession:     () => Promise.resolve({ user: { id: "demo", email: "demo@demo.com" } }),
  onAuthChange:   () => ({ unsubscribe: () => {} }),
  resetPassword:  () => Promise.resolve(),
  updatePassword:  () => Promise.resolve(),
  deleteAccount:   () => Promise.resolve(),
  createOrg:    (name, slug) => Promise.resolve({ id: "demo-org", name, slug }),
  getMyOrg:     () => Promise.resolve({ id: "demo-org", name: "Demo", slug: "demo", role: "admin" }),
  getMyOrgs:    () => Promise.resolve([{ id: "demo-org", name: "Demo", slug: "demo", role: "admin" }]),
  getOrgBySlug: () => Promise.resolve({ id: "demo-org", name: "Demo", slug: "demo" }),
  getOrgMembers: () => Promise.resolve([] as OrgMember[]),
  addMember:    () => Promise.resolve(),
  removeMember: () => Promise.resolve(),
  selfJoinOrg:  () => Promise.resolve(),

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
  updatePlayer: (id, data) => {
    demoState.players = demoState.players.map(p => p.id === id ? { ...p, ...data } : p);
    return Promise.resolve(true);
  },
  linkPlayer: (_playerId) => Promise.resolve(true),
  getActiveMatch: () => Promise.resolve(
    demoState.matches.find(m => m.is_open || m.phase === "counting") ?? null
  ),
  getMatches:     () => Promise.resolve([...demoState.matches].reverse()),
  createMatch: (label, presentIds, teamId, season, pepiteCount) => {
    const m: Match = {
      id: demoState.nextId++, label, present_ids: presentIds,
      is_open: true, phase: "voting", reveal_order: [], revealed_count: 0,
      season: season || demoState.currentSeason, team_id: teamId ?? null,
      created_at: new Date().toISOString(),
      pepite_count: pepiteCount ?? 2,
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
  hasVoted:         (matchId, voterName, voterPlayerId) => Promise.resolve(
    demoState.votes.some(v => v.match_id === matchId && (
      voterPlayerId != null
        // own prior vote (chip selected) OR own legacy name-only vote
        ? v.voter_player_id === voterPlayerId || (v.voter_player_id == null && v.voter_name === voterName)
        : v.voter_name === voterName
    ))
  ),
  getVoteCount:     (matchId) => Promise.resolve(demoState.votes.filter(v => v.match_id === matchId).length),
  submitVote:       (vote) => { demoState.votes.push({ ...vote, id: demoState.nextId++ }); return Promise.resolve(); },
  getVotes:         (matchId) => Promise.resolve(demoState.votes.filter(v => v.match_id === matchId)),
  getAllVotes:       () => Promise.resolve([...demoState.votes]),
  getTeams:         () => Promise.resolve([...demoState.teams]),
  createTeam:       (name, playerIds) => {
    const t: Team = { id: demoState.nextId++, name, player_ids: playerIds };
    demoState.teams.push(t);
    return Promise.resolve(t);
  },
  updateTeam: (id, playerIds) => {
    demoState.teams = demoState.teams.map(t => t.id === id ? { ...t, player_ids: playerIds } : t);
    return Promise.resolve(true);
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

  // Push notifications (no-op stubs in demo mode)
  subscribePush:   () => Promise.resolve(),
  unsubscribePush: () => Promise.resolve(),
};

// ─── Real API ─────────────────────────────────────────────────────────────────
export const realAPI: API = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  signOut: async () => {
    await supabase.auth.signOut();
  },
  getSession: async (): Promise<UserSession | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session as UserSession | null;
  },
  onAuthChange: (callback) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => callback(event, session as UserSession | null)
    );
    return subscription;
  },
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw new Error(error.message);
  },
  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },
  deleteAccount: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Non connecté');
    const res = await fetch('/api/delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Erreur ${res.status}`);
    }
    // Sign out locally after deletion
    await supabase.auth.signOut();
  },

  // ── Organisations ─────────────────────────────────────────────────────────
  createOrg: async (name, slug) => {
    const suffix = () => Math.random().toString(36).slice(2, 6);
    const candidates = [slug, `${slug}-${suffix()}`, `${slug}-${suffix()}`];

    let finalSlug: string | null = null;
    for (const s of candidates) {
      const { error } = await rpcWithTimeout(() =>
        supabase.rpc("create_organization", { org_name: name, org_slug: s })
      );
      if (!error) { finalSlug = s; break; }
      const isDuplicate = error.message?.includes("unique") || error.message?.includes("duplicate") || (error as { code?: string }).code === "23505";
      if (!isDuplicate) throw new Error(error.message);
    }
    if (!finalSlug) throw new Error("Impossible de créer l'équipe, réessayez.");

    const { data: rows, error: fetchErr } = await supabase.from("organizations").select("*").eq("slug", finalSlug);
    if (fetchErr) throw new Error(fetchErr.message);
    const org = rows?.[0] as Org | undefined;
    if (!org?.id) throw new Error("Erreur création organisation");
    return org;
  },
  getMyOrgs: async (): Promise<Org[]> => {
    // 1. Try the RPC (fastest path — single round-trip, includes role)
    try {
      const { data, error } = await rpcWithTimeout(() => supabase.rpc("get_my_orgs"), 8000);
      if (!error) return (data as Org[]) || [];
      // RPC exists but returned a PostgREST error → fall through to REST
      console.warn("get_my_orgs RPC error, fallback REST:", error.message);
    } catch (rpcErr) {
      // Timeout / network error / function not found → fall through to REST
      console.warn("get_my_orgs RPC indisponible, fallback REST:", (rpcErr as Error).message);
    }

    // 2. REST fallback — 1 retry (2 attempts × 10 s = 20 s max), designed to
    //    fit inside the 30 s hard-timeout in useAuth so a cold-start wake-up has
    //    a real chance to succeed on the second attempt.
    return withRetry(async () => {
      // 2a. Fetch memberships (try with role column, fall back to without)
      let members: Array<{ org_id: string; role?: string }>;
      const { data: m1, error: e1 } = await supabase.from("org_members").select("org_id,role");
      if (!e1 && m1) {
        members = m1 as typeof members;
      } else {
        const { data: m2, error: e2 } = await supabase.from("org_members").select("org_id");
        if (e2) throw new Error(e2.message);
        members = (m2 || []).map((r: { org_id: string }) => ({ org_id: r.org_id, role: "admin" }));
      }

      if (!members.length) return [];

      // 2b. Fetch org details
      const { data: orgs, error: orgsErr } = await supabase
        .from("organizations").select("*").in("id", members.map(m => m.org_id));
      if (orgsErr) throw new Error(orgsErr.message);

      return members.map(m => {
        const org = (orgs || []).find((o: Org) => o.id === m.org_id);
        return org ? { ...org, role: (m.role || "admin") as 'admin' | 'voter' } as Org : null;
      }).filter((o): o is Org => o != null);
    }, 1);   // 1 retry = 2 attempts max
  },
  getMyOrg: async () => {
    const orgs = await realAPI.getMyOrgs();
    return orgs.find(o => o.role === "admin") || orgs[0] || null;
  },
  getOrgMembers: (orgId) =>
    withRetry(async () => {
      const { data, error } = await rpcWithTimeout(() =>
        supabase.rpc("get_org_members", { target_org_id: orgId })
      );
      if (error) throw new Error(error.message);
      return (data as OrgMember[]) || [];
    }),
  addMember: async (email, orgId, role = "voter") => {
    const { error } = await rpcWithTimeout(() =>
      supabase.rpc("add_org_member", { member_email: email, target_org_id: orgId, member_role: role })
    );
    if (error) throw new Error(error.message);
  },
  removeMember: async (userId, orgId) => {
    const { error } = await supabase.from("org_members").delete().eq("user_id", userId).eq("org_id", orgId);
    if (error) throw new Error(error.message);
    return true;
  },
  selfJoinOrg: async (orgId) => {
    // Called when an anonymous voter signs up via the ?org= link.
    // Inserts the current user as a voter member of the org they just voted in.
    // Requires an RLS policy: "authenticated users can insert their own voter membership".
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { error } = await supabase.from('org_members').insert({
      org_id:  orgId,
      user_id: user.id,
      role:    'voter',
    });
    // Ignore duplicate-membership errors (already a member is fine)
    if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
      throw new Error(error.message);
    }
  },
  getOrgBySlug: async (slug) => {
    const { data, error } = await supabase.from("organizations").select("*").eq("slug", slug);
    if (error) throw new Error(error.message);
    return (data?.[0] as Org) ?? null;
  },

  // ── Joueurs ───────────────────────────────────────────────────────────────
  getPlayers: () =>
    withRetry(async () => {
      return await run<Player[]>(supabase.from("players").select("*").eq("org_id", _orgId).order("name"));
    }),
  // No withRetry: a retried INSERT after a timeout would duplicate the player.
  addPlayer: async (name) => {
    const rows = await run<Player[]>(supabase.from("players").insert({ name, org_id: _orgId }).select());
    return rows[0];
  },
  removePlayer: async (id) => {
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },
  updatePlayer: (id, data) =>
    withRetry(async () => {
      const { error } = await supabase.from("players").update(data).eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    }),
  linkPlayer: (playerId) =>
    withRetry(async () => {
      // Links the current authenticated user to a player record they claim is them.
      // RLS policy on players ensures user_id must be null (unclaimed) first.
      const { error } = await supabase.from("players").update({ user_id: (await supabase.auth.getUser()).data.user?.id ?? null }).eq("id", playerId).is("user_id", null);
      if (error) throw new Error(error.message);
      return true;
    }),

  // ── Matchs ────────────────────────────────────────────────────────────────
  getActiveMatch: () =>
    withRetry(async () => {
      const { data, error } = await supabase.from("matches").select("*")
        .or("is_open.eq.true,phase.eq.counting")
        .eq("org_id", _orgId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data?.[0] as Match) ?? null;
    }),
  getMatches: () =>
    withRetry(async () => {
      return await run<Match[]>(
        supabase.from("matches").select("*").eq("org_id", _orgId).order("created_at", { ascending: false })
      );
    }),
  // No withRetry: a retried INSERT after a timeout would open a second match.
  createMatch: async (label, presentIds, teamId, season, pepiteCount) => {
    const rows = await run<Match[]>(
      supabase.from("matches").insert({
        label, present_ids: presentIds, is_open: true, phase: "voting",
        team_id: teamId ?? null, season: season || 1, org_id: _orgId,
        ...(pepiteCount === 3 ? { pepite_count: 3 } : {}),
      }).select()
    );
    return rows[0];
  },
  closeMatch: (id) =>
    withRetry(async () => {
      const { error } = await supabase.from("matches").update({ is_open: false, phase: "closed" }).eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    }),
  startCounting: (id, order) =>
    withRetry(async () => {
      const { error } = await supabase.from("matches")
        .update({ is_open: false, phase: "counting", reveal_order: order, revealed_count: 0 })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    }),
  revealNext: (id, count) =>
    withRetry(async () => {
      const { error } = await supabase.from("matches").update({ revealed_count: count }).eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    }),
  updateMatch: async (id, data) => {
    const { error } = await supabase.from("matches").update(data).eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },
  deleteMatch: async (id) => {
    const { error: e1 } = await supabase.from("votes").delete().eq("match_id", id);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.from("matches").delete().eq("id", id);
    if (e2) throw new Error(e2.message);
    return true;
  },
  getMatchById: (id) =>
    withRetry(async () => {
      const { data, error } = await supabase.from("matches").select("*").eq("id", id);
      if (error) throw new Error(error.message);
      return (data?.[0] as Match) ?? null;
    }),

  // ── Saison ────────────────────────────────────────────────────────────────
  // Le compteur de saison vit sur organizations.current_season ; les noms de
  // saison sur la table season_names (org_id, season, name). Cf. migration
  // 20260004_seasons.sql.
  getCurrentSeason: () =>
    withRetry(async () => {
      const { data, error } = await supabase.from("organizations")
        .select("current_season").eq("id", _orgId).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as { current_season: number } | null)?.current_season ?? 1;
    }).catch((err) => {
      // Lecture best-effort : ne doit pas casser le rendu, mais une panne réelle
      // doit être visible (sinon indistinguable d'une saison 1 légitime).
      console.error("getCurrentSeason failed, defaulting to 1:", (err as Error).message);
      return 1;
    }),
  advanceSeason: () =>
    withRetry(async () => {
      // Un seul admin fait avancer une saison quelques fois par an :
      // read-modify-write acceptable (pas de contention réaliste).
      const cur  = await realAPI.getCurrentSeason();
      const rows = await run<{ current_season: number }[]>(
        supabase.from("organizations")
          .update({ current_season: cur + 1 })
          .eq("id", _orgId)
          .select("current_season"),
      );
      return rows[0]?.current_season ?? cur + 1;
    }),
  getSeasonName: (season) =>
    withRetry(async () => {
      const { data, error } = await supabase.from("season_names")
        .select("name").eq("org_id", _orgId).eq("season", season).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as { name: string } | null)?.name ?? null;
    }).catch((err) => {
      console.error("getSeasonName failed:", (err as Error).message);
      return null;
    }),
  setSeasonName: (season, name) =>
    withRetry(async () => {
      await run(
        supabase.from("season_names")
          .upsert({ org_id: _orgId, season, name }, { onConflict: "org_id,season" }),
      );
    }),

  // ── Votes ─────────────────────────────────────────────────────────────────
  // The votes table is not directly selectable (RLS) — reads go through
  // SECURITY DEFINER RPCs. See migration 20260008.
  hasVoted: (matchId, voterName, voterPlayerId) =>
    withRetry(() => run<boolean>(supabase.rpc("has_voted", {
      target_match_id:   matchId,
      p_voter_name:      voterName,
      p_voter_player_id: voterPlayerId ?? null,
    }))),
  getVoteCount: (matchId) =>
    withRetry(() => run<number>(
      supabase.rpc("get_match_vote_count", { target_match_id: matchId }),
    )),
  submitVote: async (vote) => {
    // Strip undefined fields before insert — optional columns like best3_id /
    // best3_comment must not appear in the payload when they are absent, or
    // PostgREST returns "column not found in schema cache".
    const payload = Object.fromEntries(
      Object.entries(vote as unknown as Record<string, unknown>).filter(([, v]) => v !== undefined),
    );
    const { error } = await supabase.from("votes").insert(payload);
    if (!error) return;
    if ((error as { code?: string }).code === '23505'
      || error.message?.includes('409')
      || error.message?.includes('duplicate')
      || error.message?.includes('unique')) {
      return;
    }
    throw new Error(error.message);
  },
  // The org slug authorises anonymous ?org= voters (migration 20260010);
  // members are authorised by their membership and may omit it.
  getVotes: (matchId, orgSlug) =>
    withRetry(() => run<Vote[]>(
      supabase.rpc("get_match_votes", { target_match_id: matchId, p_org_slug: orgSlug || null }),
    ).then(v => v ?? [])),
  getAllVotes: () =>
    withRetry(() => run<Vote[]>(
      supabase.rpc("get_all_votes", { target_org_id: _orgId }),
    ).then(v => v ?? [])),

  // ── Équipes ───────────────────────────────────────────────────────────────
  getTeams: () =>
    withRetry(() => run<Team[]>(
      supabase.from("teams").select("*").eq("org_id", _orgId).order("name")
    )),
  createTeam: async (name, playerIds) => {
    const rows = await run<Team[]>(
      supabase.from("teams").insert({ name, player_ids: playerIds, org_id: _orgId }).select()
    );
    return rows[0];
  },
  updateTeam: async (id, playerIds) => {
    const { error } = await supabase.from("teams").update({ player_ids: playerIds }).eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },
  deleteTeam: async (id) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },

  // ── Guest tokens ──────────────────────────────────────────────────────────
  createGuestToken: async (name, matchId) => {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    await run(supabase.from("guest_tokens").insert({ token, name, match_id: matchId, org_id: _orgId }));
    return token;
  },
  getGuestTokens: (matchId) =>
    withRetry(() => run<GuestToken[]>(
      supabase.from("guest_tokens").select("*").eq("match_id", matchId).order("created_at")
    )),
  validateGuestToken: async (token) => {
    const { data, error } = await supabase.from("guest_tokens").select("*").eq("token", token);
    if (error) throw new Error(error.message);
    return (data?.[0] as GuestToken) ?? null;
  },
  useGuestToken: async (token) => {
    const { error } = await supabase.from("guest_tokens").update({ used: true }).eq("token", token);
    if (error) throw new Error(error.message);
    return true;
  },
  deleteGuestToken: async (id) => {
    const { error } = await supabase.from("guest_tokens").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },

  // ── Push subscriptions ────────────────────────────────────────────────────
  subscribePush: async (orgId, sub) => {
    const keys = sub.keys as { p256dh?: string; auth?: string } | undefined;
    if (!sub.endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error('Subscription invalide');
    }
    // user_id is NOT NULL and the unique key is (user_id, org_id, endpoint) —
    // both were missing, so every insert failed (23502 then 42P10).
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: user.id, org_id: orgId, endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'user_id,org_id,endpoint' },
    );
    if (error) throw new Error(error.message);
  },
  unsubscribePush: async (orgId, endpoint) => {
    const { error } = await supabase.from('push_subscriptions')
      .delete()
      .eq('org_id', orgId)
      .eq('endpoint', endpoint);
    if (error) throw new Error(error.message);
  },
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
