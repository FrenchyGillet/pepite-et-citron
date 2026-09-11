import { describe, it, expect } from 'vitest';
import { deadlineFrom, extendDeadline, formatClockTime, formatDeadline, isDeadlinePassed } from './deadline';
import { buildReminderMessage, joinFrenchList } from './reminder';

const NOW = Date.parse('2026-09-11T20:00:00Z');
const inMin = (m: number) => new Date(NOW + m * 60_000).toISOString();

describe('deadline', () => {
  it('deadlineFrom: none, or now + minutes', () => {
    expect(deadlineFrom(NOW, null)).toBeNull();
    expect(deadlineFrom(NOW, 30)).toBe(inMin(30));
  });

  it('isDeadlinePassed', () => {
    expect(isDeadlinePassed(null, NOW)).toBe(false);
    expect(isDeadlinePassed(inMin(1), NOW)).toBe(false);
    expect(isDeadlinePassed(inMin(0), NOW)).toBe(true);
    expect(isDeadlinePassed(inMin(-5), NOW)).toBe(true);
  });

  it('extendDeadline adds 15 min to a future deadline, or restarts from now once passed', () => {
    expect(extendDeadline(inMin(10), NOW)).toBe(inMin(25));
    expect(extendDeadline(inMin(-30), NOW)).toBe(inMin(15));
    expect(extendDeadline(null, NOW)).toBe(inMin(15));
  });

  it('formatDeadline: minutes, hours, then the closing time once passed', () => {
    expect(formatDeadline(inMin(23), NOW)).toBe('Fermeture dans 23 min');
    expect(formatDeadline(inMin(22.2), NOW)).toBe('Fermeture dans 23 min'); // rounds up
    expect(formatDeadline(inMin(60), NOW)).toBe('Fermeture dans 1 h');
    expect(formatDeadline(inMin(65), NOW)).toBe('Fermeture dans 1 h 05');
    expect(formatDeadline(inMin(-1), NOW)).toBe(`Vote fermé à ${formatClockTime(inMin(-1))}`);
  });
});

describe('reminder message', () => {
  it('joinFrenchList', () => {
    expect(joinFrenchList(['Thomas'])).toBe('Thomas');
    expect(joinFrenchList(['Thomas', 'Léo'])).toBe('Thomas et Léo');
    expect(joinFrenchList(['Thomas', 'Léo', 'Max'])).toBe('Thomas, Léo et Max');
  });

  it('lists who is missing, the closing time and the link', () => {
    const text = buildReminderMessage({
      matchLabel: 'vs Dragons', pendingNames: ['Thomas', 'Léo'],
      voteUrl: 'https://pepite-citron.com/vote?org=fc', deadline: inMin(30), now: NOW,
    });
    expect(text).toBe([
      '⏰ vs Dragons : il manque encore les votes de Thomas et Léo.',
      `Fermeture à ${formatClockTime(inMin(30))}.`,
      'Votez ici 👉 https://pepite-citron.com/vote?org=fc',
    ].join('\n'));
  });

  it('singular, and no closing line without an open deadline', () => {
    const text = buildReminderMessage({ matchLabel: 'Match', pendingNames: ['Max'], voteUrl: 'u', now: NOW });
    expect(text).toBe('⏰ Match : il manque encore le vote de Max.\nVotez ici 👉 u');
  });
});
