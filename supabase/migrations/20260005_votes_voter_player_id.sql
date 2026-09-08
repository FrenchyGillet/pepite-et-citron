-- ─── Link a vote to the player who cast it ───────────────────────────────────
-- Votes have only ever stored `voter_name` (a free-text first name). That makes
-- two things impossible to do correctly:
--   1. Account deletion (RGPD): a user's votes cannot be found and removed.
--   2. Double-vote detection: two "Thomas" collide (handled separately).
--
-- This migration adds the nullable link. `submitVote` now writes it for logged-in
-- voters who picked their player. Guest / anonymous votes keep it NULL and stay
-- identified by `voter_name`. Existing rows are not backfilled — there is no
-- reliable mapping from a first name to a player.

ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS voter_player_id bigint REFERENCES players(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS votes_voter_player_id_idx
  ON votes (voter_player_id)
  WHERE voter_player_id IS NOT NULL;
