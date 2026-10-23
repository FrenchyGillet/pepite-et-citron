import { describe, it, expect } from 'vitest';
import {
  clearQuickStartDraft, defaultMatchLabel, quickStartPepiteCount, readQuickStartDraft, saveQuickStartDraft,
  teamSlug, validateQuickStart,
} from './quickStart';

const form = (o = {}) => ({
  teamName: 'FC Lions', playersText: 'Antoine\nBaptiste, Clément; David', email: 'a@b.fr', password: '12345678', ...o,
});

describe('quick start helpers', () => {
  it('votes on 3 pépites when there are enough players, else 2', () => {
    expect(quickStartPepiteCount(3)).toBe(2);
    expect(quickStartPepiteCount(4)).toBe(3);
    expect(quickStartPepiteCount(15)).toBe(3);
  });

  it('names the first match after the day', () => {
    expect(defaultMatchLabel(new Date(2026, 9, 6))).toBe('Match du 6 oct.');
  });

  it('always produces a usable slug', () => {
    expect(teamSlug("Les Lions d'Été")).toBe('les-lions-d-ete');
    expect(teamSlug('⚽⚽')).toBe('equipe');
  });
});

describe('validateQuickStart', () => {
  it('accepts a complete form and splits the names', () => {
    const { errors, names } = validateQuickStart(form());
    expect(errors).toEqual({});
    expect(names).toEqual(['Antoine', 'Baptiste', 'Clément', 'David']);
  });

  it('drops repeats (accents and case) before counting', () => {
    const { errors, names } = validateQuickStart(form({ playersText: 'Clément\nclement\nAntoine' }));
    expect(names).toEqual(['Clément', 'Antoine']);
    expect(errors.playersText).toMatch(/au moins 3 joueurs/);
  });

  it('reports every missing field at once', () => {
    const { errors } = validateQuickStart({ teamName: ' ', playersText: '', email: 'nope', password: '123' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'password', 'playersText', 'teamName']);
  });
});

describe('signed-in organiser', () => {
  it('needs no email or password', () => {
    expect(validateQuickStart(form({ email: '', password: '' }), { needsAccount: false }).errors).toEqual({});
  });
});

describe('quick start draft', () => {
  it('keeps the team and players until cleared, never the credentials', () => {
    saveQuickStartDraft({ teamName: 'FC Lions', playersText: 'Antoine\nBaptiste', meName: 'Antoine' });
    expect(readQuickStartDraft()).toEqual({ teamName: 'FC Lions', playersText: 'Antoine\nBaptiste', meName: 'Antoine' });
    expect(localStorage.getItem('pepite_quick_start_draft')).not.toMatch(/password|email/);
    clearQuickStartDraft();
    expect(readQuickStartDraft()).toBeNull();
  });

  it('ignores a damaged draft', () => {
    localStorage.setItem('pepite_quick_start_draft', '{"teamName":3}');
    expect(readQuickStartDraft()).toBeNull();
    localStorage.setItem('pepite_quick_start_draft', 'not json');
    expect(readQuickStartDraft()).toBeNull();
  });
});
