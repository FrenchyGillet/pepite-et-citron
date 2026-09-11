import type { Player } from '@/types';

/**
 * Returns the display name for a player.
 * Nickname takes precedence over the real name when set.
 */
export function displayName(player: Pick<Player, 'name' | 'nickname'>): string {
  return (player.nickname?.trim()) || player.name;
}

/**
 * Generates a deterministic colour from a string (for avatar initials).
 * Returns an HSL colour string.
 */
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 38%)`;
}

/**
 * Returns the 1 or 2 initials to show in an avatar.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** An archived player keeps their history but leaves every picker. */
export function isActive(player: Pick<Player, 'archived_at'>): boolean {
  return !player.archived_at;
}

/** Same cap as playerNameSchema. */
export const PLAYER_NAME_MAX_LENGTH = 50;

export interface ParsedPlayerNames {
  /** New names to add, in the order typed, first spelling kept. */
  toAdd: string[];
  /** Already in the roster (active) — skipped. */
  existing: string[];
  /** Already in the roster but archived — reactivate instead of re-adding. */
  archived: string[];
  /** Longer than PLAYER_NAME_MAX_LENGTH — skipped. */
  tooLong: string[];
}

// Case- and accent-insensitive: "Clément" and "clement" are the same player.
const nameKey = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('fr');

/**
 * Parses a pasted roster: one name per line, or separated by commas or
 * semicolons. Blank entries and repeats within the paste are dropped; names
 * already in the roster are reported instead of being added twice.
 */
export function parsePlayerNames(
  text: string,
  roster: Pick<Player, 'name' | 'archived_at'>[],
): ParsedPlayerNames {
  const byKey = new Map(roster.map(p => [nameKey(p.name), p]));
  const seen  = new Set<string>();
  const result: ParsedPlayerNames = { toAdd: [], existing: [], archived: [], tooLong: [] };

  for (const raw of text.split(/[\n,;]+/)) {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name) continue;
    const key = nameKey(name);
    if (seen.has(key)) continue;
    seen.add(key);

    const match = byKey.get(key);
    if (match) {
      (isActive(match) ? result.existing : result.archived).push(match.name);
    } else if (name.length > PLAYER_NAME_MAX_LENGTH) {
      result.tooLong.push(name);
    } else {
      result.toAdd.push(name);
    }
  }
  return result;
}
