-- ─── Security hotfix: authorization on SECURITY DEFINER functions ────────────
-- Audit 2026-09 (S1, S2, S12, S13, S14). Independent of the table policies that
-- are not versioned yet: only touches functions defined in this repo and the
-- column grants on organizations.
--
--  S1  add_org_member() never checked the caller. Functions are executable by
--      PUBLIC by default, so anyone (anon included) could add any account —
--      themselves included — as admin of any org.
--  S2  get_org_members() returned the member emails of any org to anyone.
--  S12 get_match_votes() returned every ballot (voter name + comments) of any
--      closed match to anyone. Match ids are sequential, so every team's
--      results were enumerable.
--  S13 the organizations UPDATE policy is row-level only: an admin could set
--      plan = 'pro' (or the stripe_* columns) through PostgREST without paying.
--  S14 none of the SECURITY DEFINER functions pinned search_path.
--
-- DEPLOY ORDER: apply this migration, then deploy the frontend that passes
-- p_org_slug to get_match_votes. Until then, anonymous ?org= voters cannot see
-- closed results (members and admins are unaffected).
--
-- Depends on is_org_admin() (20260006) and is_org_member() (live, unversioned).

-- ── S1: add_org_member — admins of the target org only ──────────────────────
create or replace function add_org_member(
  member_email  text,
  target_org_id uuid,
  member_role   text default 'voter'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user_id uuid;
begin
  if not is_org_admin(target_org_id) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  if member_role not in ('admin', 'voter') then
    raise exception 'Rôle invalide' using errcode = '22023';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(trim(member_email));

  -- Only reachable by an admin of the org now, so naming the email is an
  -- acceptable trade-off for the "no account yet" UX in AdminView.
  if target_user_id is null then
    raise exception 'Aucun compte trouvé pour %', member_email using errcode = 'P0002';
  end if;

  insert into org_members (user_id, org_id, role)
  values (target_user_id, target_org_id, member_role)
  on conflict (user_id, org_id) do update set role = excluded.role;
end;
$$;

revoke execute on function add_org_member(text, uuid, text) from public, anon;
grant  execute on function add_org_member(text, uuid, text) to authenticated;

-- ── S2: get_org_members — org admins, or the service role (Vercel functions) ─
create or replace function get_org_members(target_org_id uuid)
returns table(user_id uuid, email text, role text)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select m.user_id, u.email::text, m.role
  from org_members m
  join auth.users u on u.id = m.user_id
  where m.org_id = target_org_id
    and (is_org_admin(target_org_id) or auth.role() = 'service_role')
  order by m.role, u.email;
$$;

revoke execute on function get_org_members(uuid) from public, anon;
grant  execute on function get_org_members(uuid) to authenticated, service_role;

-- ── S12: get_match_votes — scoped to the org ────────────────────────────────
-- Non-admins must be members of the match's org, or present its public vote
-- link slug (anonymous ?org= voters). The slug is shared with the whole team,
-- so this is not a secret — but it stops enumeration by sequential match id.
drop function if exists get_match_votes(bigint);

create function get_match_votes(target_match_id bigint, p_org_slug text default null)
returns setof votes
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  m record;
begin
  select mt.org_id, mt.phase, mt.reveal_order, mt.revealed_count
  into   m
  from   matches mt
  where  mt.id = target_match_id;

  if not found then
    return;
  end if;

  -- The org admin runs the reveal: full set, every phase.
  if is_org_admin(m.org_id) then
    return query select * from votes where match_id = target_match_id;
    return;
  end if;

  if not (
    is_org_member(m.org_id)
    or exists (select 1 from organizations o where o.id = m.org_id and o.slug = p_org_slug)
  ) then
    return;
  end if;

  if m.phase in ('done', 'closed') then
    return query select * from votes where match_id = target_match_id;
  elsif m.phase = 'counting' then
    -- only the ballots the admin has already revealed
    return query
      select v.*
      from   votes v
      where  v.match_id = target_match_id
        and  array_position(m.reveal_order, v.id) between 1 and m.revealed_count;
  end if;
  -- phase 'voting' → nothing (use get_match_vote_count for the counter)
end;
$$;

revoke execute on function get_match_votes(bigint, text) from public;
grant  execute on function get_match_votes(bigint, text) to anon, authenticated;

-- ── S13: organizations — admins may only edit name and current_season ───────
-- plan / stripe_* / current_period_end are written by the Stripe webhook with
-- the service role, which bypasses these grants.
revoke update on organizations from anon, authenticated;
grant  update (name, current_season) on organizations to authenticated;

-- ── S14: pin search_path on the other SECURITY DEFINER functions ────────────
-- Loop over pg_proc so the unversioned is_org_member() is covered whatever its
-- exact signature, and a missing function does not abort the migration.
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from   pg_proc p
    join   pg_namespace n on n.oid = p.pronamespace
    where  n.nspname = 'public'
      and  p.prosecdef
      and  p.proname in (
             'create_organization', 'get_my_orgs', 'is_org_admin', 'is_org_member',
             'get_match_vote_count', 'has_voted', 'get_all_votes'
           )
  loop
    execute format('alter function %s set search_path = public, pg_temp', f);
  end loop;
end $$;
