-- ─── Player avatar: emoji + colour ──────────────────────────────────────────
-- A player with an account picks an emoji and a background colour in Profile,
-- shown on the podium, the shared podium image and the header. Written through
-- the existing "users can update own player profile" policy (20260002), read
-- with the rest of players (players_select stays public).
--
-- Fixed lists, the same as src/utils/avatar.ts (avatar.test.ts compares
-- them): nothing but an emoji from the list can reach the team's podium.
--
-- Deploy order: this migration first, then the front (it writes both columns).

alter table players
  add column if not exists avatar_emoji text,
  add column if not exists avatar_color text;

alter table players drop constraint if exists players_avatar_emoji_check;
alter table players add constraint players_avatar_emoji_check check (
  avatar_emoji is null or avatar_emoji in (
    '⚽', '🏀', '🏐', '🏉', '🏒', '🎾', '🧤', '🏆',
    '🐐', '🦁', '🐺', '🦅', '🐯', '🐻', '🦊', '🦈',
    '🐉', '🐝', '🔥', '⚡', '💪', '🚀', '💎', '🎯',
    '😎', '🤠', '🥶', '🤖', '👽', '🍀'
  )
);

alter table players drop constraint if exists players_avatar_color_check;
alter table players add constraint players_avatar_color_check check (
  avatar_color is null or avatar_color in (
    'red', 'orange', 'gold', 'green', 'teal', 'blue', 'purple', 'pink', 'grey'
  )
);

-- Verification (one statement): both columns and both constraints → 4.
-- select (select count(*) from information_schema.columns
--          where table_name = 'players' and column_name in ('avatar_emoji', 'avatar_color'))
--      + (select count(*) from pg_constraint
--          where conname in ('players_avatar_emoji_check', 'players_avatar_color_check')) as ok;
