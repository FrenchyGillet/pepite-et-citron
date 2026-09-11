import { formatClockTime, isDeadlinePassed } from '@/utils/deadline';

/** "Thomas", "Thomas et Léo", "Thomas, Léo et Max". */
export function joinFrenchList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
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
    `⏰ ${matchLabel} : il manque encore ${pendingNames.length > 1 ? 'les votes de' : 'le vote de'} ${joinFrenchList(pendingNames)}.`,
    deadline && !isDeadlinePassed(deadline, now) ? `Fermeture à ${formatClockTime(deadline)}.` : '',
    `Votez ici 👉 ${voteUrl}`,
  ];
  return lines.filter(Boolean).join('\n');
}
