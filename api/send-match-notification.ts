/**
 * POST /api/send-match-notification
 *
 * Envoie un email aux membres de l'organisation quand un match est ouvert.
 * Appelé côté client après createMatch, échec silencieux (ne bloque pas le vote).
 * Un email par membre, avec son lien de désinscription (en-tête
 * List-Unsubscribe compris) ; les membres désinscrits sont ignorés.
 *
 * Body: { orgId: string; matchLabel: string; matchId: string }
 * Auth: Bearer <user JWT>
 *
 * Envoi : api/_lib/email.ts (Resend si RESEND_API_KEY, sinon Brevo).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin as supabase } from './_lib/supabaseAdmin.js';
import { requireOrgMatchRunner } from './_lib/auth.js';
import { matchNotificationSchema } from './_lib/validation.js';
import { escapeHtml } from './_lib/http.js';
import { unsubscribeUrl } from './_lib/unsubscribe.js';
import { emailProvider, sendEmails } from './_lib/email.js';
import { renderVoteOpenEmail } from './_lib/voteOpenEmail.js';

const APP_URL = process.env.VITE_APP_URL || 'https://pepite-citron.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // No email provider configured — fail silently
  if (!emailProvider()) {
    console.warn('send-match-notification: no RESEND_API_KEY / BREVO_API_KEY, skipping');
    return res.status(200).json({ skipped: true });
  }

  const parsed = matchNotificationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Requête invalide' });
  const { orgId, matchLabel } = parsed.data;

  // Only an admin or captain of this org may notify its members.
  const auth = await requireOrgMatchRunner(req, orgId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  // Fetch org info (slug for the vote link)
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .single();

  if (!org) return res.status(404).json({ error: 'Équipe introuvable' });

  // Member emails live on auth.users, not org_members — go through the
  // SECURITY DEFINER RPC that joins them (get_org_members returns
  // { user_id, email, role }). Exclude the caller — they already know.
  const { data: members, error: membersErr } = await supabase
    .rpc('get_org_members', { target_org_id: orgId });

  if (membersErr) {
    console.error('get_org_members error:', membersErr);
    return res.status(200).json({ sent: 0 });
  }

  // Members who unsubscribed (20260018). Fail closed: when the preferences
  // cannot be read, send nothing rather than email people who opted out.
  const { data: optedOut, error: prefsErr } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('email_notifications', false);

  if (prefsErr) {
    console.error('email preferences error:', prefsErr);
    return res.status(200).json({ sent: 0 });
  }
  const optedOutIds = new Set(((optedOut ?? []) as Array<{ user_id: string }>).map(m => m.user_id));

  type OrgMemberRow = { user_id: string; email: string | null };
  const recipients = ((members ?? []) as OrgMemberRow[])
    .filter((m): m is { user_id: string; email: string } =>
      m.user_id !== auth.userId && Boolean(m.email) && !optedOutIds.has(m.user_id));

  if (recipients.length === 0) {
    return res.status(200).json({ sent: 0 });
  }

  // All interpolated values are escaped — matchLabel comes from the request body.
  const safeLabel   = escapeHtml(matchLabel);
  const safeOrgName = escapeHtml(org.name ?? '');
  // "/" is the marketing landing page (vercel.json): link the vote screen.
  const voteUrl = org.slug
    ? `${APP_URL}/vote?org=${encodeURIComponent(org.slug)}`
    : `${APP_URL}/vote`;

  const { sent } = await sendEmails(recipients.map(({ user_id, email }) => {
    const unsubscribe = unsubscribeUrl(APP_URL, user_id, orgId);
    return {
      to:      email,
      subject: `⭐ Vote ouvert : ${matchLabel}`,
      html:    renderVoteOpenEmail({ safeLabel, safeOrgName, voteUrl, unsubscribe, appUrl: APP_URL }),
      // One-click unsubscribe in Gmail / Apple Mail (RFC 8058).
      headers: {
        'List-Unsubscribe':      `<${unsubscribe}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };
  }));

  return res.status(200).json({ sent });
}
