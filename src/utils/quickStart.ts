import { signupSchema } from '@/schemas';
import { parsePlayerNames } from '@/utils/player';
import { toSlug } from '@/utils/slug';

/** A vote needs at least 3 present players (each voter picks 2 others). */
export const QUICK_START_MIN_PLAYERS = 3;

/** 3 pépites by default; 2 when the squad is too small for 3 (voter + 3 others). */
export function quickStartPepiteCount(playerCount: number): 2 | 3 {
  return playerCount >= 4 ? 3 : 2;
}

/** "Match du 6 oct." — the first match is named for the organiser. */
export function defaultMatchLabel(date: Date = new Date()): string {
  return `Match du ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

/** Slug of the vote link; a name with no usable letters still gets one. */
export function teamSlug(name: string): string {
  const slug = toSlug(name);
  return slug.length >= 2 ? slug : 'equipe';
}

export interface QuickStartForm {
  teamName: string;
  playersText: string;
  email: string;
  password: string;
}

export type QuickStartField = keyof QuickStartForm;

/** Validates the one-screen form; `names` are the players to create. */
export function validateQuickStart(form: QuickStartForm): {
  errors: Partial<Record<QuickStartField, string>>;
  names: string[];
} {
  const errors: Partial<Record<QuickStartField, string>> = {};
  const teamName = form.teamName.trim();
  if (teamName.length < 2) errors.teamName = "Donne un nom à ton équipe.";
  else if (teamName.length > 60) errors.teamName = 'Trop long (60 caractères max).';

  const { toAdd: names, tooLong } = parsePlayerNames(form.playersText, []);
  if (tooLong.length) errors.playersText = `Prénom trop long : ${tooLong[0]}`;
  else if (names.length < QUICK_START_MIN_PLAYERS) {
    errors.playersText = `Ajoute au moins ${QUICK_START_MIN_PLAYERS} joueurs pour lancer un vote.`;
  }

  const email = signupSchema.shape.email.safeParse(form.email.trim());
  if (!email.success) errors.email = 'Adresse email invalide.';
  const password = signupSchema.shape.password.safeParse(form.password);
  if (!password.success) errors.password = 'Au moins 8 caractères.';

  return { errors, names };
}
