-- ─── Seasons ─────────────────────────────────────────────────────────────────
-- Consolidates all season state onto versioned, org-scoped tables.
--
-- Before this migration the app read/wrote a `settings` table (key/value rows
-- like `current_season` / `season_name_<n>`) that was NEVER part of the schema
-- or any migration. Season browsing therefore silently fell back to season 1 and
-- season names never persisted.
--
-- New model:
--   · organizations.current_season   — the season new matches are stamped with
--   · season_names(org_id, season)   — display label per season (table already
--                                      existed but had RLS on with no policy →
--                                      unreadable; policies added here)
--
-- Historical match data is untouched: matches.season already carries the season
-- of every match, so StatsView history keeps working.

-- ── organizations.current_season ─────────────────────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS current_season int NOT NULL DEFAULT 1;

-- ── season_names (idempotent — table may already exist) ──────────────────────
CREATE TABLE IF NOT EXISTS season_names (
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  season int  NOT NULL,
  name   text NOT NULL,
  PRIMARY KEY (org_id, season)
);

ALTER TABLE season_names ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_read_season_names"  ON season_names;
DROP POLICY IF EXISTS "org_admins_can_write_season_names"  ON season_names;

CREATE POLICY "org_members_can_read_season_names" ON season_names
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "org_admins_can_write_season_names" ON season_names
  FOR ALL USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- 1. Keep current_season consistent with the highest season already recorded on
--    a match, so orgs that somehow advanced seasons keep their counter.
UPDATE organizations o
SET    current_season = GREATEST(o.current_season, m.max_season)
FROM   (SELECT org_id, MAX(season) AS max_season FROM matches GROUP BY org_id) m
WHERE  m.org_id = o.id;

-- 2. If the legacy `settings` table exists, migrate its values across, then it
--    can be dropped manually once this migration is confirmed in production.
DO $$
BEGIN
  IF to_regclass('public.settings') IS NOT NULL THEN
    UPDATE organizations o
    SET    current_season = GREATEST(o.current_season, s.value::int)
    FROM   settings s
    WHERE  s.org_id = o.id
      AND  s.key = 'current_season'
      AND  s.value ~ '^\d+$';

    INSERT INTO season_names (org_id, season, name)
    SELECT s.org_id,
           substring(s.key FROM 'season_name_(\d+)')::int,
           s.value
    FROM   settings s
    WHERE  s.org_id IS NOT NULL
      AND  s.key ~ '^season_name_\d+$'
    ON CONFLICT (org_id, season) DO UPDATE SET name = EXCLUDED.name;
  END IF;
END $$;

-- After verifying in production:
--   DROP TABLE IF EXISTS settings;
