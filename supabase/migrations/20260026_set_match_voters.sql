-- ─── Edit who votes while the vote is open ──────────────────────────────────
-- A scheduled vote opens with the whole squad (20260021): the absents are in
-- the list, and a vote launched by hand can miss a late arrival.
--
--  E1  set_match_voters(match, player_ids): admins and captains replace the
--      match's voters (present_ids) during the voting phase. The server
--      keeps the vote consistent:
--        - every id is a player of the team; a newly added one must not be
--          archived;
--        - a player who already voted, or who got a pépite vote, stays (the
--          ballot would name an absent player; the citron may be absent, as
--          in submit_vote);
--        - enough players remain for the pépite mode (pepite_count + 1).
--      The front calls this RPC rather than updating present_ids directly.
--
-- Deploy order: this migration first, then the front (it calls
-- set_match_voters). The deployed front does not use it.

create or replace function set_match_voters(p_match_id bigint, p_player_ids bigint[])
returns bigint[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m       matches%rowtype;
  wanted  bigint[] := coalesce((select array_agg(distinct x order by x) from unnest(p_player_ids) x), '{}');
begin
  select * into m from matches where id = p_match_id for update;
  if not found or not can_run_matches(m.org_id) then
    raise exception 'Réservé aux administrateurs et capitaines' using errcode = '42501';
  end if;
  if m.phase <> 'voting' or m.is_open is not true then
    raise exception 'Le vote est clôturé pour ce match.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from unnest(wanted) x
    where not exists (
      select 1 from players p
      where p.id = x and p.org_id = m.org_id
        and (p.archived_at is null or p.id = any(m.present_ids))
    )
  ) then
    raise exception 'Joueur inconnu.' using errcode = '22023';
  end if;

  if exists (
    select 1 from votes v
    where v.match_id = p_match_id
      and exists (
        select 1 from unnest(array[v.voter_player_id, v.best1_id, v.best2_id, v.best3_id]) x
        where x is not null and not (x = any(wanted))
      )
  ) then
    raise exception 'Un joueur qui a déjà voté ou reçu une voix ne peut plus être retiré.' using errcode = '22023';
  end if;

  if cardinality(wanted) < coalesce(m.pepite_count, 2) + 1 then
    raise exception 'Pas assez de votants pour ce mode pépite.' using errcode = '22023';
  end if;

  update matches set present_ids = wanted where id = p_match_id;
  return wanted;
end;
$$;

revoke execute on function set_match_voters(bigint, bigint[]) from public, anon;
grant  execute on function set_match_voters(bigint, bigint[]) to authenticated;
