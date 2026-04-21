import { SUPABASE_URL } from './config.js';
import { supabase, authClient } from './supabaseClient.js';

export const DEMO_MODE = SUPABASE_URL.includes("VOTRE_PROJET");

// Org courante (défini au login ou via ?org=slug)
let _orgId = null;
export function setCurrentOrgId(id) { _orgId = id; }
export function getCurrentOrgId()   { return _orgId; }

// ─── Demo state ───────────────────────────────────────────────────────────────
export let demoState = {
  players: [
    { id: 1, name: "Antoine" }, { id: 2, name: "Baptiste" },
    { id: 3, name: "Clément" }, { id: 4, name: "David" },
    { id: 5, name: "Étienne" }, { id: 6, name: "Florian" },
    { id: 7, name: "Guillaume" }, { id: 8, name: "Hugo" },
    { id: 9, name: "Julien" }, { id: 10, name: "Kevin" },
  ],
  matches: [], votes: [], teams: [], guestTokens: [], nextId: 100, currentSeason: 1,
};

export const demoAPI = {
  // Auth (stubs pour le mode démo)
  signUp:       () => Promise.resolve({ user: { id: "demo" } }),
  signIn:       () => Promise.resolve({ user: { id: "demo" } }),
  signOut:      () => Promise.resolve(),
  getSession:   () => Promise.resolve({ user: { id: "demo", email: "demo@demo.com" } }),
  onAuthChange: ()  => ({ unsubscribe: () => {} }),
  createOrg:    (name, slug) => Promise.resolve({ id: "demo-org", name, slug }),
  getMyOrg:     () => Promise.resolve({ id: "demo-org", name: "Demo", slug: "demo" }),
  getOrgBySlug: () => Promise.resolve({ id: "demo-org", name: "Demo", slug: "demo" }),

  // Données
  getPlayers:     () => Promise.resolve([...demoState.players]),
  addPlayer:      (name) => { const p = { id: demoState.nextId++, name }; demoState.players.push(p); return Promise.resolve(p); },
  removePlayer:   (id)   => { demoState.players = demoState.players.filter(p => p.id !== id); return Promise.resolve(true); },
  getActiveMatch: ()     => Promise.resolve(demoState.matches.find(m => m.is_open) || null),
  getMatches:     ()     => Promise.resolve([...demoState.matches].reverse()),
  createMatch: (label, presentIds, teamId, season) => {
    const m = { id: demoState.nextId++, label, present_ids: presentIds, is_open: true, phase: "voting", reveal_order: [], revealed_count: 0, season: season || demoState.currentSeason, team_id: teamId || null, created_at: new Date().toISOString() };
    demoState.matches.push(m); return Promise.resolve(m);
  },
  closeMatch:       (id)        => { const m = demoState.matches.find(m => m.id === id); if (m) { m.is_open = false; m.phase = "closed"; } return Promise.resolve(true); },
  startCounting:    (id, order) => { const m = demoState.matches.find(m => m.id === id); if (m) { m.phase = "counting"; m.reveal_order = order; m.revealed_count = 0; } return Promise.resolve(true); },
  revealNext:       (id, count) => { const m = demoState.matches.find(m => m.id === id); if (m) m.revealed_count = count; return Promise.resolve(true); },
  updateMatch:      (id, data)  => { const m = demoState.matches.find(m => m.id === id); if (m) Object.assign(m, data); return Promise.resolve(true); },
  deleteMatch:      (id)        => { demoState.matches = demoState.matches.filter(m => m.id !== id); demoState.votes = demoState.votes.filter(v => v.match_id !== id); return Promise.resolve(true); },
  getCurrentSeason: () => Promise.resolve(demoState.currentSeason),
  advanceSeason:    () => { demoState.currentSeason++; return Promise.resolve(demoState.currentSeason); },
  hasVoted:         (matchId, voterName) => Promise.resolve(demoState.votes.some(v => v.match_id === matchId && v.voter_name === voterName)),
  submitVote:       (vote) => { demoState.votes.push({ ...vote, id: demoState.nextId++ }); return Promise.resolve(true); },
  getVotes:         (matchId) => Promise.resolve(demoState.votes.filter(v => v.match_id === matchId)),
  getAllVotes:       ()        => Promise.resolve([...demoState.votes]),
  getTeams:         ()        => Promise.resolve([...demoState.teams]),
  createTeam:       (name, playerIds) => { const t = { id: demoState.nextId++, name, player_ids: playerIds }; demoState.teams.push(t); return Promise.resolve(t); },
  deleteTeam:       (id)      => { demoState.teams = demoState.teams.filter(t => t.id !== id); return Promise.resolve(true); },
  createGuestToken: (name, matchId) => {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    demoState.guestTokens.push({ id: demoState.nextId++, token, name, match_id: matchId, used: false, created_at: new Date().toISOString() });
    return Promise.resolve(token);
  },
  getGuestTokens:     (matchId) => Promise.resolve(demoState.guestTokens.filter(t => t.match_id === matchId)),
  validateGuestToken: (token)   => Promise.resolve(demoState.guestTokens.find(t => t.token === token) || null),
  useGuestToken:      (token)   => { const t = demoState.guestTokens.find(t => t.token === token); if (t) t.used = true; return Promise.resolve(true); },
  deleteGuestToken:   (id)      => { demoState.guestTokens = demoState.guestTokens.filter(t => t.id !== id); return Promise.resolve(true); },
  getMatchById:       (id)      => Promise.resolve(demoState.matches.find(m => m.id === id) || null),
};

