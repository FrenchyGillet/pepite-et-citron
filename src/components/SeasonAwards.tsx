import type { CSSProperties } from 'react';
import { dateLocale, t } from '@/i18n';
import { displayName } from '@/utils/player';
import {
  currentStreaks, matchResults, monthKey, monthlyTitles, seasonRecords, seasonTitles, type Title,
} from '@/utils/awards';
import type { Match, Player, Vote } from '@/types';

interface SeasonAwardsProps {
  players: Player[];
  /** The season's matches (already filtered by season and line-up). */
  matches: Match[];
  votes: Vote[];
}

const card: CSSProperties = {
  flex: '1 1 140px', background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', minWidth: 0,
};
const caption: CSSProperties = { fontSize: 12, color: 'var(--label3)', marginBottom: 4 };
const holder: CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--label)', overflowWrap: 'anywhere' };
const value: CSSProperties = { fontSize: 12, color: 'var(--label3)', marginTop: 2 };

/** "Antoine & Hugo" — every player sharing a title. */
export function holderNames(ids: string[], players: Player[]): string {
  return ids.map(id => {
    const p = players.find(pl => String(pl.id) === id);
    return p ? displayName(p) : '?';
  }).join(' & ');
}

/** "octobre 2026" from "2026-10". */
function monthName(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' });
}

// Module-level so the cards are not remounted on every render.
function Award({ label, holders, detail }: { label: string; holders: string | null; detail: string }) {
  return (
    <div style={card}>
      <div style={caption}>{label}</div>
      <div style={holder}>{holders ?? t('awards.nobody')}</div>
      {holders && <div style={value}>{detail}</div>}
    </div>
  );
}

/**
 * Saison → "Palmarès" (Pro): season titles, titles of the month, running
 * streaks and records, from the revealed matches (utils/awards).
 */
export function SeasonAwards({ players, matches, votes }: SeasonAwardsProps) {
  const results = matchResults(players, matches, votes);
  if (results.length < 2) {
    return <p style={{ fontSize: 12, color: 'var(--label3)', margin: '0 0 16px' }}>{t('awards.minMatches')}</p>;
  }

  const season  = seasonTitles(results);
  const months  = monthlyTitles(results);
  const streaks = currentStreaks(results);
  const records = seasonRecords(results);
  // A title shared by more than 3 players says nothing: count them instead.
  const names = (title: Title | null) => !title ? t('awards.nobody')
    : title.ids.length > 3 ? t('awards.tied', { count: title.ids.length })
    : holderNames(title.ids, players);
  const current = months[0]?.month === monthKey(new Date()) ? months[0] : null;
  const past    = months.filter(m => m !== current);

  return (
    <section aria-label={t('awards.palmares')} style={{ marginBottom: 20 }}>
      <p className="section-label mb-4">{t('awards.palmares')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <Award label={t('awards.seasonPepite')} holders={season.pepite && names(season.pepite)} detail={t('awards.pts', { count: season.pepite?.value ?? 0 })} />
        <Award label={t('awards.seasonCitron')} holders={season.citron && names(season.citron)} detail={t('awards.pts', { count: season.citron?.value ?? 0 })} />
        <Award label={t('awards.attendance')} holders={season.attendance && names(season.attendance)}
          detail={t('awards.attendanceValue', { count: season.attendance?.value ?? 0, total: season.matches })} />
      </div>

      {current && (
        <>
          <p style={{ ...caption, margin: '4px 0 6px' }}>{t('awards.thisMonth', { month: monthName(current.month) })}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <Award label={t('awards.monthPepite')} holders={current.pepite && names(current.pepite)} detail={t('awards.pts', { count: current.pepite?.value ?? 0 })} />
            <Award label={t('awards.monthCitron')} holders={current.citron && names(current.citron)} detail={t('awards.pts', { count: current.citron?.value ?? 0 })} />
          </div>
        </>
      )}

      {(streaks.length > 0 || records.bestMatch || past.length > 0) && (
        <div className="group" style={{ marginBottom: 4 }}>
          {streaks.length > 0 && (
            <div className="row">
              <div className="row-body">
                <div className="row-sub">{t('awards.streaks')}</div>
                {streaks.map(s => (
                  <div key={`${s.kind}-${s.id}`} className="row-title" style={{ fontSize: 14 }}>
                    {t(s.kind === 'pepite' ? 'awards.pepiteStreakLine' : 'awards.citronStreakLine',
                      { name: holderNames([s.id], players), count: s.length })}
                  </div>
                ))}
              </div>
            </div>
          )}
          {records.bestMatch && (
            <div className="row">
              <div className="row-body">
                <div className="row-sub">{t('awards.records')}</div>
                <div className="row-title" style={{ fontSize: 14 }}>
                  {t('awards.recordMatch', { name: holderNames(records.bestMatch.ids, players), count: records.bestMatch.value, match: records.bestMatch.label })}
                </div>
                {records.pepiteStreak && (
                  <div className="row-title" style={{ fontSize: 14 }}>
                    {t('awards.recordPepiteStreak', { name: names(records.pepiteStreak), count: records.pepiteStreak.value })}
                  </div>
                )}
                {records.citronStreak && (
                  <div className="row-title" style={{ fontSize: 14 }}>
                    {t('awards.recordCitronStreak', { name: names(records.citronStreak), count: records.citronStreak.value })}
                  </div>
                )}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div className="row">
              <div className="row-body">
                <div className="row-sub">{t('awards.pastMonths')}</div>
                {past.map(m => (
                  <div key={m.month} className="row-title" style={{ fontSize: 14 }}>
                    {t('awards.monthLine', { month: monthName(m.month), pepite: names(m.pepite), citron: names(m.citron) })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
