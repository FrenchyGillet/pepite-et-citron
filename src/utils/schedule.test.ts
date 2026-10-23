import { describe, expect, it } from 'vitest';
import { buildScheduleInput, dueOccurrence, formatDelay, localDateKey, nextOccurrence, votedByHand, type DemoSchedule } from './schedule';

// Tuesday 27 October 2026, 21:40 (device time).
const at = (h: number, m = 0, day = 27) => new Date(2026, 9, day, h, m).getTime();
const NOW = at(21, 40);

const oneOff = (o: Partial<DemoSchedule> = {}): DemoSchedule => ({
  id: 1, label: null, starts_at: new Date(at(20)).toISOString(), weekday: null, start_time: null,
  timezone: 'Europe/Brussels', team_id: null, pepite_count: 3, locale: 'fr',
  created_at: new Date(at(12, 0, 26)).toISOString(), last_opened_on: null, ...o,
});
const weekly = (o: Partial<DemoSchedule> = {}): DemoSchedule =>
  oneOff({ starts_at: null, weekday: 2, start_time: '20:00', ...o });

describe('dueOccurrence', () => {
  it('opens a one-off at kick-off + delay, once', () => {
    expect(dueOccurrence(oneOff(), 90, NOW)?.getTime()).toBe(at(20));
    expect(dueOccurrence(oneOff(), 90, at(21, 20))).toBeNull();
    expect(dueOccurrence(oneOff({ last_opened_on: '2026-10-27' }), 90, NOW)).toBeNull();
  });

  it('never backfills, never opens a stale occurrence', () => {
    expect(dueOccurrence(oneOff({ created_at: new Date(at(21, 35)).toISOString() }), 90, NOW)).toBeNull();
    expect(dueOccurrence(oneOff(), 90, at(10, 0, 28))).toBeNull();
  });

  it('opens this week of a weekly match, not again', () => {
    expect(dueOccurrence(weekly(), 90, NOW)?.getTime()).toBe(at(20));
    expect(dueOccurrence(weekly({ last_opened_on: '2026-10-27' }), 90, NOW)).toBeNull();
    // Monday: last week's Tuesday is stale.
    expect(dueOccurrence(weekly(), 90, at(21, 40, 26))).toBeNull();
  });
});

describe('nextOccurrence', () => {
  it('a weekly match: today before the vote opens, else next week', () => {
    expect(nextOccurrence(weekly(), 90, at(19))?.getTime()).toBe(at(20));
    expect(nextOccurrence(weekly(), 90, NOW)?.getTime()).toBe(at(20, 0, 27 + 7));
    expect(nextOccurrence(weekly({ last_opened_on: '2026-10-27' }), 90, at(21, 0))?.getTime()).toBe(at(20, 0, 27 + 7));
  });

  it('a one-off: until its vote opens', () => {
    expect(nextOccurrence(oneOff(), 90, at(19))?.getTime()).toBe(at(20));
    expect(nextOccurrence(oneOff(), 90, NOW)).toBeNull();
  });
});

describe('votedByHand', () => {
  it('a vote launched between kick-off and the vote opening stands for the match', () => {
    expect(votedByHand(new Date(at(20)), 90, [at(21)])).toBe(true);
    expect(votedByHand(new Date(at(20)), 90, [at(19, 59)])).toBe(false);
    expect(votedByHand(new Date(at(20)), 90, [at(21, 31)])).toBe(false);
    // The next weekly occurrence is then next week.
    expect(nextOccurrence(weekly(), 90, at(21), [at(20, 45)])?.getTime()).toBe(at(20, 0, 27 + 7));
  });
});

describe('buildScheduleInput', () => {
  const opts = { delayMinutes: 90, locale: 'fr' as const, timezone: 'Europe/Brussels', now: at(18) };
  const form = { date: '2026-10-27', time: '20:00', weekly: false, label: ' vs Dragons ', teamId: null, pepiteCount: 3 as const };

  it('a one-off match', () => {
    const { input, error } = buildScheduleInput(form, opts);
    expect(error).toBeNull();
    expect(input).toMatchObject({ label: 'vs Dragons', starts_at: new Date(at(20)).toISOString(), weekday: null, start_time: null });
  });

  it('a weekly match repeats on that day of the week', () => {
    const { input } = buildScheduleInput({ ...form, weekly: true, label: '' }, opts);
    expect(input).toMatchObject({ label: null, starts_at: null, weekday: 2, start_time: '20:00', timezone: 'Europe/Brussels' });
  });

  it('refuses a missing date and a match whose vote would already have opened', () => {
    expect(buildScheduleInput({ ...form, date: '' }, opts).error).toBe('schedule.dateMissing');
    expect(buildScheduleInput(form, { ...opts, now: at(22) }).error).toBe('schedule.inThePast');
    // Weekly: next week will do.
    expect(buildScheduleInput({ ...form, weekly: true }, { ...opts, now: at(22) }).error).toBeNull();
  });
});

describe('formatting', () => {
  it('formatDelay', () => {
    expect(formatDelay(90)).toBe('1 h 30');
    expect(formatDelay(120)).toBe('2 h');
    expect(formatDelay(45)).toBe('45 min');
  });

  it('localDateKey', () => {
    expect(localDateKey(new Date(at(20)))).toBe('2026-10-27');
  });
});
