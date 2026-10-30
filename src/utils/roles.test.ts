import { describe, it, expect } from 'vitest';
import { canRunMatches, roleLabel } from './roles';

describe('roles', () => {
  it('lets admins and captains run the vote, not voters', () => {
    expect(canRunMatches('admin')).toBe(true);
    expect(canRunMatches('captain')).toBe(true);
    expect(canRunMatches('voter')).toBe(false);
    expect(canRunMatches(null)).toBe(false);
    expect(canRunMatches(undefined)).toBe(false);
  });

  it('labels each role in French', () => {
    expect(roleLabel('admin')).toBe('Capitaine');
    expect(roleLabel('captain')).toBe('Animateur');
    expect(roleLabel('voter')).toBe('Joueur');
  });
});
