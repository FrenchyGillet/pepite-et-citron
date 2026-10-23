/**
 * POST /api/cron/scheduled-matches
 *
 * Called every 5 minutes by pg_cron (pg_net), with the shared CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * run_scheduled_matches (20260021) opens the scheduled votes that are due and
 * returns the worklist:
 *   - opened: a scheduled vote not announced yet (opened now, or earlier by a
 *     player's visit). The organiser and the captains are told to share the
 *     link and reveal; the other members get the usual "vote ouvert".
 *   - blocked: the occurrence was skipped because the previous vote is still
 *     open or being revealed. Only the organiser and the captains are told.
 * Push to devices, email to members who did not unsubscribe (20260018).
 * Messages are French, as every server-side message for now.
 */
import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin as supabase } from '../_lib/supabaseAdmin.js';
import { escapeHtml } from '../_lib/http.js';
import { unsubscribeUrl } from '../_lib/unsubscribe.js';
import { emailProvider, sendEmails, type OutgoingEmail } from '../_lib/email.js';
import { pushToOrg } from '../_lib/push.js';
import { renderVoteOpenEmail } from '../_lib/voteOpenEmail.js';

const APP_URL = process.env.VITE_APP_URL || 'https://pepite-citron.com';

interface WorkItem {
  status: 'opened' | 'blocked';
  org_id: string;
  match_id: number | null;
  label: string | null;
  kick_off: string;
  timezone: string;
}

interface Member { user_id: string; email: string | null; role: string }

function authorized(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization ?? '';
  const given  = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** "mardi 28/10" in the schedule's timezone. */
function matchDay(iso: string, timezone: string): string {
  return new Date(iso).toLocaleDateString('fr-BE', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: timezone });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!authorized(req)) return res.status(401).json({ error: 'Non autorisé' });

  const { data, error } = await supabase.rpc('run_scheduled_matches');
  if (error) {
    console.error('run_scheduled_matches:', error);
    return res.status(500).json({ error: 'run_scheduled_matches failed' });
  }
  const items = (data ?? []) as WorkItem[];

  let pushed = 0;
  const emails: OutgoingEmail[] = [];
  for (const item of items) {
    const result = await notify(item);
    pushed += result.pushed;
    emails.push(...result.emails);
  }
  const { sent: emailed } = emails.length && emailProvider() ? await sendEmails(emails) : { sent: 0 };

  return res.status(200).json({
    opened:  items.filter(i => i.status === 'opened').length,
    blocked: items.filter(i => i.status === 'blocked').length,
    pushed, emailed,
  });
}

