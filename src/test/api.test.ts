import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import {
  realAPI, demoAPI, demoState,
  setCurrentOrgId, __resetDemoState as resetDemo,
} from '@/api';
import type { Match } from '@/types';

const BASE = 'https://VOTRE_PROJET.supabase.co/rest/v1';

// ── demoAPI ──────────────────────────────────────────────────────────────────
// In-memory: no network, no MSW — just state mutation + assertion.

describe('demoAPI', () => {
  beforeEach(() => resetDemo());

  // ── Players ──

  it('getPlayers returns the initial 10 players', async () => {
    const p = await demoAPI.getPlayers();
    expect(p).toHaveLength(10);
    expect(p[0].name).toBe('Antoine');
  });

  it('addPlayer adds a player and returns it', async () => {
    const p = await demoAPI.addPlayer('Zara');
    expect(p.name).toBe('Zara');
    expect((await demoAPI.getPlayers())).toHaveLength(11);
  });

  it('removePlayer removes a player by id', async () => {
    await demoAPI.removePlayer(1);
    expect((await demoAPI.getPlayers())).toHaveLength(9);
    expect((await demoAPI.getPlayers()).find(p => p.id === 1)).toBeUndefined();
  });

  // ── Matches ──

  it('getActiveMatch returns null when no match exists', async () => {
    expect(await demoAPI.getActiveMatch()).toBeNull();
  });

  it('createMatch creates an open voting match', async () => {
    const m = await demoAPI.createMatch('vs Dragons', [1, 2], null, 1);
    expect(m.label).toBe('vs Dragons');
    expect(m.is_open).toBe(true);
    expect(m.phase).toBe('voting');
    expect(m.present_ids).toEqual([1, 2]);
  });

  it('getActiveMatch returns the open match', async () => {
    await demoAPI.createMatch('vs Dragons', [1, 2], null, 1);
    expect((await demoAPI.getActiveMatch())?.label).toBe('vs Dragons');
  });

  it('getMatchById returns the match for a known id', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    expect((await demoAPI.getMatchById(m.id))?.label).toBe('test');
  });

  it('getMatchById returns null for unknown id', async () => {
    expect(await demoAPI.getMatchById(9999)).toBeNull();
  });

  it('closeMatch marks match as closed', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    await demoAPI.closeMatch(m.id);
    expect(await demoAPI.getActiveMatch()).toBeNull();
    expect((await demoAPI.getMatches())[0].phase).toBe('closed');
  });

  it('startCounting switches to counting phase with reveal order', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    await demoAPI.startCounting(m.id, [10, 11]);
    const active = await demoAPI.getActiveMatch();
    expect(active?.phase).toBe('counting');
    expect(active?.reveal_order).toEqual([10, 11]);
    expect(active?.revealed_count).toBe(0);
  });

  it('revealNext updates revealed_count', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    await demoAPI.startCounting(m.id, [10, 11]);
    await demoAPI.revealNext(m.id, 1);
    expect((await demoAPI.getMatches())[0].revealed_count).toBe(1);
  });

  it('updateMatch updates arbitrary fields', async () => {
    const m = await demoAPI.createMatch('old', [1, 2], null, 1);
    await demoAPI.updateMatch(m.id, { label: 'new label' });
    expect((await demoAPI.getMatches())[0].label).toBe('new label');
  });

  it('deleteMatch removes the match and all its votes', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    await demoAPI.submitVote({ match_id: m.id, voter_name: 'Alice', best1_id: 1, lemon_id: 2 });
    await demoAPI.deleteMatch(m.id);
    expect(await demoAPI.getMatches()).toHaveLength(0);
    expect(demoState.votes).toHaveLength(0);
  });

  // ── Votes ──

  it('hasVoted returns false before voting', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    expect(await demoAPI.hasVoted(m.id, 'Alice')).toBe(false);
  });

  it('submitVote records the vote and hasVoted returns true', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    await demoAPI.submitVote({ match_id: m.id, voter_name: 'Alice', best1_id: 1, lemon_id: 2 });
    expect(await demoAPI.hasVoted(m.id, 'Alice')).toBe(true);
    expect(await demoAPI.hasVoted(m.id, 'Bob')).toBe(false);
  });

  it('getVotes returns only votes for the given match', async () => {
    const m1 = await demoAPI.createMatch('m1', [1, 2], null, 1);
    const m2 = await demoAPI.createMatch('m2', [1, 2], null, 1);
    await demoAPI.submitVote({ match_id: m1.id, voter_name: 'Alice', best1_id: 1, lemon_id: 2 });
    await demoAPI.submitVote({ match_id: m2.id, voter_name: 'Bob',   best1_id: 2, lemon_id: 1 });
    expect(await demoAPI.getVotes(m1.id)).toHaveLength(1);
    expect((await demoAPI.getVotes(m1.id))[0].voter_name).toBe('Alice');
  });

  it('getAllVotes returns votes across all matches', async () => {
    const m1 = await demoAPI.createMatch('m1', [1, 2], null, 1);
    const m2 = await demoAPI.createMatch('m2', [1, 2], null, 1);
    await demoAPI.submitVote({ match_id: m1.id, voter_name: 'Alice', best1_id: 1, lemon_id: 2 });
    await demoAPI.submitVote({ match_id: m2.id, voter_name: 'Bob',   best1_id: 2, lemon_id: 1 });
    expect(await demoAPI.getAllVotes()).toHaveLength(2);
  });

  // ── Teams ──

  it('getTeams returns empty initially', async () => {
    expect(await demoAPI.getTeams()).toHaveLength(0);
  });

  it('createTeam creates a team with correct player_ids', async () => {
    const t = await demoAPI.createTeam('Team A', [1, 2, 3]);
    expect(t.name).toBe('Team A');
    expect(t.player_ids).toEqual([1, 2, 3]);
  });

  it('deleteTeam removes the team', async () => {
    const t = await demoAPI.createTeam('Team A', [1, 2]);
    await demoAPI.deleteTeam(t.id);
    expect(await demoAPI.getTeams()).toHaveLength(0);
  });

  // ── Season ──

  it('getCurrentSeason returns 1 initially', async () => {
    expect(await demoAPI.getCurrentSeason()).toBe(1);
  });

  it('advanceSeason increments and returns the new season', async () => {
    expect(await demoAPI.advanceSeason()).toBe(2);
    expect(await demoAPI.getCurrentSeason()).toBe(2);
  });

  it('setSeasonName and getSeasonName round-trip', async () => {
    await demoAPI.setSeasonName(1, 'Hiver 2024');
    expect(await demoAPI.getSeasonName(1)).toBe('Hiver 2024');
    expect(await demoAPI.getSeasonName(2)).toBeNull();
  });

  // ── Guest tokens ──

  it('createGuestToken returns a non-empty token string', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    const token = await demoAPI.createGuestToken('Marc', m.id);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('validateGuestToken returns the GuestToken object', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    const token = await demoAPI.createGuestToken('Marc', m.id);
    const gt = await demoAPI.validateGuestToken(token);
    expect(gt?.name).toBe('Marc');
    expect(gt?.used).toBe(false);
  });

  it('validateGuestToken returns null for unknown token', async () => {
    expect(await demoAPI.validateGuestToken('nope')).toBeNull();
  });

  it('useGuestToken marks the token as used', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    const token = await demoAPI.createGuestToken('Marc', m.id);
    await demoAPI.useGuestToken(token);
    expect((await demoAPI.validateGuestToken(token))?.used).toBe(true);
  });

  it('getGuestTokens returns tokens for the match', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    await demoAPI.createGuestToken('Marc', m.id);
    await demoAPI.createGuestToken('Julie', m.id);
    expect(await demoAPI.getGuestTokens(m.id)).toHaveLength(2);
  });

  it('deleteGuestToken removes the token', async () => {
    const m = await demoAPI.createMatch('test', [1, 2], null, 1);
    await demoAPI.createGuestToken('Marc', m.id);
    const [gt] = await demoAPI.getGuestTokens(m.id);
    await demoAPI.deleteGuestToken(gt.id);
    expect(await demoAPI.getGuestTokens(m.id)).toHaveLength(0);
  });

  // ── Auth stubs ──

  it('auth stubs resolve without throwing', async () => {
    await expect(demoAPI.signOut()).resolves.toBeUndefined();
    await expect(demoAPI.getSession()).resolves.toBeDefined();
    expect(demoAPI.onAuthChange(() => {})).toHaveProperty('unsubscribe');
  });

  it('signUp and signIn stubs resolve with user data', async () => {
    const s = await demoAPI.signUp('a@b.com', 'pw');
    expect(s).toMatchObject({ user: { id: 'demo' } });
    const i = await demoAPI.signIn('a@b.com', 'pw');
    expect(i).toMatchObject({ user: { id: 'demo' } });
  });

  it('org stubs all resolve without throwing', async () => {
    await expect(demoAPI.createOrg('Test', 'test')).resolves.toMatchObject({ id: 'demo-org' });
    await expect(demoAPI.getMyOrg()).resolves.toMatchObject({ id: 'demo-org' });
    await expect(demoAPI.getMyOrgs()).resolves.toHaveLength(1);
    await expect(demoAPI.getOrgBySlug('test')).resolves.toMatchObject({ id: 'demo-org' });
    await expect(demoAPI.getOrgMembers('org-123')).resolves.toEqual([]);
    await expect(demoAPI.addMember('a@b.com', 'org-123')).resolves.toBeUndefined();
    await expect(demoAPI.removeMember('u1', 'org-123')).resolves.toBeUndefined();
  });
});

