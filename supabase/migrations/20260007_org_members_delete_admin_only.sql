-- ─── RLS: restrict org_members DELETE ───────────────────────────────────────
-- The DELETE policy was `USING (is_org_member(org_id))` — any voter could
-- remove any member, including the org's only admin. Restrict to:
--   · an admin of that org (the only path the app uses: AdminView), or
--   · a user removing their own membership (future "leave org").
--
-- Depends on is_org_admin() from 20260006_fix_rls_privilege_escalation.sql.

drop policy if exists "members_delete" on org_members;

create policy "members_delete" on org_members
  for delete
  using (is_org_admin(org_id) or user_id = auth.uid());
