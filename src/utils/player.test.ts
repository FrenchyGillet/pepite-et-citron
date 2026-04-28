import { describe, it, expect } from 'vitest';
import { displayName, initials, avatarColor } from './player';

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
