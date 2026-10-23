import { describe, expect, it } from 'vitest';
import migration from '../../supabase/migrations/20260023_player_avatar.sql?raw';
import { AVATAR_COLORS, AVATAR_EMOJIS, playerAvatar } from './avatar';
import { contrastRatio } from './contrast';
import { avatarColor } from './player';

// The values listed in one check constraint of the migration.
function constraintValues(name: string): string[] {
  const start = migration.indexOf(`add constraint ${name}`);
  const body  = migration.slice(start, migration.indexOf(');', start));
  return [...body.matchAll(/'([^']+)'/g)].map(m => m[1]);
}

describe('avatar lists match the database', () => {
  it('emojis: same as players_avatar_emoji_check', () => {
    expect(constraintValues('players_avatar_emoji_check')).toEqual([...AVATAR_EMOJIS]);
  });

  it('colours: same keys as players_avatar_color_check', () => {
    expect(constraintValues('players_avatar_color_check')).toEqual(Object.keys(AVATAR_COLORS));
  });
});

describe('AVATAR_COLORS', () => {
  it.each(Object.entries(AVATAR_COLORS))('%s keeps white initials readable (3:1)', (_key, hex) => {
    expect(contrastRatio('#FFFFFF', hex)).toBeGreaterThanOrEqual(3);
  });
});

describe('playerAvatar', () => {
  it('shows the picked emoji on the picked colour', () => {
    expect(playerAvatar({ name: 'Théo', avatar_emoji: '🐐', avatar_color: 'blue' }))
      .toEqual({ background: AVATAR_COLORS.blue, label: '🐐', isEmoji: true });
  });

  it('falls back to the initials (nickname first) on the name colour', () => {
    expect(playerAvatar({ name: 'Théo', nickname: 'Le Mur' }))
      .toEqual({ background: avatarColor('Théo'), label: 'LM', isEmoji: false });
  });

  it('keeps the initials with a colour but no emoji', () => {
    expect(playerAvatar({ name: 'Théo', avatar_color: 'green' }))
      .toEqual({ background: AVATAR_COLORS.green, label: 'TH', isEmoji: false });
  });

  it('ignores values outside the lists', () => {
    expect(playerAvatar({ name: 'Théo', avatar_emoji: 'hello', avatar_color: 'toString' }))
      .toEqual({ background: avatarColor('Théo'), label: 'TH', isEmoji: false });
  });
});
