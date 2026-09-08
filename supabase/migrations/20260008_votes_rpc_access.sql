-- ─── Votes: RPC-only access (no more public SELECT) ─────────────────────────
-- votes SELECT was `USING (true)` — anyone with the anon key could read every
-- vote of every org, including live during an open vote, and every ballot at
-- once during the reveal (killing the one-at-a-time dépouillement).
--
-- New model: the votes table is no longer directly selectable. All reads go
-- through SECURITY DEFINER RPCs that enforce who-sees-what:
--   · get_match_vote_count  — just the number, everyone, every phase
--   · has_voted             — dedup check, everyone
--   · get_match_votes       — rows, gated by phase + membership + reveal state
--   · get_all_votes         — full org history, members only
--
-- INSERT stays open (anonymous / guest voting).
-- Depends on is_org_member() and is_org_admin() (20260006).

-- ── Drop the blanket SELECT policy ──────────────────────────────────────────
drop policy if exists "votes_select" on votes;

-- ── Count only — safe in every phase for everyone ──────────────────────────
create or replace function get_match_vote_count(target_match_id bigint)
returns integer
language sql
security definer
stable
as $$
  select count(*)::int from votes where match_id = target_match_id;
$$;

-- ── Dedup check for the voting flow ────────────────────────────────────────
create or replace function has_voted(
  target_match_id     bigint,
  p_voter_name        text,
  p_voter_player_id   bigint default null
)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from votes
    where match_id = target_match_id
      and case
            when p_voter_player_id is not null
              then voter_player_id = p_voter_player_id
                   or (voter_player_id is null and voter_name = p_voter_name)
            else voter_name = p_voter_name
          end
  );
$$;

-- ── Match ballots — phase / membership / reveal aware ──────────────────────
create or replace function get_match_votes(target_match_id bigint)
returns setof votes
language plpgsql
security definer
stable
as $$
declare
  m record;
begin
  select org_id, phase, reveal_order, revealed_count
  into   m
  from   matches
  where  id = target_match_id;

  if not found then
    return;
  end if;

  -- The org admin runs the reveal: full set, every phase (needs lookahead,
  -- and the "Qui a voté ?" panel is admin-only).
  if is_org_admin(m.org_id) then
    return query select * from votes where match_id = target_match_id;
    return;
  end if;

  -- Everyone else (non-admin members AND anonymous ?org= / guest voters):
  if m.phase in ('done', 'closed') then
    -- results are public at this point (podium, share image)
    return query select * from votes where match_id = target_match_id;
  elsif m.phase = 'counting' then
    -- only the ballots the admin has already revealed
    return query
      select v.*
      from   votes v
      where  v.match_id = target_match_id
        and  array_position(m.reveal_order, v.id) between 1 and m.revealed_count;
  end if;
  -- phase 'voting' → nothing at all (use get_match_vote_count for the counter)
end;
$$;

-- ── Full org history — members only ───────────────────────────────────────
create or replace function get_all_votes(target_org_id uuid)
returns setof votes
language plpgsql
security definer
stable
as $$
begin
  if not is_org_member(target_org_id) then
    return;
  end if;
  return query
    select v.*
    from   votes v
    join   matches mt on mt.id = v.match_id
    where  mt.org_id = target_org_id;
end;
$$;

grant execute on function get_match_vote_count(bigint)             to anon, authenticated;
grant execute on function has_voted(bigint, text, bigint)          to anon, authenticated;
grant execute on function get_match_votes(bigint)                  to anon, authenticated;
grant execute on function get_all_votes(uuid)                      to anon, authenticated;
