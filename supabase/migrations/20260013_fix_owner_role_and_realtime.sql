-- ─── Fix: 'owner' role locks team creators out + Realtime publishes nothing ──
-- Found from a live schema export (2026-09-10).
--
--  O1  The live create_organization(), never versioned in this repo, inserts
--      the creator with role 'owner'. Nothing else knows that role:
--      is_org_admin() checks role = 'admin', the client shows the Admin tab only
--      for role === 'admin', and api/_lib/auth.ts requireOrgAdmin() does the
--      same. Every team created with that version has a creator who cannot
--      administer it, and since 20260011 (admin-only writes) cannot even create a
--      match through the API. org_members.role also had no CHECK constraint
--      (20240001's was never applied because the column already existed), which
--      is how 'owner' got in.
--      Fix: owners become admins (the creator stays recorded in
--      organizations.owner_id), create_organization() inserts 'admin', and the
--      column becomes NOT NULL, default 'voter', CHECK (admin, voter).
--
--  R1  No table is in the supabase_realtime publication, so useRealtime()
--      receives nothing: the vote counter, the reveal on players' phones and
--      "vote opened" only refresh on focus or pull-to-refresh. Publishing
--      votes would not help, because it has no SELECT policy since 20260008.
--      Fix: publish matches, and keep a matches.vote_count column in sync with
--      a trigger. Every vote then produces a matches UPDATE event, which
--      useRealtime already listens to.

-- ── O1: owner → admin ───────────────────────────────────────────────────────
update org_members set role = 'admin' where role = 'owner';

alter table org_members alter column role set default 'voter';
alter table org_members alter column role set not null;
alter table org_members drop constraint if exists org_members_role_check;
alter table org_members add constraint org_members_role_check check (role in ('admin', 'voter'));

-- Drop + create: the live version returns uuid, the historical one void, and
-- CREATE OR REPLACE cannot change a return type.
drop function if exists create_organization(text, text);

create function create_organization(org_name text, org_slug text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  insert into organizations (name, slug, owner_id)
  values (org_name, org_slug, auth.uid())
  returning id into new_org_id;

  insert into org_members (org_id, user_id, role)
  values (new_org_id, auth.uid(), 'admin');

  return new_org_id;
end;
$$;

revoke execute on function create_organization(text, text) from public, anon;
grant  execute on function create_organization(text, text) to authenticated;

-- role is NOT NULL now; never default a missing role to 'admin' (audit B7).
create or replace function get_my_orgs()
returns table(id uuid, name text, slug text, role text, plan text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select o.id, o.name, o.slug, coalesce(m.role, 'voter') as role, o.plan
  from org_members m join organizations o on o.id = m.org_id
  where m.user_id = auth.uid()
  order by m.role, o.name;
$$;

-- ── R1: vote counter on matches + publish matches ──────────────────────────
alter table matches add column if not exists vote_count integer not null default 0;

update matches m
set    vote_count = (select count(*) from votes v where v.match_id = m.id);

-- SECURITY DEFINER: voters (anon included) insert votes but have no UPDATE
-- right on matches. The function owner owns matches and bypasses its RLS.
create or replace function sync_match_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update matches set vote_count = vote_count + 1 where id = new.match_id;
  elsif tg_op = 'DELETE' then
    update matches set vote_count = greatest(vote_count - 1, 0) where id = old.match_id;
  end if;
  return null;
end;
$$;

drop trigger if exists votes_sync_match_vote_count on votes;
create trigger votes_sync_match_vote_count
  after insert or delete on votes
  for each row execute function sync_match_vote_count();

-- matches_select is `using true`, so every subscriber (anon ?org= voters
-- included) receives the events; no ballot data is exposed.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication not found — enable Realtime in the dashboard';
  elsif not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table matches;
  end if;
end $$;
