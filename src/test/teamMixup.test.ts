import { describe, it, expect } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { server } from './server';
import { BASE, RPC } from './handlers';
import { realAPI } from '@/api';

/**
 * A player in two teams opens team B's link while team A is loading (the
 * app starts on A from its cache, the link switches to B a moment later).
 * A request made for A must load A, whatever runs meanwhile. It used to read
 * a global "current team" after its first awaits, and stored B's match
 * under A's key (persisted, so A then showed B's match on the next launch).
 */
const orgOf = (url: string, param: string) => new URL(url).searchParams.get(param)?.replace('eq.', '');

describe('two teams on one phone', () => {
  it("a request for team A never loads team B's data", async () => {
    server.use(
      // A's first step is slow; B's whole request runs meanwhile.
      http.post(`${RPC}/open_due_scheduled_matches`, async ({ request }) => {
        const { p_org_id } = await request.json() as { p_org_id: string };
        if (p_org_id === 'team-a') await delay(30);
        return HttpResponse.json(0);
      }),
      http.post(`${RPC}/delete_abandoned_votes`, () => HttpResponse.json(0)),
      http.get(`${BASE}/matches`, ({ request }) => {
        const org = orgOf(request.url, 'org_id');
        return HttpResponse.json([{ id: org === 'team-a' ? 1 : 2, label: `match of ${org}`, org_id: org,
          is_open: true, phase: 'voting', present_ids: [], reveal_order: [], revealed_count: 0, season: 1,
          team_id: null, created_at: new Date().toISOString(), vote_count: 1 }]);
      }),
      http.get(`${BASE}/players`, ({ request }) =>
        HttpResponse.json([{ id: 1, name: `player of ${orgOf(request.url, 'org_id')}` }])),
    );

    const forA = realAPI.getActiveMatch('team-a');
    const forB = realAPI.getActiveMatch('team-b');
    expect((await forB)?.label).toBe('match of team-b');
    expect((await forA)?.label).toBe('match of team-a');

    const [playersA, playersB] = await Promise.all([realAPI.getPlayers('team-a'), realAPI.getPlayers('team-b')]);
    expect(playersA[0].name).toBe('player of team-a');
    expect(playersB[0].name).toBe('player of team-b');
  });

  it('a call without a team is refused instead of guessing', async () => {
    await expect(realAPI.getMatches('')).rejects.toThrow('Équipe inconnue');
  });
});
