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
