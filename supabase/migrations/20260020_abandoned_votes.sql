-- ─── Abandoned votes ────────────────────────────────────────────────────────
-- A vote still open with no ballot 24 h after it was opened was abandoned
-- (the organiser tried the app alone, or never shared the link). It used to
-- stay open for ever: the organiser coming back found a stale "Match du 7
-- oct." at 0 votes instead of "Lance le vote".
--
--  A1  delete_abandoned_votes(org): deletes those matches. Nothing is lost
--      (no ballot), so the match simply never existed: it does not count in
--      the season and leaves the history. The team and its players are kept.
--      Called by the app before reading the active match (lazy, no cron job,
--      as for the vote deadline in 20260017).
--  A2  votes_reject_abandoned_match: a ballot reaching such a match before
--      it is deleted (page left open, offline vote replayed) is refused, so
--      the 24 h rule holds whatever the client.
--
-- A vote that received at least one ballot never closes on its own: the
-- reveal stays the admin's moment.
--
-- Deploy order: none. The front calls A1 best effort and also hides those
-- matches itself; without this migration they just stay in the database.

-- ── A1 ──────────────────────────────────────────────────────────────────────
-- No membership check on purpose: anyone who can read the team's active match
-- (members, and anonymous voters of the ?org= link) may apply this rule, which
-- only ever deletes matches that are open, empty and older than 24 h.
create or replace function delete_abandoned_votes(p_org_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n integer;
begin
  delete from matches
  where  org_id = p_org_id
    and  phase = 'voting'
    and  is_open
    and  vote_count = 0
    and  created_at < now() - interval '24 hours';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function delete_abandoned_votes(uuid) from public;
grant  execute on function delete_abandoned_votes(uuid) to anon, authenticated;

-- ── A2 ──────────────────────────────────────────────────────────────────────
create or replace function reject_vote_on_abandoned_match()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from matches
    where  id = new.match_id
      and  vote_count = 0
      and  created_at < now() - interval '24 hours'
  ) then
    raise exception 'Le vote est clôturé pour ce match.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function reject_vote_on_abandoned_match() from public, anon;

drop trigger if exists votes_reject_abandoned_match on votes;
create trigger votes_reject_abandoned_match
  before insert on votes
  for each row execute function reject_vote_on_abandoned_match();
