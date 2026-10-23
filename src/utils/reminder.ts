import { formatClockTime, isDeadlinePassed } from '@/utils/deadline';
import { t } from '@/i18n';

/** "Thomas", "Thomas et Léo", "Thomas, Léo et Max" (and in English). */
export function joinFrenchList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ${t('reminder.and')} ${names[names.length - 1]}`;
}

interface ReminderMessage {
  matchLabel: string;
  pendingNames: string[];
  voteUrl: string;
  deadline?: string | null;
  now?: number;
}

/**
 * The text the admin shares (WhatsApp, SMS…) to nudge players who have not
 * voted yet — reaches everyone, account or not (audit F1).
 */
export function buildReminderMessage({ matchLabel, pendingNames, voteUrl, deadline, now = Date.now() }: ReminderMessage): string {
  const lines = [
    t(pendingNames.length > 1 ? 'reminder.missingMany' : 'reminder.missingOne',
      { match: matchLabel, names: joinFrenchList(pendingNames) }),
    deadline && !isDeadlinePassed(deadline, now) ? t('reminder.closesAt', { time: formatClockTime(deadline) }) : '',
    t('reminder.voteHere', { url: voteUrl }),
  ];
  return lines.filter(Boolean).join('\n');
}
