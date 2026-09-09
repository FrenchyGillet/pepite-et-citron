-- ── Migration : get_my_orgs() renvoie aussi organizations.plan ───────────────
-- À exécuter dans Supabase Dashboard → SQL Editor.
--
-- Contexte : getMyOrgs() (src/api.ts) essaie d'abord le RPC get_my_orgs (chemin
-- rapide), et ne bascule sur le fallback REST `.select("*")` qu'en cas d'erreur.
-- Le RPC ne renvoyait pas `plan` → sur le chemin rapide, currentOrg.plan est
-- undefined → isPro = false, même pour une équipe Pro. Le statut Pro
-- n'apparaissait que tant que le cache local (peuplé un jour via le fallback
-- REST) survivait ; il disparaît dès qu'on se reconnecte / vide le cache.
--
-- Postgres interdit de changer la signature de sortie via CREATE OR REPLACE :
-- il faut DROP puis recréer.

DROP FUNCTION IF EXISTS get_my_orgs();

CREATE FUNCTION get_my_orgs()
RETURNS TABLE(id uuid, name text, slug text, role text, plan text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT o.id, o.name, o.slug, COALESCE(m.role, 'admin') AS role, o.plan
  FROM org_members m
  JOIN organizations o ON o.id = m.org_id
  WHERE m.user_id = auth.uid()
  ORDER BY m.role, o.name;
$$;

GRANT EXECUTE ON FUNCTION get_my_orgs() TO authenticated;
