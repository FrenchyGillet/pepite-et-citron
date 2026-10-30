import { describe, expect, it } from 'vitest';
import { MASCOT_LINES } from '@/i18n/mascots';
import { hashSeed, MASCOT_MOODS, pickMascotLine, type MascotCatalogue } from './mascots';

const catalogue: MascotCatalogue = {
  upcoming: [[{ who: 'citron', mood: 'impassible', text: 'Le vote ouvre à {time}.' }]],
  noMatch: [], voted: [], closedNotVoted: [], noResults: [],
  seasonPepite: [
    [{ who: 'pepite', mood: 'ravie', text: 'A {pepite}' }],
    [{ who: 'pepite', mood: 'fiere', text: 'B {pepite}' }],
  ],
  seasonCitron: [[{ who: 'citron', mood: 'outre', text: 'C {citron}' }]],
  attendanceTie: [],
};

describe('pickMascotLine', () => {
  it('fills the variables, leaves unknown ones', () => {
    expect(pickMascotLine(catalogue, ['upcoming'], 's', { time: '21:30' })?.[0].text).toBe('Le vote ouvre à 21:30.');
    expect(pickMascotLine(catalogue, ['upcoming'], 's')?.[0].text).toBe('Le vote ouvre à {time}.');
  });

  it('gives the same line for the same seed', () => {
    const a = pickMascotLine(catalogue, ['seasonPepite', 'seasonCitron'], 'match-42');
    expect(pickMascotLine(catalogue, ['seasonPepite', 'seasonCitron'], 'match-42')).toEqual(a);
  });

  it('pools the situations', () => {
    const texts = new Set(Array.from({ length: 50 }, (_, i) =>
      pickMascotLine(catalogue, ['seasonPepite', 'seasonCitron'], `seed-${i}`)?.[0].text.charAt(0)));
    expect(texts).toEqual(new Set(['A', 'B', 'C']));
  });

  it('shows nothing without a catalogue or a line', () => {
    expect(pickMascotLine(undefined, ['upcoming'], 's')).toBeNull();
    expect(pickMascotLine(catalogue, ['noMatch'], 's')).toBeNull();
  });
});

describe('hashSeed', () => {
  it('is stable and unsigned', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'));
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'));
    expect(hashSeed('')).toBeGreaterThanOrEqual(0);
  });
});

describe('MASCOT_LINES', () => {
  it('has French lines for every situation, with known moods and no exclamation mark', () => {
    const fr = MASCOT_LINES.fr!;
    for (const [situation, lines] of Object.entries(fr)) {
      expect(lines.length, situation).toBeGreaterThan(0);
      for (const bubble of lines.flat()) {
        expect((MASCOT_MOODS[bubble.who] as readonly string[]).includes(bubble.mood), bubble.text).toBe(true);
        expect(bubble.text, situation).not.toContain('!');
      }
    }
  });
});
