-- Migration : support du vote pour 3 Pépites
-- Ajoute pepites_count sur matches (2 par défaut pour la rétrocompatibilité)
-- Ajoute best3_id / best3_comment sur votes

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS pepites_count integer NOT NULL DEFAULT 2;

ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS best3_id  uuid REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS best3_comment text;
