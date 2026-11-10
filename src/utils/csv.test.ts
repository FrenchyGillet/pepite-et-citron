import { describe, expect, it } from 'vitest';
import { csvFileName, seasonCsv, toCsv } from './csv';

describe('toCsv', () => {
  it('separates with semicolons, starts with a BOM, quotes what needs it', () => {
    expect(toCsv([['a', 1], ['b;c', 'say "hi"']])).toBe('﻿a;1\r\n"b;c";"say ""hi"""\r\n');
  });
});

describe('seasonCsv', () => {
  it('has a header and one row per player', () => {
    const csv = seasonCsv(
      [{ name: 'Zoé', bestPts: 7, lemonPts: 1, wins: 2, lemons: 0, matchesPlayed: 4, absences: 1, bestHistory: [], lemonHistory: [] }],
      { player: 'Joueur', played: 'Matchs', absences: 'Absences', pepitePts: 'Pts', pepites: 'Pépites', citronPts: 'Pts citron', citrons: 'Citrons' },
    );
    expect(csv.slice(1).split('\r\n')).toEqual(['Joueur;Matchs;Absences;Pts;Pépites;Pts citron;Citrons', 'Zoé;4;1;7;2;1;0', '']);
  });
});

describe('csvFileName', () => {
  it('drops accents and odd characters', () => {
    expect(csvFileName('Pépite & Citron', 'Saison 2025/26')).toBe('pepite-citron-saison-2025-26.csv');
  });
});
