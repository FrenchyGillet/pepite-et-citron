-- Migration : ajout des colonnes best3 pour le mode "3 pépites"
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS best3_id      bigint,
  ADD COLUMN IF NOT EXISTS best3_comment text;
