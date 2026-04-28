-- ─── Player profiles ─────────────────────────────────────────────────────────
-- Adds optional profile fields to the players table:
--   · nickname   : display name shown on podium / scoreboard (overrides name)
--   · user_id    : links a player record to an auth user
--   · avatar_url : public URL to the player's avatar image
--
-- RLS additions:
--   · Org members can claim an unclaimed player slot in their org
--   · Users can update their own linked player (nickname, avatar)

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS nickname   TEXT,
  ADD COLUMN IF NOT EXISTS user_id    UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS players_user_id_idx ON players(user_id);

-- Users can claim an unclaimed player record in any of their orgs
CREATE POLICY "members can claim unclaimed player"
  ON players FOR UPDATE
  USING (
    user_id IS NULL
    AND org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- Users can update their own linked player (nickname, avatar_url)
CREATE POLICY "users can update own player profile"
  ON players FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
