import { avatarColor, displayName, initials } from '@/utils/player';
import type { Player } from '@/types';

/**
 * Emojis a player can pick as avatar. Same list as the players_avatar_emoji
 * check constraint (20260023), which avatar.test.ts compares: nothing but one
 * of these can reach the team's podium. ⭐ and 🍋 are left out (they mean
 * Pépite and Citron), 👑 too (the podium's winner).
 */
export const AVATAR_EMOJIS = [
  '⚽', '🏀', '🏐', '🏉', '🏒', '🎾', '🧤', '🏆',
  '🐐', '🦁', '🐺', '🦅', '🐯', '🐻', '🦊', '🦈',
  '🐉', '🐝', '🔥', '⚡', '💪', '🚀', '💎', '🎯',
  '😎', '🤠', '🥶', '🤖', '👽', '🍀',
] as const;

/**
 * Background colours, by key (the key is what the database stores). Dark
 * enough for white initials: avatar.test.ts checks a 3:1 contrast.
 */
export const AVATAR_COLORS = {
  red:    '#C0392B',
  orange: '#B85412',
  gold:   '#9A7400',
  green:  '#2E7D32',
  teal:   '#00796B',
  blue:   '#1E5BB8',
  purple: '#6A3FB5',
  pink:   '#B03078',
  grey:   '#5A5A60',
} as const;

export type AvatarEmoji = typeof AVATAR_EMOJIS[number];
export type AvatarColorKey = keyof typeof AVATAR_COLORS;

const isAvatarEmoji = (v: string | null | undefined): v is AvatarEmoji =>
  !!v && (AVATAR_EMOJIS as readonly string[]).includes(v);

export const isAvatarColor = (v: string | null | undefined): v is AvatarColorKey =>
  !!v && Object.prototype.hasOwnProperty.call(AVATAR_COLORS, v);

export interface AvatarLook {
  background: string;
  /** The emoji, or the initials when the player has none. */
  label: string;
  isEmoji: boolean;
}

/**
 * What a player's avatar circle shows: their emoji and colour when they picked
 * them in Profile, else the initials on a colour derived from the name.
 */
export function playerAvatar(
  player: Pick<Player, 'name' | 'nickname' | 'avatar_emoji' | 'avatar_color'>,
): AvatarLook {
  const emoji = isAvatarEmoji(player.avatar_emoji) ? player.avatar_emoji : null;
  return {
    background: isAvatarColor(player.avatar_color) ? AVATAR_COLORS[player.avatar_color] : avatarColor(player.name),
    label:      emoji ?? initials(displayName(player)),
    isEmoji:    !!emoji,
  };
}
