-- ─── Scheduled matches ──────────────────────────────────────────────────────
-- The organiser schedules a match (once, or every week) and the vote opens on
-- its own a set time after kick-off: the team link pinned in the group chat
-- is all the players need, week after week.
--
--  S1  organizations.vote_open_delay_minutes: how long after kick-off the
--      vote opens (asked the first time a match is scheduled; NULL = 90).
--  S2  match_schedules: one-off (starts_at) or weekly (weekday + start_time,
--      in the team's timezone). Admins and captains manage them.
--  S3  matches.schedule_id / notified_at: the vote a schedule opened, and
--      whether the organiser has been told.
--  S4  _open_due_schedules (internal), two entry points:
--        open_due_scheduled_matches(org): called by the app before reading
--          the active match (anyone who can read it, as for
--          delete_abandoned_votes in 20260020). Opens what is due, never a
--          vote while the previous one is still open or being revealed.
--        run_scheduled_matches(): service role only, called every 5 minutes
--          by pg_cron through /api/cron/scheduled-matches. Same, for every
--          team; an occurrence blocked by an unrevealed vote is consumed and
--          reported, and every opened vote not yet notified is returned (and
--          marked notified) so the endpoint tells the organiser.
--  S5  get_upcoming_schedules(org): each schedule with its next kick-off and
--      opening time, for the Admin list and the vote screen ("le vote ouvre
--      à 21 h 30"). Readable by anyone with the team id, like matches.
--  S6  set_vote_open_delay(org, minutes): admins and captains.
--  S7  open_schedule_now(schedule): « Ouvrir maintenant », when the match
--      ends early. And a vote launched by hand between an occurrence's
--      kick-off and its opening counts as that occurrence (no second vote,
--      no "vote not opened" notice).
--
-- Rules for an occurrence:
--   - it opens at kick-off + delay, and only if that moment came after the
--     schedule was created (no backfill) and less than 12 h ago (a late cron
--     never opens last week's match);
--   - the match is dated at kick-off (created_at), present = the saved
--     line-up's active players, else every active player; 3 pépites from 4
--     present players, else 2; current season; no deadline (an empty vote is
--     deleted 24 h after kick-off, 20260020).
--
-- Requires 20260019 (can_run_matches). Deploy order: apply this migration
-- before the front that schedules matches (the deployed front ignores it).

-- ── S1 ──────────────────────────────────────────────────────────────────────
alter table organizations add column if not exists vote_open_delay_minutes integer;
alter table organizations drop constraint if exists organizations_vote_open_delay_check;
alter table organizations add constraint organizations_vote_open_delay_check
  check (vote_open_delay_minutes is null or vote_open_delay_minutes between 0 and 600);

-- ── S2 ──────────────────────────────────────────────────────────────────────
create table if not exists match_schedules (
  id             bigint generated always as identity primary key,
  org_id         uuid not null references organizations(id) on delete cascade,
  starts_at      timestamptz,                         -- one-off
  weekday        smallint check (weekday between 0 and 6),  -- weekly, 0 = Sunday
  start_time     time,
  timezone       text not null default 'Europe/Brussels',
  label          text check (label is null or char_length(label) between 1 and 100),
  team_id        bigint references teams(id) on delete set null,
  pepite_count   integer not null default 3 check (pepite_count in (2, 3)),
  locale         text not null default 'fr' check (locale in ('fr', 'en', 'nl')),
  -- Local date of the last occurrence opened or skipped (weekly), or of the
  -- only one (one-off: done once set).
  last_opened_on date,
  created_at     timestamptz not null default now(),
  constraint match_schedules_kind check (
    (starts_at is not null and weekday is null and start_time is null)
    or (starts_at is null and weekday is not null and start_time is not null)
  )
);

create index if not exists idx_match_schedules_org on match_schedules (org_id);

alter table match_schedules enable row level security;

drop policy if exists "match_schedules_select" on match_schedules;
create policy "match_schedules_select" on match_schedules
  for select using (is_org_member(org_id));

drop policy if exists "match_schedules_insert" on match_schedules;
create policy "match_schedules_insert" on match_schedules
  for insert with check (can_run_matches(org_id));

drop policy if exists "match_schedules_update" on match_schedules;
create policy "match_schedules_update" on match_schedules
  for update using (can_run_matches(org_id)) with check (can_run_matches(org_id));

drop policy if exists "match_schedules_delete" on match_schedules;
create policy "match_schedules_delete" on match_schedules
  for delete using (can_run_matches(org_id));

-- ── S3 ──────────────────────────────────────────────────────────────────────
alter table matches add column if not exists schedule_id bigint references match_schedules(id) on delete set null;
alter table matches add column if not exists notified_at timestamptz;
-- One vote per occurrence, whoever opens it first (app or cron).
create unique index if not exists matches_schedule_occurrence
  on matches (schedule_id, created_at) where schedule_id is not null;

-- ── S4 ──────────────────────────────────────────────────────────────────────
-- Kick-off of the occurrence a schedule should open now, or NULL.
create or replace function _due_occurrence(s match_schedules, delay_minutes integer)
returns timestamptz
language plpgsql
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  d        interval := make_interval(mins => delay_minutes);
  kick_off timestamptz;
  base     timestamp;
  day      date;
begin
  if s.starts_at is not null then
    if s.last_opened_on is not null then return null; end if;
    kick_off := s.starts_at;
  else
    -- Latest weekly kick-off whose opening time has passed.
    base := (now() - d) at time zone s.timezone;
    day  := base::date - ((extract(dow from base)::int - s.weekday + 7) % 7);
    if day + s.start_time > base then day := day - 7; end if;
    if s.last_opened_on is not null and day <= s.last_opened_on then return null; end if;
    kick_off := (day + s.start_time) at time zone s.timezone;
  end if;

  if kick_off + d > now()
     or kick_off + d <= s.created_at
     or kick_off + d < now() - interval '12 hours' then
    return null;
  end if;
  return kick_off;
end;
$$;

-- A vote launched by hand (« Maintenant ») between an occurrence's kick-off
-- and its vote opening is that match: the occurrence is done, no second vote.
create or replace function _manual_vote_in_window(p_org_id uuid, kick timestamptz, delay_minutes integer)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from matches mt
    where mt.org_id = p_org_id and mt.schedule_id is null and mt.manual_result is null
      and mt.created_at >= kick and mt.created_at <= kick + make_interval(mins => delay_minutes)
  );
$$;

-- Creates the occurrence's vote (dated `dated`) and marks the occurrence done.
-- NULL when another call created it first.
create or replace function _create_scheduled_match(s match_schedules, kick timestamptz, dated timestamptz)
returns bigint
language plpgsql
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  local_d date := (kick at time zone s.timezone)::date;
  present bigint[];
  m_id    bigint;
begin
  select coalesce(array_agg(p.id order by p.id), '{}') into present
    from players p
    where p.org_id = s.org_id and p.archived_at is null
      and (s.team_id is null
           or p.id = any (select unnest(t.player_ids) from teams t where t.id = s.team_id));

  insert into matches (org_id, label, present_ids, is_open, phase, season, team_id,
                       pepite_count, created_at, schedule_id)
  select s.org_id,
         coalesce(s.label, case s.locale
           when 'en' then 'Match of '  || to_char(local_d, 'DD/MM')
           when 'nl' then 'Match van ' || to_char(local_d, 'DD/MM')
           else           'Match du '  || to_char(local_d, 'DD/MM')
         end),
         present, true, 'voting', coalesce(o.current_season, 1), s.team_id,
         case when cardinality(present) >= 4 then s.pepite_count else 2 end,
         dated, s.id
  from organizations o where o.id = s.org_id
  on conflict (schedule_id, created_at) where schedule_id is not null do nothing
  returning id into m_id;

  update match_schedules set last_opened_on = local_d where id = s.id;
  return m_id;
end;
$$;

create or replace function _open_due_schedules(p_org_id uuid, p_report_blocked boolean)
returns table (status text, org_id uuid, match_id bigint, label text, kick_off timestamptz, timezone text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  s        match_schedules%rowtype;
  delay    integer;
  kick     timestamptz;
  local_d  date;
  m_id     bigint;
begin
  for s in
    select ms.* from match_schedules ms
    where p_org_id is null or ms.org_id = p_org_id
    order by ms.org_id, ms.id
    for update skip locked
  loop
    select coalesce(o.vote_open_delay_minutes, 90) into delay
      from organizations o where o.id = s.org_id;
    kick := _due_occurrence(s, delay);
    continue when kick is null;
    local_d := (kick at time zone s.timezone)::date;

    -- Already voted by hand during this match: done, nothing to open or report.
    if _manual_vote_in_window(s.org_id, kick, delay) then
      update match_schedules set last_opened_on = local_d where id = s.id;
      continue;
    end if;

    -- Never two votes at once: the previous one must be revealed or closed.
    if exists (select 1 from matches mt
               where mt.org_id = s.org_id and (mt.is_open or mt.phase = 'counting')) then
      if p_report_blocked then
        update match_schedules set last_opened_on = local_d where id = s.id;
        status := 'blocked'; org_id := s.org_id; match_id := null;
        label := s.label; kick_off := kick; timezone := s.timezone;
        return next;
      end if;
      continue;
    end if;

    m_id := _create_scheduled_match(s, kick, kick);
    continue when m_id is null;
    status := 'opened'; org_id := s.org_id; match_id := m_id;
    select mt.label into label from matches mt where mt.id = m_id;
    kick_off := kick; timezone := s.timezone;
    return next;
  end loop;
end;
$$;

revoke execute on function _due_occurrence(match_schedules, integer) from public, anon, authenticated;
revoke execute on function _manual_vote_in_window(uuid, timestamptz, integer) from public, anon, authenticated;
revoke execute on function _create_scheduled_match(match_schedules, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function _open_due_schedules(uuid, boolean) from public, anon, authenticated;

-- No membership check on purpose (as delete_abandoned_votes): it only opens
-- what the organiser scheduled, at the time they chose.
create or replace function open_due_scheduled_matches(p_org_id uuid)
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer from _open_due_schedules(p_org_id, false);
$$;

revoke execute on function open_due_scheduled_matches(uuid) from public;
grant  execute on function open_due_scheduled_matches(uuid) to anon, authenticated;

-- The cron's worklist: votes opened by anyone and not yet announced to the
-- organiser, plus occurrences skipped because a vote was still pending.
create or replace function run_scheduled_matches()
returns table (status text, org_id uuid, match_id bigint, label text, kick_off timestamptz, timezone text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  return query
    select b.status, b.org_id, b.match_id, b.label, b.kick_off, b.timezone
    from _open_due_schedules(null, true) b
    where b.status = 'blocked';

  return query
    with announced as (
      update matches mt set notified_at = now()
      where mt.schedule_id is not null and mt.notified_at is null
        and mt.created_at > now() - interval '1 day'
      returning mt.org_id, mt.id, mt.label, mt.created_at, mt.schedule_id
    )
    select 'opened'::text, a.org_id, a.id, a.label, a.created_at,
           coalesce(ms.timezone, 'Europe/Brussels')
    from announced a left join match_schedules ms on ms.id = a.schedule_id;
end;
$$;

revoke execute on function run_scheduled_matches() from public, anon, authenticated;
grant  execute on function run_scheduled_matches() to service_role;

-- ── S5 ──────────────────────────────────────────────────────────────────────
create or replace function get_upcoming_schedules(p_org_id uuid)
returns table (id bigint, label text, weekday smallint, start_time time, timezone text,
               team_id bigint, pepite_count integer, next_kick_off timestamptz, opens_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  delay interval;
  s     match_schedules%rowtype;
  base  timestamp;
  day   date;
  kick  timestamptz;
begin
  select make_interval(mins => coalesce(o.vote_open_delay_minutes, 90)) into delay
    from organizations o where o.id = p_org_id;
  if delay is null then return; end if;

  for s in select * from match_schedules ms where ms.org_id = p_org_id loop
    if s.starts_at is not null then
      continue when s.last_opened_on is not null or s.starts_at + delay <= now()
        or _manual_vote_in_window(p_org_id, s.starts_at, extract(epoch from delay)::integer / 60);
      kick := s.starts_at;
    else
      -- Next weekly kick-off whose vote has not opened yet.
      base := now() at time zone s.timezone;
      day  := base::date + ((s.weekday - extract(dow from base)::int + 7) % 7);
      kick := (day + s.start_time) at time zone s.timezone;
      while kick + delay <= now()
            or (s.last_opened_on is not null and day <= s.last_opened_on)
            or _manual_vote_in_window(p_org_id, kick, extract(epoch from delay)::integer / 60) loop
        day  := day + 7;
        kick := (day + s.start_time) at time zone s.timezone;
      end loop;
    end if;
    id := s.id; label := s.label; weekday := s.weekday; start_time := s.start_time;
    timezone := s.timezone; team_id := s.team_id; pepite_count := s.pepite_count;
    next_kick_off := kick; opens_at := kick + delay;
    return next;
  end loop;
end;
$$;

revoke execute on function get_upcoming_schedules(uuid) from public;
grant  execute on function get_upcoming_schedules(uuid) to anon, authenticated;

-- ── S6 ──────────────────────────────────────────────────────────────────────
create or replace function set_vote_open_delay(p_org_id uuid, p_minutes integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not can_run_matches(p_org_id) then
    raise exception 'Réservé aux administrateurs et capitaines' using errcode = '42501';
  end if;
  update organizations set vote_open_delay_minutes = p_minutes where id = p_org_id;
end;
$$;

revoke execute on function set_vote_open_delay(uuid, integer) from public, anon;
grant  execute on function set_vote_open_delay(uuid, integer) to authenticated;

-- ── S7 ──────────────────────────────────────────────────────────────────────
-- « Ouvrir maintenant »: the match ended early, open its vote now (the next
-- occurrence, same line-up and name). Admins and captains; never while a vote
-- is pending. Dated at kick-off (or now, if opened before kick-off). The
-- organiser opened it: marked notified, the app sends the members' usual
-- "vote ouvert" itself.
create or replace function open_schedule_now(p_schedule_id bigint)
returns setof matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  s    match_schedules%rowtype;
  kick timestamptz;
  m_id bigint;
begin
  select * into s from match_schedules ms where ms.id = p_schedule_id;
  if not found then
    raise exception 'Match programmé introuvable.' using errcode = 'P0002';
  end if;
  if not can_run_matches(s.org_id) then
    raise exception 'Réservé aux administrateurs et capitaines' using errcode = '42501';
  end if;
  if exists (select 1 from matches mt where mt.org_id = s.org_id and (mt.is_open or mt.phase = 'counting')) then
    raise exception 'Un vote est déjà en cours.' using errcode = 'P0001';
  end if;
  select u.next_kick_off into kick from get_upcoming_schedules(s.org_id) u where u.id = s.id;
  if kick is null then
    raise exception 'Match programmé introuvable.' using errcode = 'P0002';
  end if;

  m_id := _create_scheduled_match(s, kick, least(kick, now()));
  update matches mt set notified_at = now() where mt.id = m_id;
  return query select * from matches mt where mt.id = m_id;
end;
$$;

revoke execute on function open_schedule_now(bigint) from public, anon;
grant  execute on function open_schedule_now(bigint) to authenticated;

-- Verification (one statement): expect 6 functions and the table.
-- select (select count(*) from pg_proc where proname in ('open_due_scheduled_matches',
--   'run_scheduled_matches', 'get_upcoming_schedules', 'set_vote_open_delay', '_open_due_schedules',
--   'open_schedule_now'))
--   as functions, to_regclass('public.match_schedules') is not null as table_ok;
