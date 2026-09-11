import { describe, it, expect } from 'vitest';
import { displayName, initials, avatarColor, isActive, parsePlayerNames } from './player';

// ── displayName ───────────────────────────────────────────────────────────────

describe('displayName', () => {
  it('returns nickname when set', () => {
    expect(displayName({ name: 'Jean-Pierre', nickname: 'JP' })).toBe('JP');
  });

  it('returns name when nickname is null', () => {
    expect(displayName({ name: 'Jean-Pierre', nickname: null })).toBe('Jean-Pierre');
  });

  it('returns name when nickname is undefined', () => {
    expect(displayName({ name: 'Jean-Pierre' })).toBe('Jean-Pierre');
  });

  it('returns name when nickname is only whitespace', () => {
    expect(displayName({ name: 'Jean-Pierre', nickname: '   ' })).toBe('Jean-Pierre');
  });

  it('trims whitespace from nickname', () => {
    expect(displayName({ name: 'Jean', nickname: '  JP  ' })).toBe('JP');
  });

  it('returns name when nickname is empty string', () => {
    expect(displayName({ name: 'Jean', nickname: '' })).toBe('Jean');
  });
});

// ── initials ──────────────────────────────────────────────────────────────────

describe('initials', () => {
  it('returns first 2 chars (uppercase) for a single word', () => {
    expect(initials('Antoine')).toBe('AN');
  });

  it('returns first chars of first and second word for two words', () => {
    expect(initials('Jean Pierre')).toBe('JP');
  });

  it('uses first and second word only for names with 3+ words', () => {
    expect(initials('Jean Pierre Martin')).toBe('JP');
  });

  it('uppercases lowercase input', () => {
    expect(initials('alice')).toBe('AL');
  });

  it('handles a single-letter name gracefully', () => {
    const result = initials('A');
    expect(result).toBe('A');
  });

  it('collapses multiple spaces between words', () => {
    // split(/\s+/) handles multiple spaces
    expect(initials('Jean  Pierre')).toBe('JP');
  });
});

// ── avatarColor ───────────────────────────────────────────────────────────────

describe('avatarColor', () => {
  it('returns a valid HSL string', () => {
    const color = avatarColor('Antoine');
    expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it('is deterministic — same seed yields same color', () => {
    expect(avatarColor('Antoine')).toBe(avatarColor('Antoine'));
  });

  it('returns different colors for different seeds', () => {
    expect(avatarColor('Antoine')).not.toBe(avatarColor('Baptiste'));
  });

  it('does not throw on empty string', () => {
    expect(() => avatarColor('')).not.toThrow();
  });

  it('hue is in range [0, 359]', () => {
    const color = avatarColor('TestSeed');
    const hue = parseInt(color.match(/hsl\((\d+)/)?.[1] ?? '-1', 10);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });
});

// ── isActive ──────────────────────────────────────────────────────────────────

describe('isActive', () => {
  it('is true unless the player is archived', () => {
    expect(isActive({ archived_at: null })).toBe(true);
    expect(isActive({})).toBe(true);
    expect(isActive({ archived_at: '2026-09-11T10:00:00Z' })).toBe(false);
  });
});

// ── parsePlayerNames ──────────────────────────────────────────────────────────

describe('parsePlayerNames', () => {
  const roster = [
    { name: 'Clément', archived_at: null },
    { name: 'Hugo',    archived_at: '2026-01-01T00:00:00Z' },
  ];

  it('splits on new lines, commas and semicolons, trimming blanks', () => {
    expect(parsePlayerNames(' Zoé \n\nLéo, Max ;Noé ', []).toAdd).toEqual(['Zoé', 'Léo', 'Max', 'Noé']);
  });

  it('collapses inner spaces', () => {
    expect(parsePlayerNames('Jean   Pierre', []).toAdd).toEqual(['Jean Pierre']);
  });

  it('drops repeats within the paste (case- and accent-insensitive), keeping the first spelling', () => {
    expect(parsePlayerNames('Zoé\nzoe\nZOÉ', []).toAdd).toEqual(['Zoé']);
  });

  it('reports names already in the roster instead of re-adding them', () => {
    const r = parsePlayerNames('clement\nZoé', roster);
    expect(r.toAdd).toEqual(['Zoé']);
    expect(r.existing).toEqual(['Clément']);
  });

  it('flags archived players so they get reactivated, not duplicated', () => {
    const r = parsePlayerNames('Hugo', roster);
    expect(r.toAdd).toEqual([]);
    expect(r.archived).toEqual(['Hugo']);
  });

  it('skips names longer than 50 characters', () => {
    const long = 'x'.repeat(51);
    const r = parsePlayerNames(`${long}\nZoé`, []);
    expect(r.toAdd).toEqual(['Zoé']);
    expect(r.tooLong).toEqual([long]);
  });

  it('returns nothing for blank input', () => {
    expect(parsePlayerNames(' \n , ', roster)).toEqual({ toAdd: [], existing: [], archived: [], tooLong: [] });
  });
});
