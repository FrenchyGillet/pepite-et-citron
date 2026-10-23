import { isNetworkError } from '@/utils/offlineVote';
import { fr } from '@/i18n/fr';
import { t, type TKey } from '@/i18n';

/**
 * Turns any thrown error into a short message for the UI, in the user's
 * language (audit U8).
 *
 * Our own messages (server RPCs, API endpoints) are French: the known ones are
 * shown translated (errors.server in i18n), the others pass through unchanged. Raw Supabase/PostgREST/Postgres text ("new row
 * violates row-level security policy…", "JWT expired") is mapped to a readable
 * message, or replaced by `fallback` — the detail goes to the console.
 */
const KNOWN: Array<[RegExp, TKey]> = [
  [/jwt expired|invalid jwt|refresh token|not authenticated|non authentifi|non connect/i,
    'errors.sessionExpired'],
  [/row-level security|permission denied|forbidden|42501|not allowed/i,
    'errors.forbidden'],
  [/duplicate key|unique constraint|already exists|23505/i,
    'errors.duplicate'],
  [/foreign key|23503/i,
    'errors.inUse'],
  [/invalid login credentials/i,
    'errors.badCredentials'],
  [/user already registered/i,
    'errors.alreadyRegistered'],
  [/email not confirmed/i,
    'errors.emailNotConfirmed'],
  [/password should be at least|weak password/i,
    'errors.weakPassword'],
  [/same password|should be different/i,
    'errors.samePassword'],
  [/rate limit|too many requests|\b429\b/i,
    'errors.rateLimit'],
  [/timeout|timed out|délai/i,
    'errors.timeout'],
];

// English words and Postgres jargon that never appear in our French messages.
const TECHNICAL = /\b(the|is|not|of|for|failed|error|invalid|violates|column|relation|function|does|null value|syntax|constraint|unexpected|undefined|cannot|PGRST\w*)\b/i;

/**
 * An error whose message is already written for the user, in their language
 * (api.ts, quick start…): shown as is, never mistaken for technical English.
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

/** French message from the server → its key ("Aucun compte trouvé pour x@y" too). */
const SERVER = Object.entries(fr.errors.server) as Array<[keyof typeof fr.errors.server, string]>;
function serverMessage(message: string): string | null {
  const strip = (s: string) => s.replace(/[.\s]+$/, '');
  if (/^Aucun compte trouvé pour /.test(message)) return t('errors.server.noAccount');
  const lastAdmin = /^Tu es le seul administrateur de (.+)\. Nomme/.exec(message);
  if (lastAdmin) return t('errors.server.lastAdmin', { names: lastAdmin[1] });
  const hit = SERVER.find(([, text]) => strip(text) === strip(message));
  return hit ? t(`errors.server.${hit[0]}`) : null;
}

export function genericError(): string {
  return t('errors.generic');
}

export function humanizeError(err: unknown, fallback: string = genericError()): string {
  if (isNetworkError(err)) return t('errors.offline');

  if (err instanceof UserError) return err.message;
  const message = (err instanceof Error ? err.message : typeof err === 'string' ? err : '').trim();
  if (!message) return fallback;

  const server = serverMessage(message);
  if (server) return server;
  for (const [pattern, key] of KNOWN) {
    if (pattern.test(message)) return t(key);
  }
  if (TECHNICAL.test(message)) {
    console.warn('humanizeError: technical message hidden from the user:', err);
    return fallback;
  }
  return message;
}
