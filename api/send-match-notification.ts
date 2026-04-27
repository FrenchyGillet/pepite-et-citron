/**
 * POST /api/send-match-notification
 *
 * Envoie un email à tous les membres de l'organisation quand un match est ouvert.
 * Appelé côté client après createMatch, échec silencieux (ne bloque pas le vote).
 *
 * Body: { orgId: string; matchLabel: string; matchId: string }
 * Auth: Bearer <user JWT>
 */
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL        = process.env.VITE_APP_URL || 'https://pepite-citron.com';
const FROM_EMAIL     = 'Pépite & Citron <noreply@pepite-citron.com>';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Require RESEND_API_KEY — fail silently if not configured
  if (!RESEND_API_KEY) {
    console.warn('send-match-notification: RESEND_API_KEY not set, skipping');
    return res.status(200).json({ skipped: true });
  }

  // Verify caller JWT
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { orgId, matchLabel } = req.body as {
    orgId?: string;
    matchLabel?: string;
  };
  if (!orgId || !matchLabel) return res.status(400).json({ error: 'Missing params' });

  // Fetch org info (slug for the vote link)
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .single();

  if (!org) return res.status(404).json({ error: 'Org not found' });

  // Fetch all org members with emails (excluding the caller — they already know)
  const { data: members } = await supabase
    .from('org_members')
    .select('email, role')
    .eq('org_id', orgId)
    .neq('user_id', user.id);

  const recipients = (members ?? []).map(m => m.email).filter(Boolean);
  if (recipients.length === 0) {
    return res.status(200).json({ sent: 0 });
  }

  const voteUrl = org.slug
    ? `${APP_URL}/?org=${org.slug}`
    : APP_URL;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:system-ui,-apple-system,sans-serif;color:#fff">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;padding:32px 24px">
    <tr><td>
      <p style="font-size:22px;font-weight:800;letter-spacing:-0.5px;margin:0 0 4px">
        <span style="color:#FFD700">Pépite</span> &amp; <span style="color:#32D74B">Citron</span>
      </p>
      <p style="font-size:13px;color:rgba(235,235,245,0.4);margin:0 0 32px">${org.name}</p>

      <p style="font-size:18px;font-weight:700;margin:0 0 8px">⭐ Vote ouvert !</p>
      <p style="font-size:15px;color:rgba(235,235,245,0.7);margin:0 0 24px;line-height:1.5">
        Un vote a été lancé pour <strong style="color:#fff">${matchLabel}</strong>.
        Désigne la pépite et le citron de ce match !
      </p>

      <a href="${voteUrl}"
         style="display:inline-block;background:#FFD700;color:#000;font-size:15px;font-weight:700;
                padding:14px 28px;border-radius:12px;text-decoration:none;margin-bottom:24px">
        Voter maintenant →
      </a>

      <p style="font-size:11px;color:rgba(235,235,245,0.25);margin:24px 0 0;line-height:1.6">
        Tu reçois cet email parce que tu es membre de l'équipe ${org.name} sur Pépite &amp; Citron.<br>
        <a href="${APP_URL}/admin" style="color:rgba(235,235,245,0.4)">Gérer les notifications</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      recipients,
        subject: `⭐ Vote ouvert — ${matchLabel}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Resend error:', err);
      return res.status(200).json({ sent: 0, error: err });
    }

    return res.status(200).json({ sent: recipients.length });
  } catch (err) {
    console.error('send-match-notification failed:', err);
    // Fail silently — email is best-effort, should not block the vote
    return res.status(200).json({ sent: 0 });
  }
}
