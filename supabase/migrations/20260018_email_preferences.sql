-- ─── Email preferences (audit F10 / S11) ────────────────────────────────────
-- Members can stop the "vote ouvert" emails of a team: from the unsubscribe
-- link in every email (api/unsubscribe, service role) or from Profil in the
-- app (set_email_notifications below). api/send-match-notification skips
-- members who opted out.
--
-- No deploy-order constraint: the column defaults to true (current behavior).

alter table org_members
  add column if not exists email_notifications boolean not null default true;

-- A member changes only their own preference, and only that column (a plain
-- UPDATE grant on org_members would also let them change their role).
create or replace function set_email_notifications(p_org_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update org_members
  set    email_notifications = p_enabled
  where  org_id = p_org_id and user_id = auth.uid();
  if not found then
    raise exception 'Tu n''es pas membre de cette équipe.' using errcode = '42501';
  end if;
end;
$$;

-- Read side for the Profil toggle: the caller's own preference only.
create or replace function get_email_notifications(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select email_notifications from org_members
  where org_id = p_org_id and user_id = auth.uid();
$$;

revoke execute on function set_email_notifications(uuid, boolean) from public, anon;
revoke execute on function get_email_notifications(uuid)          from public, anon;
grant  execute on function set_email_notifications(uuid, boolean) to authenticated;
grant  execute on function get_email_notifications(uuid)          to authenticated;
