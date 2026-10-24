-- ─── Player avatar: more emojis ─────────────────────────────────────────────
-- Field hockey, lacrosse, badminton, table tennis, baseball, American football,
-- cats, a dog and a panda join the list of 20260023. Same list as
-- src/utils/avatar.ts (avatar.test.ts compares them). Only adds values: every
-- avatar already saved stays valid.
--
-- Deploy order: this migration first, then the front (it offers the new ones).

alter table players drop constraint if exists players_avatar_emoji_check;
alter table players add constraint players_avatar_emoji_check check (
  avatar_emoji is null or avatar_emoji in (
    '⚽', '🏀', '🏐', '🏉', '🏈', '⚾', '🏑', '🏒', '🥍', '🎾', '🏸', '🏓', '🧤', '🏆',
    '🐐', '🦁', '🐺', '🦅', '🐯', '🐻', '🦊', '🦈', '🐉', '🐝', '🐱', '🐈‍⬛', '😼', '🐶', '🐼',
    '🔥', '⚡', '💪', '🚀', '💎', '🎯', '😎', '🤠', '🥶', '🤖', '👽', '🍀'
  )
);

-- Verification (one statement): the constraint accepts the new emojis → true.
-- select pg_get_constraintdef(oid) like '%🏑%' and pg_get_constraintdef(oid) like '%🐱%' as ok
--   from pg_constraint where conname = 'players_avatar_emoji_check';
