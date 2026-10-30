import { describe, expect, it } from 'vitest';
import { MASCOT_LINES } from '@/i18n/mascots';
import { hashSeed, MASCOT_MOODS, palmaresMascot, pickMascotLine, rankingMascot, type MascotCatalogue } from './mascots';

const catalogue: MascotCatalogue = {
  upcoming: [[{ who: 'citron', mood: 'impassible', text: 'Le vote ouvre à {time}.' }]],
  noMatch: [], voted: [], closedNotVoted: [], noResults: [],
  seasonPepite: [
    [{ who: 'pepite', mood: 'ravie', text: 'A {pepite}' }],
    [{ who: 'pepite', mood: 'fiere', text: 'B {pepite}' }],
  ],
  seasonCitron: [[{ who: 'citron', mood: 'outre', text: 'C {citron}' }]],
  pepiteStreak: [], citronStreak: [], seasonRecord: [],
  attendanceLeader: [], attendancePerfect: [], attendanceTie: [],
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

const name = (id: string) => `P${id}`;
const titles = (o = {}) => ({ pepite: null, citron: null, attendance: null, matches: 4, ...o });

describe('rankingMascot', () => {
  it('names a single title holder, says nothing on a shared Pépite or Citron title', () => {
    expect(rankingMascot('pepite', titles({ pepite: { ids: ['1'], value: 9 } }), name))
      .toEqual({ situations: ['seasonPepite'], vars: { pepite: 'P1', pepitePts: 9 } });
    expect(rankingMascot('citron', titles({ citron: { ids: ['1', '2'], value: 3 } }), name)).toBeNull();
    expect(rankingMascot('citron', titles(), name)).toBeNull();
  });

  it('has a line for a tie, a leader and a perfect attendance', () => {
    expect(rankingMascot('attendance', titles({ attendance: { ids: ['1', '2'], value: 4 } }), name)?.situations).toEqual(['attendanceTie']);
    expect(rankingMascot('attendance', titles({ attendance: { ids: ['1'], value: 3 } }), name))
      .toEqual({ situations: ['attendanceLeader'], vars: { name: 'P1', played: 3, total: 4 } });
    expect(rankingMascot('attendance', titles({ attendance: { ids: ['1'], value: 4 } }), name)?.situations)
      .toEqual(['attendancePerfect', 'attendanceLeader']);
  });
});

describe('palmaresMascot', () => {
  const noRecords = { bestMatch: null, pepiteStreak: null, citronStreak: null };

  it('comments the longest streaks and the record', () => {
    const cue = palmaresMascot(
      [{ id: '1', kind: 'pepite', length: 3 }, { id: '2', kind: 'pepite', length: 2 }, { id: '3', kind: 'citron', length: 2 }],
      { ...noRecords, bestMatch: { ids: ['1'], value: 7, label: 'M3' } }, name);
    expect(cue?.situations).toEqual(['pepiteStreak', 'citronStreak', 'seasonRecord']);
    expect(cue?.vars).toMatchObject({ pepite: 'P1', pepiteRun: 3, citron: 'P3', citronRun: 2 });
  });

  it('says nothing without a streak or a record', () => {
    expect(palmaresMascot([], noRecords, name)).toBeNull();
  });
});
