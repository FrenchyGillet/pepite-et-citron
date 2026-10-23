import { dateLocale, type TKey } from '@/i18n';
import type { MatchScheduleInput } from '@/types';

/**
 * Scheduled matches (migration 20260021): the vote opens on its own at
 * kick-off + the team's delay. The server applies the rules
 * (_open_due_schedules, get_upcoming_schedules); these helpers mirror them
 * for the demo mode and build what the Admin form sends.
 */

/** Delay when the team never chose one (organizations.vote_open_delay_minutes NULL). */
export const DEFAULT_VOTE_OPEN_DELAY = 90;

/** Offered when the delay is first asked, and in Paramètres. */
export const VOTE_OPEN_DELAYS: ReadonlyArray<number> = [60, 90, 120, 150];

/** A late cron never opens an occurrence whose opening is older than this. */
const STALE_MS = 12 * 3_600_000;

/** "1 h 30", "2 h", "45 min". */
export function formatDelay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** Device-local "YYYY-MM-DD" (the demo has no timezone but the device's). */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

/** What the demo keeps for a schedule (same fields as the table). */
export interface DemoSchedule extends MatchScheduleInput {
  id: number;
  created_at: string;
  last_opened_on: string | null;
}

/**
 * A vote launched by hand between kick-off and the vote opening is that match
 * (mirrors _manual_vote_in_window). `handVotes`: when such votes were opened.
 */
export function votedByHand(kickOff: Date, delayMinutes: number, handVotes: number[]): boolean {
  const start = kickOff.getTime();
  return handVotes.some(at => at >= start && at <= start + delayMinutes * 60_000);
}

/** Kick-off of the occurrence to open now, or null (mirrors _due_occurrence). */
export function dueOccurrence(s: DemoSchedule, delayMinutes: number, now: number = Date.now()): Date | null {
  const delay = delayMinutes * 60_000;
  let kickOff: Date;
  if (s.starts_at) {
    if (s.last_opened_on) return null;
    kickOff = new Date(s.starts_at);
  } else {
    const base = new Date(now - delay);
    const day = new Date(base);
    day.setDate(day.getDate() - ((base.getDay() - (s.weekday ?? 0) + 7) % 7));
    kickOff = atTime(day, s.start_time ?? '00:00');
    if (kickOff.getTime() > base.getTime()) kickOff.setDate(kickOff.getDate() - 7);
    if (s.last_opened_on && localDateKey(kickOff) <= s.last_opened_on) return null;
  }
  const opensAt = kickOff.getTime() + delay;
  if (opensAt > now || opensAt <= new Date(s.created_at).getTime() || opensAt < now - STALE_MS) return null;
  return kickOff;
}

/** Next kick-off whose vote has not opened yet (mirrors get_upcoming_schedules). */
export function nextOccurrence(
  s: DemoSchedule, delayMinutes: number, now: number = Date.now(), handVotes: number[] = [],
): Date | null {
  const delay = delayMinutes * 60_000;
  if (s.starts_at) {
    const kickOff = new Date(s.starts_at);
    return s.last_opened_on || kickOff.getTime() + delay <= now || votedByHand(kickOff, delayMinutes, handVotes)
      ? null : kickOff;
  }
  const day = new Date(now);
  day.setDate(day.getDate() + (((s.weekday ?? 0) - day.getDay() + 7) % 7));
  let kickOff = atTime(day, s.start_time ?? '00:00');
  while (kickOff.getTime() + delay <= now || (s.last_opened_on && localDateKey(kickOff) <= s.last_opened_on)
         || votedByHand(kickOff, delayMinutes, handVotes)) {
    kickOff = new Date(kickOff);
    kickOff.setDate(kickOff.getDate() + 7);
  }
  return kickOff;
}

export interface ScheduleForm {
  /** "YYYY-MM-DD" from <input type=date>: the day, or the first one when weekly. */
  date: string;
  /** "HH:MM" from <input type=time>. */
  time: string;
  weekly: boolean;
  label: string;
  teamId: string | number | null;
  pepiteCount: 2 | 3;
}

/**
 * The Admin form → what createSchedule sends. A weekly match repeats on the
 * chosen day's weekday. A match whose vote would already have opened is
 * refused (it would never open: no backfill).
 */
export function buildScheduleInput(
  form: ScheduleForm,
  opts: { delayMinutes: number; locale: MatchScheduleInput['locale']; timezone?: string; now?: number },
): { input: MatchScheduleInput | null; error: TKey | null } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || !/^\d{2}:\d{2}$/.test(form.time)) {
    return { input: null, error: 'schedule.dateMissing' };
  }
  const [y, mo, d] = form.date.split('-').map(Number);
  const kickOff = atTime(new Date(y, mo - 1, d), form.time);
  const label = form.label.trim();
  if (label.length > 100) return { input: null, error: 'schedule.labelTooLong' };
  const now = opts.now ?? Date.now();
  if (!form.weekly && kickOff.getTime() + opts.delayMinutes * 60_000 <= now) {
    return { input: null, error: 'schedule.inThePast' };
  }
  return {
    error: null,
    input: {
      label: label || null,
      starts_at: form.weekly ? null : kickOff.toISOString(),
      weekday: form.weekly ? kickOff.getDay() : null,
      start_time: form.weekly ? form.time : null,
      timezone: opts.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Europe/Brussels',
      team_id: form.teamId ?? null,
      pepite_count: form.pepiteCount,
      locale: opts.locale,
    },
  };
}

/** "mar. 28 oct. · 20:00" */
export function formatKickOff(iso: string): string {
  const d = new Date(iso);
  const day  = d.toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

/** "mardi", "Tuesday", "dinsdag". */
export function weekdayName(weekday: number): string {
  // 2026-10-04 is a Sunday: add the weekday to get any day of the week.
  return new Date(2026, 9, 4 + weekday).toLocaleDateString(dateLocale(), { weekday: 'long' });
}
