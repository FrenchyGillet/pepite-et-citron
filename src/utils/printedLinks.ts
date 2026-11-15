/**
 * Addresses printed on physical goods (QR codes): they must keep working
 * forever. Change a destination here, never the printed path.
 *
 * Used twice, so the link works even if one layer is skipped:
 *  - middleware.ts (Vercel Edge Middleware): 302 before the app loads;
 *  - main.tsx: if the app loads on the printed path anyway (redirect not
 *    deployed yet, middleware skipped), it rewrites the URL before routing.
 *
 * Pure (no DOM, no app imports): it also runs in the Edge runtime.
 */

// ⚠️ https://pepite-citron.com/sweat is PRINTED on promotional sweatshirts (QR
// code). /start has no language prefix: the app picks the language (device
// choice, else browser), so the redirect never forces French.
export const SWEAT_DESTINATION = '/start?utm_source=sweat&utm_medium=qr&utm_campaign=sweat';

// /sweat, /sweat/, /SWEAT, /Sweat/… (also listed in middleware.ts config.matcher).
const SWEAT_PATH = /^\/sweat\/?$/i;

/**
 * Where a printed link goes (path + query), or null for any other path.
 * Query parameters already on the scanned URL are kept, and win over the
 * destination's (e.g. /sweat?utm_campaign=sweat2 for a second batch).
 */
export function printedLinkTarget(pathname: string, search: string): string | null {
  if (!SWEAT_PATH.test(pathname)) return null;
  const [path, query = ''] = SWEAT_DESTINATION.split('?');
  const params = new URLSearchParams(query);
  new URLSearchParams(search).forEach((value, key) => params.set(key, value));
  return `${path}?${params.toString()}`;
}
