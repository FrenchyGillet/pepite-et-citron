import { supabase } from '@/lib/supabase';

/**
 * POSTs JSON to one of our serverless functions (/api/*) with the user's
 * access token. On a 401 it refreshes the session once and retries: a PWA
 * left open for hours can still hold an expired token, and the server then
 * answers "Session invalide" although the user is signed in.
 */
export async function postToApi(path: string, body: unknown): Promise<Response> {
  const send = (token: string) => fetch(path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify(body),
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Session expirée, reconnecte-toi.');

  const res = await send(session.access_token);
  if (res.status !== 401) return res;

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error || !refreshed.session?.access_token) return res;
  return send(refreshed.session.access_token);
}