async function notify(item: WorkItem): Promise<{ pushed: number; emails: OutgoingEmail[] }> {
  const [{ data: org }, { data: members }, { data: optedOut }] = await Promise.all([
    supabase.from('organizations').select('name, slug').eq('id', item.org_id).maybeSingle(),
    supabase.rpc('get_org_members', { target_org_id: item.org_id }),
    supabase.from('org_members').select('user_id').eq('org_id', item.org_id).eq('email_notifications', false),
  ]);
  if (!org) return { pushed: 0, emails: [] };

  const all      = (members ?? []) as Member[];
  const runners  = all.filter(m => m.role === 'admin' || m.role === 'captain');
  const runnerIds = runners.map(m => m.user_id);
  const noEmail  = new Set(((optedOut ?? []) as Array<{ user_id: string }>).map(m => m.user_id));
  const orgName  = (org as { name: string }).name ?? '';
  const slug     = (org as { slug: string | null }).slug;
  const voteUrl  = slug ? `${APP_URL}/vote?org=${encodeURIComponent(slug)}` : `${APP_URL}/vote`;
  const day      = matchDay(item.kick_off, item.timezone);
  const label    = item.label ?? `le match de ${day}`;

  const emailTo = (list: Member[], subject: string, html: (unsubscribe: string) => string): OutgoingEmail[] =>
    list.filter((m): m is Member & { email: string } => !!m.email && !noEmail.has(m.user_id)).map(m => {
      const unsubscribe = unsubscribeUrl(APP_URL, m.user_id, item.org_id);
      return {
        to: m.email, subject, html: html(unsubscribe),
        headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      };
    });

  if (item.status === 'blocked') {
    const body = `Le vote de ${day} n'a pas été ouvert : dévoile ou clos d'abord le vote précédent.`;
    const pushed = await pushToOrg(item.org_id,
      { type: 'schedule_blocked', title: '⏸️ Vote non ouvert', body, url: `${APP_URL}/admin` },
      { userIds: runnerIds });
    return {
      pushed,
      emails: emailTo(runners, `⏸️ Vote non ouvert : ${label}`, unsubscribe =>
        renderOrganiserEmail({ orgName, title: '⏸️ Vote non ouvert', body, ctaUrl: `${APP_URL}/admin`, ctaLabel: 'Ouvrir l’Admin', unsubscribe })),
    };
  }

  const organiserBody = `Partage le lien dans le groupe, puis dévoile les résultats quand tout le monde a voté.`;
  const pushed =
    await pushToOrg(item.org_id,
      { type: 'vote_open', title: `🗳️ Vote ouvert : ${label}`, body: organiserBody, url: `${APP_URL}/admin` },
      { userIds: runnerIds }) +
    await pushToOrg(item.org_id,
      { type: 'vote_open', title: '🗳️ Vote ouvert !', body: `Désigne la pépite et le citron de ${label}`, url: `${APP_URL}/vote` },
      { exceptUserIds: runnerIds });

  const safeLabel = escapeHtml(label);
  const safeOrgName = escapeHtml(orgName);
  return {
    pushed,
    emails: [
      ...emailTo(runners, `🗳️ Vote ouvert : ${label}`, unsubscribe =>
        renderOrganiserEmail({ orgName, title: `🗳️ Le vote de ${label} est ouvert`, body: organiserBody,
          extra: voteUrl, ctaUrl: `${APP_URL}/admin`, ctaLabel: 'Ouvrir l’Admin', unsubscribe })),
      ...emailTo(all.filter(m => !runnerIds.includes(m.user_id)), `⭐ Vote ouvert : ${label}`, unsubscribe =>
        renderVoteOpenEmail({ safeLabel, safeOrgName, voteUrl: escapeHtml(voteUrl), unsubscribe, appUrl: APP_URL })),
    ],
  };
}

function renderOrganiserEmail({ orgName, title, body, extra, ctaUrl, ctaLabel, unsubscribe }: {
  orgName: string; title: string; body: string; extra?: string; ctaUrl: string; ctaLabel: string; unsubscribe: string;
}): string {
  const safeOrgName = escapeHtml(orgName);
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
      <p style="font-size:18px;font-weight:700;margin:0 0 8px">${escapeHtml(title)}</p>
      <p style="font-size:15px;color:rgba(235,235,245,0.75);margin:0 0 16px;line-height:1.5">${escapeHtml(body)}</p>
      ${extra ? `<p style="font-size:14px;margin:0 0 20px;word-break:break-all"><a href="${escapeHtml(extra)}" style="color:#FFD700">${escapeHtml(extra)}</a></p>` : ''}
      <a href="${escapeHtml(ctaUrl)}"
         style="display:inline-block;background:#FFD700;color:#000;font-size:15px;font-weight:700;
                padding:14px 28px;border-radius:12px;text-decoration:none;margin-bottom:24px">
        ${escapeHtml(ctaLabel)} →
      </a>
      <p style="font-size:12px;color:rgba(235,235,245,0.5);margin:24px 0 0;line-height:1.6">
        Tu reçois cet email parce que tu organises les votes de ${safeOrgName} sur Pépite &amp; Citron.<br>
        <a href="${unsubscribe}" style="color:rgba(235,235,245,0.7)">Ne plus recevoir ces emails</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}
