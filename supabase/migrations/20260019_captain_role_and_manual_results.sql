-- ─── Captain role + results entered by hand ─────────────────────────────────
-- Two features (2026-10):
--
--  C1  Captain: an admin can hand the running of the vote to a teammate when
--      they are not there. A captain (org_members.role = 'captain') can open,
--      close and reveal a vote, manage guest links and enter a missing result.
--      They cannot touch the roster, the members, the billing or delete a
--      match: those policies stay is_org_admin().
--      Ballots stay anonymous for the captain (get_match_votes masks the voter
--      identity, as for every non-admin). During the vote they only get the
--      ballot ids (needed to shuffle the reveal order), not their content.
--
--  M1  matches.manual_result: the result of a match played without a vote
--      (nobody launched it), entered afterwards from the history. Shape:
--        { "best_ids":  [<player id>, …],      -- podium order, 1st = Pépite
--          "lemon_id":  <player id>,
--          "best_pts":  { "<player id>": n },  -- optional, totals if known
--          "lemon_pts": { "<player id>": n } } -- optional
--      Such a match is created closed and can never be reopened (CHECK), so it
--      never receives ballots (submit_vote requires phase 'voting').
--
-- Deploy order: apply this migration BEFORE deploying the front that sends
-- manual_result / shows the captain role. The deployed front is unaffected by
-- it (a captain is shown as a plain member until the new front ships).

-- ── C1: role ────────────────────────────────────────────────────────────────
alter table org_members drop constraint if exists org_members_role_check;
alter table org_members add constraint org_members_role_check
  check (role in ('admin', 'captain', 'voter'));

-- Admin or captain: may run the match of the day. Same shape as is_org_admin()
-- (SECURITY DEFINER so policies can read org_members without recursing).
create or replace function can_run_matches(target_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from org_members
    where org_id  = target_org_id
      and user_id = auth.uid()
      and role    in ('admin', 'captain')
  );
$$;

revoke execute on function can_run_matches(uuid) from public, anon;
grant  execute on function can_run_matches(uuid) to authenticated;

-- matches: insert / update open to captains, delete stays admin-only.
drop policy if exists "matches_insert" on matches;
create policy "matches_insert" on matches
  for insert
  with check (can_run_matches(org_id));

drop policy if exists "matches_update" on matches;
create policy "matches_update" on matches
  for update
  using      (can_run_matches(org_id))
  with check (can_run_matches(org_id));

-- guest links are part of running the vote.
drop policy if exists "guests_insert" on guest_tokens;
create policy "guests_insert" on guest_tokens
  for insert
  with check (can_run_matches(org_id));

drop policy if exists "guests_delete" on guest_tokens;
create policy "guests_delete" on guest_tokens
  for delete
  using (can_run_matches(org_id));

-- add_org_member (20260012) accepts the new role. Same body otherwise.
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

  if member_role not in ('admin', 'captain', 'voter') then
    raise exception 'Rôle invalide' using errcode = '22023';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(trim(member_email));

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

-- get_match_votes (20260015) + the captain branch. Admin and other readers
-- are unchanged.
create or replace function get_match_votes(target_match_id bigint, p_org_slug text default null)
returns setof votes
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  m record;
  v votes%rowtype;
begin
  select mt.org_id, mt.phase, mt.reveal_order, mt.revealed_count
  into   m
  from   matches mt
  where  mt.id = target_match_id;

  if not found then
    return;
  end if;

  -- The org admin: full set with identities, every phase.
  if is_org_admin(m.org_id) then
    return query select * from votes where match_id = target_match_id;
    return;
  end if;

  -- A captain runs the reveal: every ballot in every phase, never the voter.
  -- During the vote, only the ids (the reveal order is shuffled from them).
  if can_run_matches(m.org_id) then
    for v in select * from votes vv where vv.match_id = target_match_id loop
      v.voter_name      := null;
      v.voter_player_id := null;
      if m.phase = 'voting' then
        v.best1_id := null; v.best2_id := null; v.best3_id := null; v.lemon_id := null;
        v.best1_comment := null; v.best2_comment := null;
        v.best3_comment := null; v.lemon_comment := null;
      end if;
      return next v;
    end loop;
    return;
  end if;

  if not (
    is_org_member(m.org_id)
    or exists (select 1 from organizations o where o.id = m.org_id and o.slug = p_org_slug)
  ) then
    return;
  end if;

  -- phase 'voting' → nothing (use get_match_vote_count for the counter)
  if m.phase not in ('done', 'closed', 'counting') then
    return;
  end if;

  for v in
    select * from votes vv
    where  vv.match_id = target_match_id
      and  (m.phase <> 'counting'
            -- counting: only the ballots already revealed
            or array_position(m.reveal_order, vv.id) between 1 and m.revealed_count)
  loop
    v.voter_name      := null;
    v.voter_player_id := null;
    return next v;
  end loop;
end;
$$;

-- ── M1: manual result ───────────────────────────────────────────────────────
alter table matches add column if not exists manual_result jsonb;

alter table matches drop constraint if exists matches_manual_result_check;
alter table matches add constraint matches_manual_result_check check (
  manual_result is null or (
    is_open = false
    and phase = 'closed'
    and jsonb_typeof(manual_result -> 'best_ids') = 'array'
    and jsonb_array_length(manual_result -> 'best_ids') between 1 and 3
    and manual_result ? 'lemon_id'
  )
);

-- Verification (one statement): expect captain_role, can_run_matches and
-- manual_result all true.
-- select
--   (select pg_get_constraintdef(oid) like '%captain%' from pg_constraint
--     where conname = 'org_members_role_check')                         as captain_role,
--   exists (select 1 from pg_proc where proname = 'can_run_matches')     as can_run_matches,
--   exists (select 1 from information_schema.columns
--     where table_name = 'matches' and column_name = 'manual_result')   as manual_result;
