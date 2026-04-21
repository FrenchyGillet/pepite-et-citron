-- ── Migration : fonction get_my_orgs ────────────────────────────────────────
-- Remplace la lecture directe sur org_members (sujette aux problèmes de RLS
-- quand le JWT n'est pas correctement transmis par le client REST custom).
-- SECURITY DEFINER = s'exécute avec les droits du propriétaire, bypass RLS.

CREATE OR REPLACE FUNCTION get_my_orgs()
RETURNS TABLE(id uuid, name text, slug text, role text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT o.id, o.name, o.slug, COALESCE(m.role, 'admin') AS role
  FROM org_members m
  JOIN organizations o ON o.id = m.org_id
  WHERE m.user_id = auth.uid()
  ORDER BY m.role, o.name;
$$;
