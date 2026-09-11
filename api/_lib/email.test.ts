import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emailProvider, sendEmails } from './email';

const fetchMock = vi.fn();
const email = (to: string) => ({
  to, subject: 'Vote ouvert', html: '<p>hi</p>',
  headers: { 'List-Unsubscribe': `<https://x/api/unsubscribe?u=${to}>` },
});

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockResolvedValue({ ok: true, text: async () => '' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubEnv('RESEND_API_KEY', '');
  vi.stubEnv('BREVO_API_KEY', '');
  vi.stubEnv('EMAIL_FROM', '');
  vi.stubEnv('EMAIL_REPLY_TO', '');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const bodyOf = (i: number) => JSON.parse(fetchMock.mock.calls[i][1].body);

describe('emailProvider', () => {
  it('prefers Resend, falls back to Brevo, else none', () => {
    expect(emailProvider()).toBeNull();
    vi.stubEnv('BREVO_API_KEY', 'b');
    expect(emailProvider()).toBe('brevo');
    vi.stubEnv('RESEND_API_KEY', 'r');
    expect(emailProvider()).toBe('resend');
  });
});

describe('sendEmails — Resend', () => {
  beforeEach(() => vi.stubEnv('RESEND_API_KEY', 're_test'));

  it('sends the whole team in one batch call, each with its own headers', async () => {
    const result = await sendEmails([email('a@x.com'), email('b@x.com')]);
    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails/batch');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    const batch = bodyOf(0);
    expect(batch).toHaveLength(2);
    expect(batch[0]).toMatchObject({
      from: 'Pépite & Citron <noreply@pepite-citron.com>',
      to: ['a@x.com'], subject: 'Vote ouvert', html: '<p>hi</p>',
      headers: { 'List-Unsubscribe': '<https://x/api/unsubscribe?u=a@x.com>' },
    });
    expect(batch[1].to).toEqual(['b@x.com']);
  });

  it('uses EMAIL_FROM and EMAIL_REPLY_TO when set', async () => {
    vi.stubEnv('EMAIL_FROM', 'equipe@pepite-citron.com');
    vi.stubEnv('EMAIL_REPLY_TO', 'francois@pepite-citron.com');
    await sendEmails([email('a@x.com')]);
    expect(bodyOf(0)[0]).toMatchObject({
      from: 'Pépite & Citron <equipe@pepite-citron.com>', reply_to: 'francois@pepite-citron.com',
    });
  });

  it('splits more than 100 recipients into several batches', async () => {
    const many = Array.from({ length: 150 }, (_, i) => email(`p${i}@x.com`));
    const result = await sendEmails(many);
    expect(result).toEqual({ sent: 150, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodyOf(0)).toHaveLength(100);
    expect(bodyOf(1)).toHaveLength(50);
  });

  it('counts a rejected batch as failed without throwing', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, text: async () => 'domain not verified' });
    expect(await sendEmails([email('a@x.com'), email('b@x.com')])).toEqual({ sent: 0, failed: 2 });
  });
});

describe('sendEmails — Brevo fallback', () => {
  beforeEach(() => vi.stubEnv('BREVO_API_KEY', 'xkeysib-test'));

  it('sends one email per recipient', async () => {
    const result = await sendEmails([email('a@x.com'), email('b@x.com')]);
    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.brevo.com/v3/smtp/email');
    expect(bodyOf(0)).toMatchObject({
      sender: { name: 'Pépite & Citron', email: 'noreply@pepite-citron.com' },
      to: [{ email: 'a@x.com' }], htmlContent: '<p>hi</p>',
    });
  });

  it('counts individual failures', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, text: async () => '' })
      .mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'sender not valid' });
    expect(await sendEmails([email('a@x.com'), email('b@x.com')])).toEqual({ sent: 1, failed: 1 });
  });
});
