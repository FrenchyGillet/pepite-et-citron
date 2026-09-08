-- ─── RLS hardening: privilege escalation + missing policy ────────────────────
-- Found by dumping the live policies (2026-09). Three problems:
--
--  S1  org_members INSERT policy was `WITH CHECK (auth.uid() IS NOT NULL)` —
--      any logged-in user could insert ANY row: themselves (or anyone) as
--      admin of ANY org. The only client path that legitimately needs this
--      policy is selfJoinOrg() (the ?org= link): a user adding THEMSELVES as
--      a voter. create_organization() and add_org_member() are SECURITY
--      DEFINER and bypass RLS, so tightening the policy does not affect them.
--
--  S2  organizations UPDATE policy was `USING (is_org_member(id))` — any
--      voter could rename the org, change its slug, or touch Stripe columns.
--      Restrict to admins.
--
--  B11 teams had SELECT / INSERT / DELETE policies but no UPDATE policy, so
--      updateTeam() (rename team, edit roster) silently failed under RLS.
--
-- PREREQUISITE: confirm create_organization() is SECURITY DEFINER before
-- applying (it creates the org + the creator's admin membership row):
--   select proname, prosecdef from pg_proc where proname = 'create_organization';
-- prosecdef must be true. If it is not, do NOT apply S1 as-is.

-- ── helper: is the current user an admin of this org? ────────────────────────
-- SECURITY DEFINER so the policy can read org_members without recursing into
-- its own RLS (same pattern as the existing is_org_member()).
create or replace function is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from org_members
    where org_id  = target_org_id
      and user_id = auth.uid()
      and role    = 'admin'
  );
$$;

grant execute on function is_org_admin(uuid) to authenticated, anon;

-- ── S1: org_members INSERT — self-service voter join only ────────────────────
drop policy if exists "members_insert" on org_members;

create policy "members_self_join" on org_members
  for insert
  with check (
    user_id = auth.uid()
    and role = 'voter'
  );

-- ── S2: organizations UPDATE — admins only ──────────────────────────────────
drop policy if exists "org_update" on organizations;

create policy "org_update" on organizations
  for update
  using      (is_org_admin(id))
  with check (is_org_admin(id));

-- ── B11: teams UPDATE — any org member (matches insert/delete) ──────────────
drop policy if exists "teams_update" on teams;

create policy "teams_update" on teams
  for update
  using      (is_org_member(org_id))
  with check (is_org_member(org_id));
