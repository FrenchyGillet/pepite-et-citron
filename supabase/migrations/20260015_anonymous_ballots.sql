-- ─── Ballots are anonymous for the team + drop an unused RPC ────────────────
-- Product decision (2026-09-11): votes are anonymous for the team, and the vote
-- screen now says so. This makes it true at the data layer. Readers who are not
-- the org admin get ballots without voter identity (voter_name /
-- voter_player_id set to NULL). The org admin keeps them: « Qui a voté ? » and
-- cancelling a vote need them.
--
-- Also drops mark_guest_token_used(): unused since submit_vote (20260014)
-- consumes guest links, and it let anyone holding a link burn it.
--
-- Supersedes the get_match_votes of 20260012 (same access rules, same
-- signature, pinned search_path). The frontend never reads voter identity
-- outside AdminView, so there is no deploy-order constraint.

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

  -- The org admin runs the reveal: full set with identities, every phase.
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

  -- phase 'voting' → nothing (use get_match_vote_count for the counter)
  if m.phase not in ('done', 'closed', 'counting') then
    return;
  end if;

  for v in
    select * from votes vv
    where  vv.match_id = target_match_id
      and  (m.phase <> 'counting'
            -- counting: only the ballots the admin has already revealed
            or array_position(m.reveal_order, vv.id) between 1 and m.revealed_count)
  loop
    v.voter_name      := null;
    v.voter_player_id := null;
    return next v;
  end loop;
end;
$$;

create or replace function get_all_votes(target_org_id uuid)
returns setof votes
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v        votes%rowtype;
  is_admin boolean := is_org_admin(target_org_id);
begin
  if not is_org_member(target_org_id) then
    return;
  end if;

  for v in
    select vv.* from votes vv
    join   matches mt on mt.id = vv.match_id
    where  mt.org_id = target_org_id
  loop
    if not is_admin then
      v.voter_name      := null;
      v.voter_player_id := null;
    end if;
    return next v;
  end loop;
end;
$$;

drop function if exists mark_guest_token_used(text);
