import { isNetworkError } from '@/utils/offlineVote';

/**
 * Turns any thrown error into a short French message for the UI (audit U8).
 *
 * Our own messages (server RPCs, API endpoints, api.ts) are already French and
 * pass through unchanged. Raw Supabase/PostgREST/Postgres text ("new row
 * violates row-level security policy…", "JWT expired") is mapped to a readable
 * message, or replaced by `fallback` — the detail goes to the console.
 */
const KNOWN: Array<[RegExp, string]> = [
  [/jwt expired|invalid jwt|refresh token|not authenticated|non authentifi|non connect/i,
    'Ta session a expiré. Reconnecte-toi.'],
  [/row-level security|permission denied|forbidden|42501|not allowed/i,
    "Tu n'as pas les droits pour faire ça."],
  [/duplicate key|unique constraint|already exists|23505/i,
    'Cet élément existe déjà.'],
  [/foreign key|23503/i,
    'Impossible : cet élément est encore utilisé ailleurs.'],
  [/invalid login credentials/i,
    'Email ou mot de passe incorrect.'],
  [/user already registered/i,
    'Un compte existe déjà avec cet email. Connecte-toi plutôt.'],
  [/email not confirmed/i,
    'Confirme ton adresse email avant de te connecter (regarde dans ta boîte mail).'],
  [/password should be at least|weak password/i,
    'Ce mot de passe est trop court.'],
  [/same password|should be different/i,
    "Choisis un mot de passe différent de l'ancien."],
  [/rate limit|too many requests|\b429\b/i,
    'Trop de tentatives. Patiente une minute et réessaie.'],
  [/timeout|timed out|délai/i,
    'Le serveur met trop de temps à répondre. Réessaie.'],
];

// English words and Postgres jargon that never appear in our French messages.
const TECHNICAL = /\b(the|is|not|of|for|failed|error|invalid|violates|column|relation|function|does|null value|syntax|constraint|unexpected|undefined|cannot|PGRST\w*)\b/i;

export const GENERIC_ERROR = 'Une erreur est survenue. Réessaie.';

export function humanizeError(err: unknown, fallback: string = GENERIC_ERROR): string {
  if (isNetworkError(err)) return 'Pas de connexion. Vérifie ton réseau et réessaie.';

  const message = (err instanceof Error ? err.message : typeof err === 'string' ? err : '').trim();
  if (!message) return fallback;

  for (const [pattern, text] of KNOWN) {
    if (pattern.test(message)) return text;
  }
  if (TECHNICAL.test(message)) {
    console.warn('humanizeError: technical message hidden from the user:', err);
    return fallback;
  }
  return message;
}