// ─── Real API ─────────────────────────────────────────────────────────────────
export const realAPI = {
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
  getSession: async () => {
    const { data: { session } } = await authClient.auth.getSession();
    return session;
  },
  onAuthChange: (callback) => {
    const { data: { subscription } } = authClient.auth.onAuthStateChange(callback);
    return subscription;
  },

  // ── Organisations ─────────────────────────────────────────────────────────
  createOrg: async (name, slug) => {
    const { data: { session } } = await authClient.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Non authentifié");

    // 1. Créer l'org
    const db = await supabase.from("organizations");
    const orgs = await db.insert({ name, slug, owner_id: userId });
    const org = Array.isArray(orgs) ? orgs[0] : orgs;
    if (!org?.id) throw new Error("Erreur création organisation");

    // 2. Ajouter l'utilisateur comme owner
    const mdb = await supabase.from("org_members");
    await mdb.insert({ org_id: org.id, user_id: userId, role: "owner" });

    return org;
  },
  getMyOrg: async () => {
    // Récupère l'org du user connecté via org_members
    const mdb = await supabase.from("org_members");
    const members = await mdb.select("org_id", {});
    if (!members?.length) return null;
    const orgId = members[0].org_id;
    const odb = await supabase.from("organizations");
    const orgs = await odb.select("*", { filter: `id=eq.${orgId}` });
    return orgs[0] || null;
  },
  getOrgBySlug: async (slug) => {
    const db = await supabase.from("organizations");
    const orgs = await db.select("*", { filter: `slug=eq.${slug}` });
    return orgs[0] || null;
  },

  // ── Joueurs ───────────────────────────────────────────────────────────────
  getPlayers: async () => {
    const db = await supabase.from("players");
    return db.select("*", { filter: `org_id=eq.${_orgId}`, order: "name.asc" });
  },
  addPlayer: async (name) => {
    const db = await supabase.from("players");
    const r = await db.insert({ name, org_id: _orgId });
    return Array.isArray(r) ? r[0] : r;
  },
  removePlayer: async (id) => {
    const db = await supabase.from("players");
    return db.delete(`id=eq.${id}`);
  },

  // ── Matchs ────────────────────────────────────────────────────────────────
  getActiveMatch: async () => {
    const db = await supabase.from("matches");
    const r = await db.select("*", { filter: `is_open=eq.true&org_id=eq.${_orgId}`, order: "created_at.desc" });
    return Array.isArray(r) ? (r[0] || null) : null;
  },
  getMatches: async () => {
    const db = await supabase.from("matches");
    return db.select("*", { filter: `org_id=eq.${_orgId}`, order: "created_at.desc" });
  },
  createMatch: async (label, presentIds, teamId, season) => {
    const db = await supabase.from("matches");
    const r = await db.insert({ label, present_ids: presentIds, is_open: true, phase: "voting", team_id: teamId || null, season: season || 1, org_id: _orgId });
    return Array.isArray(r) ? r[0] : r;
  },
  closeMatch:    async (id) => { const db = await supabase.from("matches"); return db.update({ is_open: false, phase: "closed" }, `id=eq.${id}`); },
  startCounting: async (id, order) => { const db = await supabase.from("matches"); return db.update({ phase: "counting", reveal_order: order, revealed_count: 0 }, `id=eq.${id}`); },
  revealNext:    async (id, count) => { const db = await supabase.from("matches"); return db.update({ revealed_count: count }, `id=eq.${id}`); },
  updateMatch:   async (id, data)  => { const db = await supabase.from("matches"); return db.update(data, `id=eq.${id}`); },
  deleteMatch:   async (id) => {
    const vdb = await supabase.from("votes");
    await vdb.delete(`match_id=eq.${id}`);
    const db = await supabase.from("matches");
    return db.delete(`id=eq.${id}`);
  },
  getMatchById: async (id) => {
    const db = await supabase.from("matches");
    const r = await db.select("*", { filter: `id=eq.${id}` });
    return Array.isArray(r) ? (r[0] || null) : null;
  },

  // ── Saison ────────────────────────────────────────────────────────────────
  getCurrentSeason: async () => {
    try {
      const db = await supabase.from("settings");
      const r = await db.select("value", { filter: `key=eq.current_season&org_id=eq.${_orgId}` });
      return parseInt(r[0]?.value || "1");
    } catch { return 1; }
  },
  advanceSeason: async () => {
    const cur = await realAPI.getCurrentSeason();
    const next = cur + 1;
    const db = await supabase.from("settings");
    const updated = await db.update({ value: String(next) }, `key=eq.current_season&org_id=eq.${_orgId}`);
    if (!Array.isArray(updated) || updated.length === 0) {
      await db.insert({ key: "current_season", value: String(next), org_id: _orgId });
    }
    return next;
  },

  // ── Votes ─────────────────────────────────────────────────────────────────
  hasVoted: async (matchId, voterName) => {
    const db = await supabase.from("votes");
    const r = await db.select("id", { filter: `match_id=eq.${matchId}&voter_name=eq.${encodeURIComponent(voterName)}` });
    return Array.isArray(r) && r.length > 0;
  },
  submitVote: async (vote) => {
    const db = await supabase.from("votes");
    return db.insert(vote);
  },
  getVotes: async (matchId) => {
    const db = await supabase.from("votes");
    return db.select("*", { filter: `match_id=eq.${matchId}` });
  },
  getAllVotes: async () => {
    // Votes isolés via les matchs de l'org
    const matches = await realAPI.getMatches();
    if (!matches?.length) return [];
    const ids = matches.map(m => m.id).join(",");
    const db = await supabase.from("votes");
    return db.select("*", { filter: `match_id=in.(${ids})` });
  },

  // ── Équipes ───────────────────────────────────────────────────────────────
  getTeams: async () => {
    const db = await supabase.from("teams");
    return db.select("*", { filter: `org_id=eq.${_orgId}`, order: "name.asc" });
  },
  createTeam: async (name, playerIds) => {
    const db = await supabase.from("teams");
    const r = await db.insert({ name, player_ids: playerIds, org_id: _orgId });
    return Array.isArray(r) ? r[0] : r;
  },
  deleteTeam: async (id) => {
    const db = await supabase.from("teams");
    return db.delete(`id=eq.${id}`);
  },

  // ── Guest tokens ──────────────────────────────────────────────────────────
  createGuestToken: async (name, matchId) => {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const db = await supabase.from("guest_tokens");
    await db.insert({ token, name, match_id: matchId, org_id: _orgId });
    return token;
  },
  getGuestTokens: async (matchId) => {
    const db = await supabase.from("guest_tokens");
    return db.select("*", { filter: `match_id=eq.${matchId}`, order: "created_at.asc" });
  },
  validateGuestToken: async (token) => {
    const db = await supabase.from("guest_tokens");
    const r = await db.select("*", { filter: `token=eq.${token}` });
    return Array.isArray(r) ? (r[0] || null) : null;
  },
  useGuestToken: async (token) => {
    const db = await supabase.from("guest_tokens");
    return db.update({ used: true }, `token=eq.${token}`);
  },
  deleteGuestToken: async (id) => {
    const db = await supabase.from("guest_tokens");
    return db.delete(`id=eq.${id}`);
  },
};

export const api = DEMO_MODE ? demoAPI : realAPI;

// ─── Reset pour les tests ─────────────────────────────────────────────────────
export function __resetDemoState() {
  demoState.players = [
    { id: 1, name: "Antoine" }, { id: 2, name: "Baptiste" },
    { id: 3, name: "Clément" }, { id: 4, name: "David" },
    { id: 5, name: "Étienne" }, { id: 6, name: "Florian" },
    { id: 7, name: "Guillaume" }, { id: 8, name: "Hugo" },
    { id: 9, name: "Julien" }, { id: 10, name: "Kevin" },
  ];
  demoState.matches     = [];
  demoState.votes       = [];
  demoState.teams       = [];
  demoState.guestTokens = [];
  demoState.nextId      = 100;
  demoState.currentSeason = 1;
}

export { demoAPI as __demoAPI };
