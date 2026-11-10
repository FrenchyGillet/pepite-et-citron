import type { PlayerStat } from '@/utils/season';

/**
 * CSV for spreadsheets. Semicolon-separated with a BOM: Excel in French,
 * Dutch and Belgian locales opens it in columns, with accents intact (Google
 * Sheets and Numbers read it too).
 */
export function toCsv(rows: Array<Array<string | number>>): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

export interface SeasonCsvHeaders {
  player: string; played: string; absences: string;
  pepitePts: string; pepites: string; citronPts: string; citrons: string;
}

/** One row per player of the season, as on the Saison rankings. */
export function seasonCsv(stats: PlayerStat[], h: SeasonCsvHeaders): string {
  return toCsv([
    [h.player, h.played, h.absences, h.pepitePts, h.pepites, h.citronPts, h.citrons],
    ...stats.map(s => [s.name, s.matchesPlayed, s.absences, s.bestPts, s.wins, s.lemonPts, s.lemons]),
  ]);
}

/** A file name safe on every system: "pepite-citron-saison-2026.csv". */
export function csvFileName(...parts: string[]): string {
  const slug = parts.join('-').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'export'}.csv`;
}
