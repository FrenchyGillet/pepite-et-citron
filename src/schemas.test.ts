/**
 * Unit tests for Zod validation schemas (src/schemas.ts).
 *
 * Pure unit tests — no React, no network, no store.
 * Each describe block covers one schema: valid input, each invalid variant.
 */

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  signupSchema,
  orgSetupSchema,
  playerNameSchema,
  matchLabelSchema,
  teamNameSchema,
  guestNameSchema,
  memberEmailSchema,
} from './schemas';

// ── loginSchema ───────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'x' }).success).toBe(true);
  });

  it('rejects malformed email', () => {
    const r = loginSchema.safeParse({ email: 'notanemail', password: 'x' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Adresse email invalide');
  });

  it('rejects empty password', () => {
    const r = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Mot de passe requis');
  });

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
  });
});

// ── signupSchema ──────────────────────────────────────────────────────────────

describe('signupSchema', () => {
  it('accepts valid signup data', () => {
    expect(signupSchema.safeParse({ email: 'user@example.com', password: '12345678' }).success).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    const r = signupSchema.safeParse({ email: 'user@example.com', password: 'short' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Au moins 8 caractères requis');
  });

  it('accepts password of exactly 8 characters', () => {
    expect(signupSchema.safeParse({ email: 'a@b.com', password: '12345678' }).success).toBe(true);
  });

  it('rejects invalid email even with valid password', () => {
    const r = signupSchema.safeParse({ email: 'bad', password: '12345678' });
    expect(r.success).toBe(false);
  });
});

// ── orgSetupSchema ────────────────────────────────────────────────────────────

describe('orgSetupSchema', () => {
  it('accepts valid org data', () => {
    expect(orgSetupSchema.safeParse({ name: 'HC Montréal', slug: 'hc-montreal' }).success).toBe(true);
  });

  it('accepts slug with numbers', () => {
    expect(orgSetupSchema.safeParse({ name: 'Equipe 12', slug: 'equipe-12' }).success).toBe(true);
  });

  it('rejects slug with uppercase letters', () => {
    const r = orgSetupSchema.safeParse({ name: 'Mon équipe', slug: 'MonEquipe' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].path).toContain('slug');
  });

  it('rejects slug with spaces', () => {
    const r = orgSetupSchema.safeParse({ name: 'Mon équipe', slug: 'mon equipe' });
    expect(r.success).toBe(false);
  });

  it('rejects slug with special characters', () => {
    const r = orgSetupSchema.safeParse({ name: 'Mon équipe', slug: 'mon_équipe!' });
    expect(r.success).toBe(false);
  });

  it('rejects name shorter than 2 characters', () => {
    const r = orgSetupSchema.safeParse({ name: 'A', slug: 'ab' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Au moins 2 caractères');
  });

  it('rejects name longer than 60 characters', () => {
    const r = orgSetupSchema.safeParse({ name: 'A'.repeat(61), slug: 'ab' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Trop long (60 caractères max)');
  });

  it('rejects slug longer than 40 characters', () => {
    const r = orgSetupSchema.safeParse({ name: 'Mon équipe', slug: 'a'.repeat(41) });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Trop long (40 caractères max)');
  });
});

// ── playerNameSchema ──────────────────────────────────────────────────────────

describe('playerNameSchema', () => {
  it('accepts a valid player name', () => {
    expect(playerNameSchema.safeParse({ name: 'Antoine' }).success).toBe(true);
  });

  it('rejects empty name', () => {
    const r = playerNameSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Le prénom est requis');
  });

  it('rejects name longer than 50 characters', () => {
    const r = playerNameSchema.safeParse({ name: 'A'.repeat(51) });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Prénom trop long (50 caractères max)');
  });

  it('accepts name of exactly 50 characters', () => {
    expect(playerNameSchema.safeParse({ name: 'A'.repeat(50) }).success).toBe(true);
  });
});

// ── matchLabelSchema ──────────────────────────────────────────────────────────

describe('matchLabelSchema', () => {
  it('accepts a valid match label', () => {
    expect(matchLabelSchema.safeParse({ label: 'vs Dragons' }).success).toBe(true);
  });

  it('rejects empty label', () => {
    const r = matchLabelSchema.safeParse({ label: '' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Le nom du match est requis');
  });

  it('rejects label longer than 100 characters', () => {
    const r = matchLabelSchema.safeParse({ label: 'A'.repeat(101) });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Trop long (100 caractères max)');
  });
});

// ── teamNameSchema ────────────────────────────────────────────────────────────

describe('teamNameSchema', () => {
  it('accepts a valid team name', () => {
    expect(teamNameSchema.safeParse({ name: 'Équipe A' }).success).toBe(true);
  });

  it('rejects empty team name', () => {
    const r = teamNameSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe("Le nom de l'équipe est requis");
  });

  it('rejects team name longer than 50 characters', () => {
    const r = teamNameSchema.safeParse({ name: 'A'.repeat(51) });
    expect(r.success).toBe(false);
  });
});

// ── guestNameSchema ───────────────────────────────────────────────────────────

describe('guestNameSchema', () => {
  it('accepts a valid guest name', () => {
    expect(guestNameSchema.safeParse({ name: 'Tonton' }).success).toBe(true);
  });

  it('rejects empty name', () => {
    const r = guestNameSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Le prénom est requis');
  });
});

// ── memberEmailSchema ─────────────────────────────────────────────────────────

describe('memberEmailSchema', () => {
  it('accepts a valid email address', () => {
    expect(memberEmailSchema.safeParse({ email: 'player@team.com' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const r = memberEmailSchema.safeParse({ email: 'notvalid' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('Adresse email invalide');
  });

  it('rejects empty string', () => {
    const r = memberEmailSchema.safeParse({ email: '' });
    expect(r.success).toBe(false);
  });
});
