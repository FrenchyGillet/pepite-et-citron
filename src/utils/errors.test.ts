import { afterEach, describe, expect, it, vi } from 'vitest';
import { GENERIC_ERROR, humanizeError } from './errors';

afterEach(() => vi.restoreAllMocks());

describe('humanizeError', () => {
  it('keeps our own French messages', () => {
    expect(humanizeError(new Error('Tu as déjà voté pour ce match.'))).toBe('Tu as déjà voté pour ce match.');
    expect(humanizeError(new Error("Le vote est clôturé : l'heure limite est passée.")))
      .toBe("Le vote est clôturé : l'heure limite est passée.");
    expect(humanizeError(new Error('Ton équipe est déjà en Pro. Gère ton abonnement dans Admin → Paramètres.')))
      .toMatch(/déjà en Pro/);
  });

  it('maps known Supabase / Postgres errors to readable French', () => {
    expect(humanizeError(new Error('new row violates row-level security policy for table "players"')))
      .toBe("Tu n'as pas les droits pour faire ça.");
    expect(humanizeError(new Error('duplicate key value violates unique constraint "players_pkey"')))
      .toBe('Cet élément existe déjà.');
    expect(humanizeError(new Error('JWT expired'))).toBe('Ta session a expiré. Reconnecte-toi.');
    expect(humanizeError(new Error('Invalid login credentials'))).toBe('Email ou mot de passe incorrect.');
    expect(humanizeError(new Error('User already registered'))).toMatch(/Un compte existe déjà/);
    expect(humanizeError(new Error('Email not confirmed'))).toMatch(/Confirme ton adresse email/);
    expect(humanizeError(new Error('Password should be at least 6 characters.'))).toBe('Ce mot de passe est trop court.');
    expect(humanizeError(new Error('Request rate limit reached'))).toMatch(/Trop de tentatives/);
  });

  it('hides other technical messages behind the fallback', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(humanizeError(new Error('column "foo" of relation "matches" does not exist'))).toBe(GENERIC_ERROR);
    expect(humanizeError(new Error("Cannot read properties of undefined (reading 'id')"))).toBe(GENERIC_ERROR);
    expect(humanizeError(new Error('PGRST116'), 'Joueur introuvable.')).toBe('Joueur introuvable.');
  });

  it('network failures get a connection message', () => {
    expect(humanizeError(new TypeError('Failed to fetch'))).toBe('Pas de connexion. Vérifie ton réseau et réessaie.');
  });

  it('empty or non-Error values fall back', () => {
    expect(humanizeError(undefined)).toBe(GENERIC_ERROR);
    expect(humanizeError(new Error(''), 'Oups.')).toBe('Oups.');
    expect(humanizeError('Joueur absent de ce match.')).toBe('Joueur absent de ce match.');
  });
});
