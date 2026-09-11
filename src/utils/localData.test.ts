import { beforeEach, describe, expect, it } from 'vitest';
import { clearLocalPersonalData } from './localData';

beforeEach(() => localStorage.clear());

describe('clearLocalPersonalData', () => {
  it('removes ballots, identity, drafts and cached data', () => {
    localStorage.setItem('pepite_query_cache', '{"votes":[]}');
    localStorage.setItem('pepite_voter_identity', '{"name":"Thomas"}');
    localStorage.setItem('pepite_voted', '[12]');
    localStorage.setItem('pepite_vote_draft_12', '{"best1Id":3}');
    localStorage.setItem('pepite_orgs_v2', '{"orgs":[]}');

    clearLocalPersonalData();

    expect(localStorage.length).toBe(0);
  });

  it('keeps the theme, UI flags and an unsent offline vote', () => {
    localStorage.setItem('pepite_theme', 'dark');
    localStorage.setItem('pepite_push_banner_dismissed', '1');
    localStorage.setItem('pepite_offline_vote_v1', '{"match_id":12}');
    localStorage.setItem('other_app_key', 'x');

    clearLocalPersonalData();

    expect(localStorage.getItem('pepite_theme')).toBe('dark');
    expect(localStorage.getItem('pepite_push_banner_dismissed')).toBe('1');
    expect(localStorage.getItem('pepite_offline_vote_v1')).not.toBeNull();
    expect(localStorage.getItem('other_app_key')).toBe('x');
  });
});
