/**
 * POST /api/send-welcome-email
 *
 * Email de bienvenue à l'organisateur, envoyé une fois son équipe créée par
 * /start : le lien de vote de l'équipe, comment dévoiler, le lien de l'app.
 * Appelé côté client sans attendre la réponse (ne bloque pas le parcours).
 * Ne remplace pas une confirmation d'adresse : la connexion n'en dépend pas.
 *
 * Body: { orgId: string }
 * Auth: Bearer <user JWT> ; l'appelant doit être admin de l'équipe.
 * Envoyé seulement dans l'heure qui suit la création de l'équipe, à
 * l'adresse du compte appelant : un appel rejoué plus tard n'envoie rien.
 *
 * Envoi : api/_lib/email.ts (Resend si RESEND_API_KEY, sinon Brevo).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin as supabase } from './_lib/supabaseAdmin.js';
import { requireOrgAdmin } from './_lib/auth.js';
import { welcomeEmailSchema } from './_lib/validation.js';
import { escapeHtml } from './_lib/http.js';
import { emailProvider, sendEmails } from './_lib/email.js';

const APP_URL = process.env.VITE_APP_URL || 'https://pepite-citron.com';
const SEND_WINDOW_MS = 60 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!emailProvider()) {
    console.warn('send-welcome-email: no RESEND_API_KEY / BREVO_API_KEY, skipping');
    return res.status(200).json({ skipped: true });
  }

  const parsed = welcomeEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Requête invalide' });
  const { orgId } = parsed.data;

  const auth = await requireOrgAdmin(req, orgId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .eq('id', orgId)
    .single();
  if (!org) return res.status(404).json({ error: 'Équipe introuvable' });

  // Only right after the team was created: never a second welcome later.
  const age = Date.now() - new Date(org.created_at as string).getTime();
  if (!(age >= 0 && age <= SEND_WINDOW_MS)) return res.status(200).json({ sent: 0 });

  const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(auth.userId);
  const email = userData?.user?.email;
  if (userErr || !email) {
    if (userErr) console.error('send-welcome-email getUserById:', userErr);
    return res.status(200).json({ sent: 0 });
  }

  const orgName = (org.name as string | null) ?? '';
  // "/" is the marketing landing page (vercel.json): link the app screens.
  const voteUrl = org.slug
    ? `${APP_URL}/vote?org=${encodeURIComponent(org.slug as string)}`
    : `${APP_URL}/vote`;

  const { sent } = await sendEmails([{
    to:      email,
    subject: `⭐ ${orgName} est prête sur Pépite & Citron`,
    html:    renderEmail({
      safeOrgName: escapeHtml(orgName),
      safeEmail:   escapeHtml(email),
      voteUrl:     escapeHtml(voteUrl),
    }),
  }]);

  return res.status(200).json({ sent });
}

function renderEmail({ safeOrgName, safeEmail, voteUrl }: {
  safeOrgName: string; safeEmail: string; voteUrl: string;
}): string {
  const h2   = 'font-size:16px;font-weight:700;margin:28px 0 8px';
  const text = 'font-size:15px;color:rgba(235,235,245,0.75);margin:0 0 12px;line-height:1.5';
  const muted = 'color:rgba(235,235,245,0.7)';
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:system-ui,-apple-system,sans-serif;color:#fff">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;padding:32px 24px">
    <tr><td>
      <p style="font-size:22px;font-weight:800;letter-spacing:-0.5px;margin:0 0 4px">
        <span style="color:#FFD700">Pépite</span> &amp; <span style="color:#aadd00">Citron</span>
      </p>
      <p style="font-size:13px;color:rgba(235,235,245,0.6);margin:0 0 32px">${safeOrgName}</p>

      <p style="font-size:20px;font-weight:800;margin:0 0 8px">Bienvenue ! Ton équipe est prête 🎉</p>
      <p style="${text}">
        ${safeOrgName} a son premier vote ouvert. Garde cet email : tout ce qu'il faut pour la suite est ici.
      </p>

      <p style="${h2}">1. Le lien de vote de l'équipe</p>
      <p style="${text}">
        Envoie-le dans le groupe de l'équipe. Chaque joueur choisit son prénom et vote depuis son
        téléphone, sans compte ni app à installer. C'est le même lien à chaque match.
      </p>
      <p style="font-size:14px;margin:0 0 12px;word-break:break-all">
        <a href="${voteUrl}" style="color:#FFD700">${voteUrl}</a>
      </p>

      <p style="${h2}">2. Dévoiler les résultats</p>
      <p style="${text}">
        Quand tout le monde a voté, ouvre l'onglet <strong style="color:#fff">Admin</strong> et touche
        <strong style="color:#fff">Lancer le dépouillement</strong>. Les votes se révèlent un par un
        dans l'onglet Résultats : à faire tous ensemble, c'est là que ça devient drôle.
      </p>
      <p style="${text}">
        Un vote qui ne reçoit aucun bulletin se ferme tout seul au bout de 24 h.
      </p>

      <p style="${h2}">3. Au prochain match</p>
      <p style="${text}">
        Admin, puis <strong style="color:#fff">Match du soir</strong> : coche les présents et lance le vote,
        en quelques secondes.
      </p>

      <a href="${APP_URL}/admin"
         style="display:inline-block;background:#FFD700;color:#000;font-size:15px;font-weight:700;
                padding:14px 28px;border-radius:12px;text-decoration:none;margin:20px 0 8px">
        Ouvrir Pépite &amp; Citron →
      </a>

      <p style="font-size:12px;color:rgba(235,235,245,0.5);margin:28px 0 0;line-height:1.6">
        Tu reçois cet email parce que tu viens de créer l'équipe ${safeOrgName} avec l'adresse ${safeEmail}.
        Connecte-toi avec cette adresse ; mot de passe oublié ?
        <a href="${APP_URL}/login" style="${muted}">Le réinitialiser</a>.<br>
        Ce n'est pas toi ? Ignore cet email.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}
