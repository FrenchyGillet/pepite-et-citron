/**
 * GET/POST /api/unsubscribe?u=<userId>&o=<orgId>&t=<signature>
 *
 * Target of the unsubscribe link in every team email (audit F10), usable
 * without signing in. GET only shows a confirmation page — mail scanners
 * pre-open links and must not unsubscribe anyone. POST (the page's button, or
 * a mail client's one-click List-Unsubscribe) records the choice.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin as supabase } from './_lib/supabaseAdmin';
import { verifyUnsubscribeToken } from './_lib/unsubscribe';
import { escapeHtml } from './_lib/http';

const APP_URL = process.env.VITE_APP_URL || 'https://pepite-citron.com';

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · Pépite &amp; Citron</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#000;color:#fff;font-family:system-ui,-apple-system,sans-serif;padding:24px}
  main{max-width:380px;width:100%;background:#1c1c1e;border-radius:16px;padding:32px 24px;text-align:center}
  h1{font-size:20px;margin:0 0 12px}
  p{font-size:15px;line-height:1.5;color:rgba(235,235,245,.75);margin:0 0 20px}
  button,a.btn{display:inline-block;width:100%;box-sizing:border-box;padding:14px;border-radius:12px;border:0;
       background:#ffd60a;color:#000;font-size:15px;font-weight:700;text-decoration:none;cursor:pointer}
  a{color:#ffd60a}
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const userId = String(req.query.u ?? '');
  const orgId  = String(req.query.o ?? '');
  const token  = String(req.query.t ?? '');
  const manage = `Tu peux gérer tes emails dans l'app : <a href="${APP_URL}/profile">Profil → Emails de vote</a>.`;

  if (!verifyUnsubscribeToken(userId, orgId, token)) {
    return res.status(400).send(page('Lien invalide',
      `<h1>Lien invalide</h1><p>Ce lien de désinscription n'est pas valide ou a été modifié.</p><p>${manage}</p>`));
  }

  const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).maybeSingle();
  const team = escapeHtml((org as { name?: string } | null)?.name ?? 'ton équipe');

  if (req.method === 'GET') {
    const action = `?${new URLSearchParams({ u: userId, o: orgId, t: token }).toString()}`;
    return res.status(200).send(page('Se désinscrire',
      `<h1>Ne plus recevoir les emails de vote ?</h1>
       <p>Tu ne recevras plus d'email quand un vote est ouvert dans <strong>${team}</strong>.</p>
       <form method="post" action="${escapeHtml(action)}"><button type="submit">Me désinscrire</button></form>`));
  }

  const { error } = await supabase
    .from('org_members')
    .update({ email_notifications: false })
    .eq('user_id', userId)
    .eq('org_id', orgId);
  if (error) {
    console.error('unsubscribe failed:', error);
    return res.status(500).send(page('Erreur',
      `<h1>Oups</h1><p>La désinscription n'a pas pu être enregistrée. Réessaie dans un instant.</p><p>${manage}</p>`));
  }

  return res.status(200).send(page('Désinscription confirmée',
    `<h1>C'est noté ✓</h1>
     <p>Tu ne recevras plus d'emails de vote de <strong>${team}</strong>.</p>
     <p>Tu peux les réactiver quand tu veux dans l'app : <a href="${APP_URL}/profile">Profil → Emails de vote</a>.</p>`));
}
