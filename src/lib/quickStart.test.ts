import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __demoAPI, __resetDemoState, demoState } from '@/api';
import { runQuickStart, type QuickStartProgress } from './quickStart';

const input = {
  email: 'coach@club.fr', password: 'motdepasse', teamName: 'FC Lions',
  names: ['Zoé', 'Yann', 'Xavier', 'Willy'], meName: 'Yann',
};
const api = __demoAPI;

beforeEach(() => { __resetDemoState(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('runQuickStart', () => {
  it('creates the team, the players and opens a 3-pépite vote with everyone present', async () => {
    const steps: string[] = [];
    const createOrg = vi.spyOn(api, 'createOrg');
    const link = vi.spyOn(api, 'linkPlayer');

    const { players, match } = await runQuickStart(api, input, {}, s => steps.push(s));

    expect(steps).toEqual(['account', 'team', 'players', 'match']);
    expect(createOrg).toHaveBeenCalledWith('FC Lions', 'fc-lions');
    expect(players.map(p => p.name)).toEqual(input.names);
    expect(match).toMatchObject({ is_open: true, phase: 'voting', pepite_count: 3 });
    expect(match.present_ids).toEqual(players.map(p => p.id));
    expect(link).toHaveBeenCalledWith(players[1].id);
  });

  it('a retry after a failure resumes without duplicating anything', async () => {
    const progress: QuickStartProgress = {};
    vi.spyOn(api, 'createMatch').mockRejectedValueOnce(new Error('Délai dépassé'));
    await expect(runQuickStart(api, input, progress, () => {})).rejects.toThrow('Délai dépassé');
    expect(progress.players).toHaveLength(4);

    const signUp = vi.spyOn(api, 'signUp');
    const addPlayers = vi.spyOn(api, 'addPlayers');
    await runQuickStart(api, input, progress, () => {});

    expect(signUp).not.toHaveBeenCalled();
    expect(addPlayers).not.toHaveBeenCalled();
    expect(demoState.players.filter(p => p.name === 'Zoé')).toHaveLength(1);
    expect(demoState.matches).toHaveLength(1);
  });

  it('reuses players a timed-out insert committed anyway', async () => {
    const real = api.addPlayers;
    vi.spyOn(api, 'addPlayers').mockImplementationOnce(async names => {
      await real(names);                       // committed server-side…
      throw new Error('Délai dépassé');        // …but the answer was lost
    });
    await expect(runQuickStart(api, input, {}, () => {})).rejects.toThrow();

    await runQuickStart(api, input, {}, () => {});
    expect(demoState.players.filter(p => input.names.includes(p.name))).toHaveLength(4);
  });

  it('falls back to 2 pépites for a squad of 3', async () => {
    const { match } = await runQuickStart(api, { ...input, names: ['Zoé', 'Yann', 'Xavier'] }, {}, () => {});
    expect(match.pepite_count).toBe(2);
  });

  it('stops with a clear message when the account needs an email confirmation', async () => {
    vi.spyOn(api, 'getSession').mockResolvedValue(null);
    await expect(runQuickStart(api, input, {}, () => {})).rejects.toThrow(/confirme ton adresse email/);
    expect(demoState.matches).toHaveLength(0);
  });
});
