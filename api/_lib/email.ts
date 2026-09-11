/**
 * Transactional email for the team notifications.
 *
 * Provider: Resend when RESEND_API_KEY is set (it also sends the Supabase
 * auth emails, so the domain is verified there), else Brevo (BREVO_API_KEY).
 * Sender: EMAIL_FROM (default noreply@pepite-citron.com — its domain must be
 * verified with the provider), optional EMAIL_REPLY_TO.
 * Env is read at call time.
 */
export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

export type EmailProvider = 'resend' | 'brevo';

const FROM_NAME = 'Pépite & Citron';
// Resend's batch endpoint takes up to 100 emails per call; one call per team
// also stays clear of its per-second rate limit.
const RESEND_BATCH_SIZE = 100;

export function emailProvider(): EmailProvider | null {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.BREVO_API_KEY)  return 'brevo';
  return null;
}

function fromEmail(): string {
  return process.env.EMAIL_FROM || 'noreply@pepite-citron.com';
}

/** Sends the emails; never throws. Provider errors are logged server-side only. */
export async function sendEmails(emails: OutgoingEmail[]): Promise<{ sent: number; failed: number }> {
  const provider = emailProvider();
  if (!provider || emails.length === 0) return { sent: 0, failed: emails.length };
  return provider === 'resend' ? sendWithResend(emails) : sendWithBrevo(emails);
}

async function sendWithResend(emails: OutgoingEmail[]): Promise<{ sent: number; failed: number }> {
  const replyTo = process.env.EMAIL_REPLY_TO;
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < emails.length; i += RESEND_BATCH_SIZE) {
    const chunk = emails.slice(i, i + RESEND_BATCH_SIZE);
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk.map(e => ({
          from:    `${FROM_NAME} <${fromEmail()}>`,
          to:      [e.to],
          subject: e.subject,
          html:    e.html,
          ...(replyTo ? { reply_to: replyTo } : {}),
          ...(e.headers ? { headers: e.headers } : {}),
        }))),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
      sent += chunk.length;
    } catch (err) {
      console.error('email (resend) failed:', err);
      failed += chunk.length;
    }
  }
  return { sent, failed };
}

async function sendWithBrevo(emails: OutgoingEmail[]): Promise<{ sent: number; failed: number }> {
  const replyTo = process.env.EMAIL_REPLY_TO;
  const results = await Promise.allSettled(emails.map(async e => {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'api-key':      process.env.BREVO_API_KEY as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender:      { name: FROM_NAME, email: fromEmail() },
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
        to:          [{ email: e.to }],
        subject:     e.subject,
        htmlContent: e.html,
        ...(e.headers ? { headers: e.headers } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  }));
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failures.length > 0) console.error('email (brevo) failures:', failures.map(f => String(f.reason)));
  return { sent: results.length - failures.length, failed: failures.length };
}
