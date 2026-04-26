import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email:    z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const signupSchema = z.object({
  email:    z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Au moins 8 caractères requis'),
});

export type AuthFormValues = z.infer<typeof signupSchema>;

// ── Org setup ─────────────────────────────────────────────────────────────────
export const orgSetupSchema = z.object({
  name: z
    .string()
    .min(2,  'Au moins 2 caractères')
    .max(60, 'Trop long (60 caractères max)')
    .trim(),
  slug: z
    .string()
    .min(2,  'Au moins 2 caractères')
    .max(40, 'Trop long (40 caractères max)')
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Uniquement lettres minuscules, chiffres et tirets'),
});

export type OrgSetupFormValues = z.infer<typeof orgSetupSchema>;

// ── Admin — joueur ────────────────────────────────────────────────────────────
export const playerNameSchema = z.object({
  name: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Prénom trop long (50 caractères max)')
    .trim(),
});

// ── Admin — match ─────────────────────────────────────────────────────────────
export const matchLabelSchema = z.object({
  label: z
    .string()
    .min(1, 'Le nom du match est requis')
    .max(100, 'Trop long (100 caractères max)')
    .trim(),
});

// ── Admin — équipe ────────────────────────────────────────────────────────────
export const teamNameSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom de l'équipe est requis")
    .max(50, 'Trop long (50 caractères max)')
    .trim(),
});

// ── Admin — supporter invité ──────────────────────────────────────────────────
export const guestNameSchema = z.object({
  name: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Trop long (50 caractères max)')
    .trim(),
});

// ── Admin — membre ────────────────────────────────────────────────────────────
export const memberEmailSchema = z.object({
  email: z.string().email('Adresse email invalide'),
});
