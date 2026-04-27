-- ═══════════════════════════════════════════════════════════════════════════
-- Pépite & Citron — Schéma Supabase complet (état actuel)
-- ═══════════════════════════════════════════════════════════════════════════
-- Ce fichier documente le schéma complet tel qu'il doit exister en production.
-- Pour recréer la base de zéro, exécute les migrations dans l'ordre :
--   supabase/migrations/20240001_roles.sql
--   supabase/migrations/20240002_get_my_orgs.sql
--   supabase/migrations/20240003_votes_best3.sql
--   supabase/migrations/20250001_plan_stripe.sql
--   supabase/migrations/20260001_subscription_details.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   text NOT NULL,
  slug                   text UNIQUE NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),

  -- Freemium (migration 20250001)
  plan                   text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id     text,
  stripe_subscription_id text,

  -- Subscription details (migration 20260001)
  current_period_end     timestamptz,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  last_payment_failed_at timestamptz
);

CREATE TABLE IF NOT EXISTS org_members (
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role     text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'voter')),
  PRIMARY KEY (user_id, org_id)
);

CREATE TABLE IF NOT EXISTS players (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  player_ids  bigint[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matches (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label          text NOT NULL,
  is_open        boolean NOT NULL DEFAULT true,
  present_ids    bigint[] NOT NULL DEFAULT '{}',
  team_id        bigint REFERENCES teams(id) ON DELETE SET NULL,
  season         int NOT NULL DEFAULT 1,
  pepite_count   int NOT NULL DEFAULT 2 CHECK (pepite_count IN (2, 3)),
  phase          text NOT NULL DEFAULT 'voting' CHECK (phase IN ('voting', 'counting', 'done')),
  reveal_order   bigint[],
  revealed_count int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS votes (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id     bigint NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  voter_id     text NOT NULL,           -- auth user id or guest token string
  best_id      bigint,                  -- player voted as best (pépite)
  best_comment text,
  lemon_id     bigint,                  -- player voted as worst (citron)
  lemon_comment text,
  best3_id     bigint,                  -- 3rd pépite (mode 3 pépites)
  best3_comment text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voter_id, match_id)           -- one vote per voter per match
);

CREATE TABLE IF NOT EXISTS guest_tokens (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id  bigint NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  token     text UNIQUE NOT NULL,
  name      text NOT NULL,
  used      boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS season_names (
  org_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  season  int NOT NULL,
  name    text NOT NULL,
  PRIMARY KEY (org_id, season)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_org_members_org_id
  ON org_members (org_id);

CREATE INDEX IF NOT EXISTS idx_players_org_id
  ON players (org_id);

CREATE INDEX IF NOT EXISTS idx_matches_org_id
  ON matches (org_id);

CREATE INDEX IF NOT EXISTS idx_votes_match_id
  ON votes (match_id);

CREATE INDEX IF NOT EXISTS idx_guest_tokens_match_id
  ON guest_tokens (match_id);

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription_id
  ON organizations (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ── Functions ────────────────────────────────────────────────────────────────

-- Créer une organisation et y ajouter l'utilisateur courant comme admin
CREATE OR REPLACE FUNCTION create_organization(org_name text, org_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO organizations (name, slug) VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO org_members (user_id, org_id, role)
  VALUES (auth.uid(), new_org_id, 'admin');
END;
$$;

-- Lister les orgs de l'utilisateur courant avec son rôle
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
GRANT EXECUTE ON FUNCTION get_my_orgs() TO authenticated;

-- Ajouter un membre par email (cherche dans auth.users)
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
  SELECT id INTO target_user_id FROM auth.users WHERE email = member_email;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun compte trouvé pour %', member_email;
  END IF;
  INSERT INTO org_members (user_id, org_id, role)
  VALUES (target_user_id, target_org_id, member_role)
  ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;
END;
$$;

-- Lister les membres d'une org avec leurs emails
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

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Row Level Security : chaque utilisateur ne voit que ses propres données.
-- Le service role key (webhooks, fonctions serveur) bypass RLS.

ALTER TABLE organizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE players        ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_names   ENABLE ROW LEVEL SECURITY;

-- Organizations : membres peuvent lire, admins peuvent modifier
CREATE POLICY "org_members_can_read_org" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );
CREATE POLICY "org_admins_can_update_org" ON organizations
  FOR UPDATE USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin')
  );