// ── realAPI ──────────────────────────────────────────────────────────────────
// Uses MSW to intercept REST calls to the Supabase placeholder URL.

describe('realAPI', () => {
  beforeAll(() => setCurrentOrgId('org-123'));

  const mockPlayer = { id: 'p1', name: 'Alice', org_id: 'org-123' };

  const mockMatch: Match = {
    id: 'm1', label: 'vs Bruxelles', is_open: true, phase: 'voting',
    present_ids: ['p1', 'p2'], reveal_order: [], revealed_count: 0,
    season: 1, team_id: null, created_at: '2024-01-15T20:00:00Z', org_id: 'org-123',
  };

  // ── Players ──

  describe('getPlayers', () => {
    it('returns the player list from the server', async () => {
      server.use(http.get(`${BASE}/players`, () => HttpResponse.json([mockPlayer])));
      const players = await realAPI.getPlayers();
      expect(players).toHaveLength(1);
      expect(players[0].name).toBe('Alice');
    });

    it('throws on server error', async () => {
      server.use(http.get(`${BASE}/players`, () =>
        HttpResponse.json({ message: 'Erreur 500' }, { status: 500 }),
      ));
      await expect(realAPI.getPlayers()).rejects.toThrow('Erreur 500');
    });
  });

  describe('addPlayer', () => {
    it('POSTs the player and returns the created record', async () => {
      server.use(http.post(`${BASE}/players`, () => HttpResponse.json([mockPlayer])));
      const p = await realAPI.addPlayer('Alice');
      expect(p.name).toBe('Alice');
    });
  });

  describe('removePlayer', () => {
    it('sends DELETE and resolves', async () => {
      server.use(http.delete(`${BASE}/players`, () => new HttpResponse(null, { status: 204 })));
      await expect(realAPI.removePlayer('p1')).resolves.toBe(true);
    });
  });

  // ── Matches ──

  describe('getActiveMatch', () => {
    it('returns the first active match', async () => {
      server.use(http.get(`${BASE}/matches`, () => HttpResponse.json([mockMatch])));
      expect((await realAPI.getActiveMatch())?.label).toBe('vs Bruxelles');
    });

    it('returns null when server sends empty array', async () => {
      server.use(http.get(`${BASE}/matches`, () => HttpResponse.json([])));
      expect(await realAPI.getActiveMatch()).toBeNull();
    });
  });

  describe('getMatches', () => {
    it('returns all matches', async () => {
      server.use(http.get(`${BASE}/matches`, () => HttpResponse.json([mockMatch])));
      const ms = await realAPI.getMatches();
      expect(ms).toHaveLength(1);
      expect(ms[0].label).toBe('vs Bruxelles');
    });
  });

  describe('createMatch', () => {
    it('POSTs match data and returns the new match', async () => {
      server.use(http.post(`${BASE}/matches`, () => HttpResponse.json([mockMatch])));
      const m = await realAPI.createMatch('vs Bruxelles', ['p1', 'p2'], null, 1);
      expect(m.label).toBe('vs Bruxelles');
      expect(m.phase).toBe('voting');
    });
  });

  describe('closeMatch', () => {
    it('PATCHes match with is_open=false and phase=closed', async () => {
      let captured: unknown;
      server.use(http.patch(`${BASE}/matches`, async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json([]);
      }));
      await realAPI.closeMatch('m1');
      expect(captured).toMatchObject({ is_open: false, phase: 'closed' });
    });
  });

  describe('startCounting', () => {
    it('PATCHes match with counting phase and reveal_order', async () => {
      let captured: unknown;
      server.use(http.patch(`${BASE}/matches`, async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json([]);
      }));
      await realAPI.startCounting('m1', ['v1', 'v2']);
      expect(captured).toMatchObject({ phase: 'counting', reveal_order: ['v1', 'v2'], revealed_count: 0 });
    });
  });

  describe('revealNext', () => {
    it('PATCHes revealed_count', async () => {
      let captured: unknown;
      server.use(http.patch(`${BASE}/matches`, async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json([]);
      }));
      await realAPI.revealNext('m1', 3);
      expect(captured).toMatchObject({ revealed_count: 3 });
    });
  });

  describe('updateMatch', () => {
    it('PATCHes arbitrary data', async () => {
      let captured: unknown;
      server.use(http.patch(`${BASE}/matches`, async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json([]);
      }));
      await realAPI.updateMatch('m1', { label: 'new label' });
      expect(captured).toMatchObject({ label: 'new label' });
    });
  });

  describe('deleteMatch', () => {
    it('deletes votes then the match in order', async () => {
      const order: string[] = [];
      server.use(
        http.delete(`${BASE}/votes`,   () => { order.push('votes');   return new HttpResponse(null, { status: 204 }); }),
        http.delete(`${BASE}/matches`, () => { order.push('matches'); return new HttpResponse(null, { status: 204 }); }),
      );
      await realAPI.deleteMatch('m1');
      expect(order).toEqual(['votes', 'matches']);
    });
  });

  describe('getMatchById', () => {
    it('returns the match when found', async () => {
      server.use(http.get(`${BASE}/matches`, () => HttpResponse.json([mockMatch])));
      expect((await realAPI.getMatchById('m1'))?.label).toBe('vs Bruxelles');
    });

    it('returns null when not found', async () => {
      server.use(http.get(`${BASE}/matches`, () => HttpResponse.json([])));
      expect(await realAPI.getMatchById('unknown')).toBeNull();
    });
  });

  // ── Votes ──

  describe('getVotes', () => {
    it('returns votes for the match', async () => {
      const v = { id: 'v1', match_id: 'm1', voter_name: 'Alice', best1_id: 'p1', lemon_id: 'p2' };
      server.use(http.get(`${BASE}/votes`, () => HttpResponse.json([v])));
      const votes = await realAPI.getVotes('m1');
      expect(votes).toHaveLength(1);
      expect(votes[0].voter_name).toBe('Alice');
    });
  });

  describe('hasVoted', () => {
    it('returns true when the server returns a non-empty array', async () => {
      server.use(http.get(`${BASE}/votes`, () => HttpResponse.json([{ id: 'v1' }])));
      expect(await realAPI.hasVoted('m1', 'Alice')).toBe(true);
    });

    it('returns false when the server returns an empty array', async () => {
      server.use(http.get(`${BASE}/votes`, () => HttpResponse.json([])));
      expect(await realAPI.hasVoted('m1', 'Unknown')).toBe(false);
    });
  });

  describe('submitVote', () => {
    it('POSTs the vote payload', async () => {
      let captured: unknown;
      server.use(http.post(`${BASE}/votes`, async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json([{}]);
      }));
      await realAPI.submitVote({ match_id: 'm1', voter_name: 'Alice', best1_id: 'p1', lemon_id: 'p2' });
      expect(captured).toMatchObject({ voter_name: 'Alice', match_id: 'm1' });
    });

    it('silently swallows 409 duplicate-vote errors', async () => {
      server.use(http.post(`${BASE}/votes`, () =>
        HttpResponse.json({ message: '409 unique constraint' }, { status: 409 }),
      ));
      await expect(
        realAPI.submitVote({ match_id: 'm1', voter_name: 'Alice' }),
      ).resolves.toBeUndefined();
    });

    it('rethrows errors that are not duplicate violations', async () => {
      server.use(http.post(`${BASE}/votes`, () =>
        HttpResponse.json({ message: 'Erreur 500' }, { status: 500 }),
      ));
      await expect(
        realAPI.submitVote({ match_id: 'm1', voter_name: 'Alice' }),
      ).rejects.toThrow();
    });
  });

  // ── Teams ──

  describe('getTeams', () => {
    it('returns teams from the server', async () => {
      const t = { id: 't1', name: 'Team A', player_ids: ['p1', 'p2'], org_id: 'org-123' };
      server.use(http.get(`${BASE}/teams`, () => HttpResponse.json([t])));
      const teams = await realAPI.getTeams();
      expect(teams).toHaveLength(1);
      expect(teams[0].name).toBe('Team A');
    });
  });

  describe('createTeam', () => {
    it('POSTs team data and returns the created team', async () => {
      const t = { id: 't1', name: 'Team A', player_ids: ['p1', 'p2'] };
      server.use(http.post(`${BASE}/teams`, () => HttpResponse.json([t])));
      const team = await realAPI.createTeam('Team A', ['p1', 'p2']);
      expect(team.name).toBe('Team A');
    });
  });

  describe('deleteTeam', () => {
    it('sends DELETE and resolves', async () => {
      server.use(http.delete(`${BASE}/teams`, () => new HttpResponse(null, { status: 204 })));
      await expect(realAPI.deleteTeam('t1')).resolves.toBe(true);
    });
  });

  // ── Season / Settings ──

  describe('getCurrentSeason', () => {
    it('parses the season number from settings row', async () => {
      server.use(http.get(`${BASE}/settings`, () => HttpResponse.json([{ value: '3' }])));
      expect(await realAPI.getCurrentSeason()).toBe(3);
    });

    it('returns 1 when settings row is missing', async () => {
      server.use(http.get(`${BASE}/settings`, () => HttpResponse.json([])));
      expect(await realAPI.getCurrentSeason()).toBe(1);
    });

    it('returns 1 on server error (graceful fallback)', async () => {
      server.use(http.get(`${BASE}/settings`, () =>
        HttpResponse.json({ message: 'Erreur 500' }, { status: 500 }),
      ));
      expect(await realAPI.getCurrentSeason()).toBe(1);
    });
  });

  describe('getSeasonName', () => {
    it('returns the season name when found', async () => {
      server.use(http.get(`${BASE}/settings`, () => HttpResponse.json([{ value: 'Hiver 2024' }])));
      expect(await realAPI.getSeasonName(1)).toBe('Hiver 2024');
    });

    it('returns null when no setting row exists', async () => {
      server.use(http.get(`${BASE}/settings`, () => HttpResponse.json([])));
      expect(await realAPI.getSeasonName(1)).toBeNull();
    });

    it('returns null on network error', async () => {
      server.use(http.get(`${BASE}/settings`, () => HttpResponse.error()));
      expect(await realAPI.getSeasonName(1)).toBeNull();
    });
  });

  // ── Guest tokens ──

  describe('validateGuestToken', () => {
    it('returns the GuestToken when found', async () => {
      const gt = { id: 'gt1', token: 'abc', name: 'Marc', match_id: 'm1', used: false, created_at: '' };
      server.use(http.get(`${BASE}/guest_tokens`, () => HttpResponse.json([gt])));
      expect((await realAPI.validateGuestToken('abc'))?.name).toBe('Marc');
    });

    it('returns null when token is not found', async () => {
      server.use(http.get(`${BASE}/guest_tokens`, () => HttpResponse.json([])));
      expect(await realAPI.validateGuestToken('nope')).toBeNull();
    });
  });

  describe('getGuestTokens', () => {
    it('returns tokens for the match', async () => {
      const gt = { id: 'gt1', token: 'abc', name: 'Marc', match_id: 'm1', used: false, created_at: '' };
      server.use(http.get(`${BASE}/guest_tokens`, () => HttpResponse.json([gt])));
      expect(await realAPI.getGuestTokens('m1')).toHaveLength(1);
    });
  });

  describe('useGuestToken', () => {
    it('PATCHes the token with used=true', async () => {
      let captured: unknown;
      server.use(http.patch(`${BASE}/guest_tokens`, async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json([]);
      }));
      await realAPI.useGuestToken('abc');
      expect(captured).toMatchObject({ used: true });
    });
  });

  describe('deleteGuestToken', () => {
    it('sends DELETE and resolves', async () => {
      server.use(http.delete(`${BASE}/guest_tokens`, () => new HttpResponse(null, { status: 204 })));
      await expect(realAPI.deleteGuestToken('gt1')).resolves.toBe(true);
    });
  });

  // ── getAllVotes ──

  describe('getAllVotes', () => {
    it('returns empty array when there are no matches', async () => {
      server.use(http.get(`${BASE}/matches`, () => HttpResponse.json([])));
      expect(await realAPI.getAllVotes()).toEqual([]);
    });

    it('fetches votes for all matches', async () => {
      const v = { id: 'v1', match_id: 'm1', voter_name: 'Alice' };
      server.use(
        http.get(`${BASE}/matches`, () => HttpResponse.json([mockMatch])),
        http.get(`${BASE}/votes`,   () => HttpResponse.json([v])),
      );
      const votes = await realAPI.getAllVotes();
      expect(votes).toHaveLength(1);
      expect(votes[0].voter_name).toBe('Alice');
    });
  });

  // ── createGuestToken ──

  describe('createGuestToken', () => {
    it('inserts a token and returns its hex string', async () => {
      let body: unknown;
      server.use(http.post(`${BASE}/guest_tokens`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json([{}]);
      }));
      const token = await realAPI.createGuestToken('Marc', 'm1');
      expect(typeof token).toBe('string');
      expect(token.length).toBe(24); // 12 bytes → 24 hex chars
      expect(body).toMatchObject({ name: 'Marc', match_id: 'm1' });
    });
  });

  // ── advanceSeason ──

  describe('advanceSeason', () => {
    it('updates the season row and returns next season', async () => {
      server.use(
        http.get(`${BASE}/settings`,   () => HttpResponse.json([{ value: '2' }])),
        http.patch(`${BASE}/settings`, () => HttpResponse.json([{}])),
      );
      expect(await realAPI.advanceSeason()).toBe(3);
    });

    it('inserts a season row when none exists yet', async () => {
      const called: string[] = [];
      server.use(
        http.get(`${BASE}/settings`,   () => HttpResponse.json([])),
        http.patch(`${BASE}/settings`, () => { called.push('patch'); return HttpResponse.json([]); }),
        http.post(`${BASE}/settings`,  () => { called.push('post');  return HttpResponse.json([{}]); }),
      );
      expect(await realAPI.advanceSeason()).toBe(2);
      expect(called).toContain('post');
    });
  });

  // ── setSeasonName ──

  describe('setSeasonName', () => {
    it('updates the season name when a row already exists', async () => {
      let patched: unknown;
      server.use(
        http.get(`${BASE}/settings`,   () => HttpResponse.json([{ value: 'old' }])),
        http.patch(`${BASE}/settings`, async ({ request }) => {
          patched = await request.json();
          return HttpResponse.json([{}]);
        }),
      );
      await realAPI.setSeasonName(1, 'Hiver 2025');
      expect(patched).toMatchObject({ value: 'Hiver 2025' });
    });

    it('inserts a new row when no name exists yet', async () => {
      let inserted: unknown;
      server.use(
        http.get(`${BASE}/settings`,  () => HttpResponse.json([])),
        http.post(`${BASE}/settings`, async ({ request }) => {
          inserted = await request.json();
          return HttpResponse.json([{}]);
        }),
      );
      await realAPI.setSeasonName(1, 'Hiver 2025');
      expect(inserted).toMatchObject({ value: 'Hiver 2025' });
    });

    it('falls back to update when insert fails (race condition)', async () => {
      let patched: unknown;
      server.use(
        http.get(`${BASE}/settings`,   () => HttpResponse.json([])),
        http.post(`${BASE}/settings`,  () =>
          HttpResponse.json({ message: 'Erreur 409' }, { status: 409 }),
        ),
        http.patch(`${BASE}/settings`, async ({ request }) => {
          patched = await request.json();
          return HttpResponse.json([{}]);
        }),
      );
      await realAPI.setSeasonName(1, 'Hiver 2025');
      expect(patched).toMatchObject({ value: 'Hiver 2025' });
    });
  });

  // ── getOrgBySlug ──

  describe('getOrgBySlug', () => {
    it('returns the org when found', async () => {
      const org = { id: 'org-1', name: 'FC Test', slug: 'fc-test' };
      server.use(http.get(`${BASE}/organizations`, () => HttpResponse.json([org])));
      const result = await realAPI.getOrgBySlug('fc-test');
      expect(result?.name).toBe('FC Test');
    });

    it('returns null when not found', async () => {
      server.use(http.get(`${BASE}/organizations`, () => HttpResponse.json([])));
      expect(await realAPI.getOrgBySlug('unknown')).toBeNull();
    });
  });

  // ── Auth ──

  const AUTH = 'https://VOTRE_PROJET.supabase.co/auth/v1';
  const RPC  = `${BASE}/rpc`;

  const mockSession = {
    access_token: 'mock', token_type: 'bearer', expires_in: 3600, refresh_token: 'r',
    user: { id: 'u1', email: 'test@test.com', aud: 'authenticated', role: 'authenticated',
            app_metadata: {}, user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
  };

  describe('signUp', () => {
    it('posts credentials and returns user data', async () => {
      server.use(http.post(`${AUTH}/signup`, () => HttpResponse.json(mockSession)));
      const data = await realAPI.signUp('test@test.com', 'password');
      expect(data).toBeDefined();
    });

    it('throws on auth error', async () => {
      server.use(http.post(`${AUTH}/signup`, () =>
        HttpResponse.json({ code: 400, error_code: 'user_already_exists', msg: 'User already registered' }, { status: 400 }),
      ));
      await expect(realAPI.signUp('test@test.com', 'password')).rejects.toThrow();
    });
  });

  describe('signIn', () => {
    it('posts credentials and returns session data', async () => {
      server.use(http.post(`${AUTH}/token`, () => HttpResponse.json(mockSession)));
      const data = await realAPI.signIn('test@test.com', 'password');
      expect(data).toBeDefined();
    });

    it('throws on invalid credentials', async () => {
      server.use(http.post(`${AUTH}/token`, () =>
        HttpResponse.json({ code: 400, error: 'invalid_grant', msg: 'Invalid login credentials' }, { status: 400 }),
      ));
      await expect(realAPI.signIn('test@test.com', 'wrong')).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('resolves without error', async () => {
      server.use(http.post(`${AUTH}/logout`, () => new HttpResponse(null, { status: 204 })));
      await expect(realAPI.signOut()).resolves.toBeUndefined();
    });
  });

  describe('getSession', () => {
    it('returns null when no active session exists', async () => {
      expect(await realAPI.getSession()).toBeNull();
    });
  });

  describe('onAuthChange', () => {
    it('returns a subscription object with unsubscribe', () => {
      const sub = realAPI.onAuthChange(() => {});
      expect(sub).toHaveProperty('unsubscribe');
      sub.unsubscribe();
    });
  });

  // ── Organisations ──

  describe('createOrg', () => {
    it('calls create_organization RPC then fetches and returns the org', async () => {
      const org = { id: 'org-1', name: 'Test FC', slug: 'test-fc' };
      server.use(
        http.post(`${RPC}/create_organization`, () => HttpResponse.json(null)),
        http.get(`${BASE}/organizations`, () => HttpResponse.json([org])),
      );
      const result = await realAPI.createOrg('Test FC', 'test-fc');
      expect(result.name).toBe('Test FC');
    });

    it('throws when all slug candidates are taken', async () => {
      server.use(
        http.post(`${RPC}/create_organization`, () =>
          HttpResponse.json({ code: '23505', message: 'duplicate key value' }, { status: 409 }),
        ),
      );
      await expect(realAPI.createOrg('Test', 'taken')).rejects.toThrow('Impossible');
    });
  });

  describe('getMyOrgs', () => {
    it('returns orgs from a successful RPC call', async () => {
      const orgs = [{ id: 'org-1', name: 'Test', slug: 'test', role: 'admin' }];
      server.use(http.post(`${RPC}/get_my_orgs`, () => HttpResponse.json(orgs)));
      const result = await realAPI.getMyOrgs();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test');
    });

    it('falls back to REST when RPC fails', async () => {
      server.use(
        http.post(`${RPC}/get_my_orgs`, () =>
          HttpResponse.json({ message: 'Function not found' }, { status: 404 }),
        ),
        http.get(`${BASE}/org_members`, () => HttpResponse.json([{ org_id: 'org-1', role: 'admin' }])),
        http.get(`${BASE}/organizations`, () => HttpResponse.json([{ id: 'org-1', name: 'Test', slug: 'test' }])),
      );
      const result = await realAPI.getMyOrgs();
      expect(result).toHaveLength(1);
    });

    it('returns empty array when REST fallback finds no memberships', async () => {
      server.use(
        http.post(`${RPC}/get_my_orgs`, () =>
          HttpResponse.json({ message: 'error' }, { status: 500 }),
        ),
        http.get(`${BASE}/org_members`, () => HttpResponse.json([])),
      );
      expect(await realAPI.getMyOrgs()).toEqual([]);
    });

    it('falls back to org_id-only query when role column is unavailable', async () => {
      server.use(
        http.post(`${RPC}/get_my_orgs`, () =>
          HttpResponse.json({ message: 'error' }, { status: 500 }),
        ),
        http.get(`${BASE}/org_members`, ({ request }) => {
          const select = new URL(request.url).searchParams.get('select') || '';
          if (select.includes('role')) {
            return HttpResponse.json({ message: 'Erreur 400' }, { status: 400 });
          }
          return HttpResponse.json([{ org_id: 'org-1' }]);
        }),
        http.get(`${BASE}/organizations`, () =>
          HttpResponse.json([{ id: 'org-1', name: 'Test', slug: 'test' }]),
        ),
      );
      const result = await realAPI.getMyOrgs();
      expect(result).toHaveLength(1);
    });
  });

  describe('getMyOrg', () => {
    it('returns the admin org from getMyOrgs', async () => {
      server.use(
        http.post(`${RPC}/get_my_orgs`, () =>
          HttpResponse.json([{ id: 'org-1', name: 'Test', slug: 'test', role: 'admin' }]),
        ),
      );
      const org = await realAPI.getMyOrg();
      expect(org?.name).toBe('Test');
    });
  });

  describe('getOrgMembers', () => {
    it('returns members via RPC', async () => {
      const members = [{ user_id: 'u1', email: 'a@b.com', role: 'admin' }];
      server.use(http.post(`${RPC}/get_org_members`, () => HttpResponse.json(members)));
      const result = await realAPI.getOrgMembers('org-1');
      expect(result).toHaveLength(1);
    });

    it('throws on RPC error', async () => {
      server.use(http.post(`${RPC}/get_org_members`, () =>
        HttpResponse.json({ message: 'Erreur 403' }, { status: 403 }),
      ));
      await expect(realAPI.getOrgMembers('org-1')).rejects.toThrow();
    });
  });

  describe('addMember', () => {
    it('calls add_org_member RPC and resolves', async () => {
      server.use(http.post(`${RPC}/add_org_member`, () => HttpResponse.json(null)));
      await expect(realAPI.addMember('a@b.com', 'org-1')).resolves.toBeUndefined();
    });

    it('throws on RPC error', async () => {
      server.use(http.post(`${RPC}/add_org_member`, () =>
        HttpResponse.json({ message: 'Erreur 403' }, { status: 403 }),
      ));
      await expect(realAPI.addMember('a@b.com', 'org-1')).rejects.toThrow();
    });
  });

  describe('removeMember', () => {
    it('sends DELETE to org_members and resolves', async () => {
      server.use(http.delete(`${BASE}/org_members`, () => new HttpResponse(null, { status: 204 })));
      await expect(realAPI.removeMember('u1', 'org-1')).resolves.toBeDefined();
    });
  });

  // ── withRetry ──

  describe('withRetry', () => {
    it('retries on a network error and succeeds on the next attempt', async () => {
      let attempts = 0;
      server.use(
        http.get(`${BASE}/players`, () => {
          attempts++;
          return attempts < 2 ? HttpResponse.error() : HttpResponse.json([mockPlayer]);
        }),
      );
      const players = await realAPI.getPlayers();
      expect(players[0].name).toBe('Alice');
      expect(attempts).toBe(2);
    }, 5000);

    it('throws after exhausting all retries', async () => {
      server.use(http.get(`${BASE}/players`, () => HttpResponse.error()));
      await expect(realAPI.getPlayers()).rejects.toThrow();
    }, 12000);
  });
});
