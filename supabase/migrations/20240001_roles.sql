-- ── Migration : rôles multi-org ─────────────────────────────────────────────

-- 1. Ajouter la colonne role à org_members
ALTER TABLE org_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin'
  CHECK (role IN ('admin', 'voter'));

-- Les membres existants deviennent admin (comportement inchangé)
UPDATE org_members SET role = 'admin' WHERE role IS NULL;

-- 2. Fonction : ajouter un membre par email
CREATE OR REPLACE FUNCTION add_org_member(
  member_email  text,
  target_org_id uuid,
  member_role   text DEFAULT 'voter'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = member_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun compte trouvé pour %', member_email;
  END IF;

  INSERT INTO org_members (user_id, org_id, role)
  VALUES (target_user_id, target_org_id, member_role)
  ON CONFLICT (user_id, org_id)
  DO UPDATE SET role = EXCLUDED.role;
END;
$$;

-- 3. Fonction : lister les membres d'une org avec leurs emails
CREATE OR REPLACE FUNCTION get_org_members(target_org_id uuid)
RETURNS TABLE(user_id uuid, email text, role text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT m.user_id, u.email, m.role
  FROM org_members m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.org_id = target_org_id
  ORDER BY m.role, u.email;
$$;
