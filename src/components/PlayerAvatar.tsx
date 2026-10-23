import type { CSSProperties } from 'react';
import { playerAvatar } from '@/utils/avatar';
import type { Player } from '@/types';

interface PlayerAvatarProps {
  player: Pick<Player, 'name' | 'nickname' | 'avatar_emoji' | 'avatar_color'>;
  size: number;
  style?: CSSProperties;
}

/** Round avatar: the player's emoji and colour, else their initials. Decorative. */
export function PlayerAvatar({ player, size, style }: PlayerAvatarProps) {
  const look = playerAvatar(player);
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: '50%',
      background: look.background,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * (look.isEmoji ? 0.55 : 0.38)), fontWeight: 800,
      lineHeight: 1, color: '#fff', letterSpacing: look.isEmoji ? 0 : '-0.3px',
      flexShrink: 0, userSelect: 'none',
      ...style,
    }}>
      {look.label}
    </div>
  );
}
