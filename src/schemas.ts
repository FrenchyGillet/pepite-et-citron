import { z } from 'zod';
import { t, type TKey } from '@/i18n';

// Messages are read at validation time, in the current language.
const msg = (key: TKey, vars?: Record<string, number>) => ({ error: () => t(key, vars) });

// ── Auth ──────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email:    z.string().email(msg('validation.email')),
  password: z.string().min(1, msg('validation.passwordRequired')),
});

export const signupSchema = z.object({
  email:    z.string().email(msg('validation.email')),
  password: z.string().min(8, msg('validation.passwordMin')),
});

export type AuthFormValues = z.infer<typeof signupSchema>;

// ── Org setup ─────────────────────────────────────────────────────────────────
export const orgSetupSchema = z.object({
  name: z
    .string()
    .min(2,  msg('validation.min2'))
    .max(60, msg('validation.maxChars', { max: 60 }))
    .trim(),
  slug: z
    .string()
    .min(2,  msg('validation.min2'))
    .max(40, msg('validation.maxChars', { max: 40 }))
    .regex(/^[a-z0-9][a-z0-9-]*$/, msg('validation.slugFormat')),
});

export type OrgSetupFormValues = z.infer<typeof orgSetupSchema>;

// ── Admin — joueur ────────────────────────────────────────────────────────────
export const playerNameSchema = z.object({
  name: z
    .string()
    .min(1, msg('validation.nameRequired'))
    .max(50, msg('validation.nameTooLong'))
    .trim(),
});

// ── Admin — match ─────────────────────────────────────────────────────────────
export const matchLabelSchema = z.object({
  label: z
    .string()
    .min(1, msg('validation.matchLabelRequired'))
    .max(100, msg('validation.maxChars', { max: 100 }))
    .trim(),
});

// ── Admin — équipe ────────────────────────────────────────────────────────────
export const teamNameSchema = z.object({
  name: z
    .string()
    .min(1, msg('validation.teamNameRequired'))
    .max(50, msg('validation.maxChars', { max: 50 }))
    .trim(),
});

// ── Admin — supporter invité ──────────────────────────────────────────────────
export const guestNameSchema = z.object({
  name: z
    .string()
    .min(1, msg('validation.nameRequired'))
    .max(50, msg('validation.maxChars', { max: 50 }))
    .trim(),
});

// ── Admin — membre ────────────────────────────────────────────────────────────
export const memberEmailSchema = z.object({
  email: z.string().email(msg('validation.email')),
});
