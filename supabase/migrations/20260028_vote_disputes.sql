-- ─── « Ce n'était pas moi » : a player reports a vote cast in their name ────
-- With the team link (/vote?org=slug), anyone can tap any present first name
-- that has not voted yet. The real player then reads « Tu as déjà voté » and
-- had no way to say so; only an admin could undo the vote (delete_vote), if
-- someone told them.
--
--  D1  votes.disputed_at: set when the player reports the vote. Only admins
--      see who it is (get_match_votes returns the voter to admins only).
--  D2  report_vote_dispute(match, player, org slug): anyone who can vote on
--      the match (team member, or holder of the team link) flags the vote cast
--      under that player during the voting phase. It only raises a flag: the
--      admin decides, and undoes the vote with delete_vote so the player can
--      vote again. Reporting twice keeps the first date.
--
-- Deploy order: this migration first, then the front (it calls
-- report_vote_dispute and reads disputed_at). The deployed front ignores the
-- new column.

alter table votes add column if not exists disputed_at timestamptz;

create or replace function report_vote_dispute(
  p_match_id        bigint,
  p_voter_player_id bigint,
  p_org_slug        text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where id = p_match_id;
  if not found or m.phase <> 'voting' or m.is_open is not true then
    raise exception 'Le vote est clôturé pour ce match.' using errcode = 'P0001';
  end if;

  if not (
    is_org_member(m.org_id)
    or exists (select 1 from organizations o where o.id = m.org_id and o.slug = p_org_slug)
  ) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  if not (p_voter_player_id = any(m.present_ids)) then
    raise exception 'Joueur absent de ce match.' using errcode = '22023';
  end if;

  update votes
  set    disputed_at = coalesce(disputed_at, now())
  where  match_id = p_match_id and voter_player_id = p_voter_player_id;
end;
$$;

revoke execute on function report_vote_dispute(bigint, bigint, text) from public;
grant  execute on function report_vote_dispute(bigint, bigint, text) to anon, authenticated;

-- Verification (one statement): expect true, true.
-- select
--   exists (select 1 from information_schema.columns where table_name = 'votes' and column_name = 'disputed_at') as disputed_at,
--   exists (select 1 from pg_proc where proname = 'report_vote_dispute') as report_vote_dispute;

insert into schema_migrations (version) values ('20260028') on conflict (version) do nothing;
