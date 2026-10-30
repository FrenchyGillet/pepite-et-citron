-- ─── Every two weeks, skipping a match, and no vote stuck in counting ───────
-- Builds on 20260021 (scheduled matches).
--
--  B1  match_schedules.interval_weeks (1 or 2) and first_on: a repeating
--      match plays every week or every other week, from its first local
--      date. first_on NULL (schedules made before this migration) keeps the
--      old rule: every week, on that weekday.
--  B2  _due_occurrence / get_upcoming_schedules follow it. get_upcoming_
--      schedules also returns interval_weeks (new column: dropped and
--      recreated).
--  B3  A vote left in counting (the organiser stopped after the last ballot
--      and never showed the podium) no longer blocks the next scheduled vote:
--      when that vote is due, the stuck one is closed. Only a vote dated
--      before the occurrence's kick-off; a vote still open stays a blocker.
--      Same in open_schedule_now.
--  B4  skip_next_occurrence(schedule): « Pas de match ce jour-là » (winter
--      break, school holidays): the next occurrence of a repeating match is
--      marked done without a vote. Admins and captains.
--
-- Deploy order: this migration first, then the front (it inserts
-- interval_weeks / first_on and calls skip_next_occurrence). The deployed
-- front ignores the new column.

-- ── B1 ──────────────────────────────────────────────────────────────────────
alter table match_schedules add column if not exists interval_weeks smallint not null default 1;
alter table match_schedules drop constraint if exists match_schedules_interval_weeks_check;
alter table match_schedules add constraint match_schedules_interval_weeks_check
  check (interval_weeks in (1, 2));
alter table match_schedules add column if not exists first_on date;
-- On the schedule's weekday, or the next-match loops below would never end.
alter table match_schedules drop constraint if exists match_schedules_first_on_check;
alter table match_schedules add constraint match_schedules_first_on_check
  check (first_on is null or (weekday is not null and extract(dow from first_on) = weekday));

-- ── B2 ──────────────────────────────────────────────────────────────────────
-- Whether a local date is one of a repeating schedule's match days.
create or replace function _is_schedule_day(s match_schedules, day date)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select s.first_on is null
      or (day >= s.first_on and ((day - s.first_on) / 7) % s.interval_weeks = 0);
$$;

revoke execute on function _is_schedule_day(match_schedules, date) from public, anon, authenticated;

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
    -- Latest kick-off on the weekday whose opening time has passed; every
    -- other week, the one before when that week is off.
    base := (now() - d) at time zone s.timezone;
    day  := base::date - ((extract(dow from base)::int - s.weekday + 7) % 7);
    if day + s.start_time > base then day := day - 7; end if;
    if not _is_schedule_day(s, day) then day := day - 7; end if;
    if not _is_schedule_day(s, day) then return null; end if;
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

drop function if exists get_upcoming_schedules(uuid);
create function get_upcoming_schedules(p_org_id uuid)
returns table (id bigint, label text, weekday smallint, start_time time, timezone text,
               team_id bigint, pepite_count integer, interval_weeks smallint,
               next_kick_off timestamptz, opens_at timestamptz)
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
      -- Next match day whose vote has not opened yet.
      base := now() at time zone s.timezone;
      day  := base::date + ((s.weekday - extract(dow from base)::int + 7) % 7);
      kick := (day + s.start_time) at time zone s.timezone;
      while kick + delay <= now()
            or not _is_schedule_day(s, day)
            or (s.last_opened_on is not null and day <= s.last_opened_on)
            or _manual_vote_in_window(p_org_id, kick, extract(epoch from delay)::integer / 60) loop
        day  := day + 7;
        kick := (day + s.start_time) at time zone s.timezone;
      end loop;
    end if;
    id := s.id; label := s.label; weekday := s.weekday; start_time := s.start_time;
    timezone := s.timezone; team_id := s.team_id; pepite_count := s.pepite_count;
    interval_weeks := s.interval_weeks;
    next_kick_off := kick; opens_at := kick + delay;
    return next;
  end loop;
end;
$$;

revoke execute on function get_upcoming_schedules(uuid) from public;
grant  execute on function get_upcoming_schedules(uuid) to anon, authenticated;

-- ── B3 ──────────────────────────────────────────────────────────────────────
-- Closes the team's votes left in counting from before `kick`.
create or replace function _close_stuck_counting(p_org_id uuid, kick timestamptz)
returns void
language sql
set search_path = public, pg_temp
as $$
  update matches mt set is_open = false, phase = 'closed'
  where mt.org_id = p_org_id and mt.phase = 'counting' and mt.created_at < kick;
$$;

revoke execute on function _close_stuck_counting(uuid, timestamptz) from public, anon, authenticated;

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

    -- A previous vote whose podium was never shown gives way to this one.
    perform _close_stuck_counting(s.org_id, kick);

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

revoke execute on function _open_due_schedules(uuid, boolean) from public, anon, authenticated;

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
  select u.next_kick_off into kick from get_upcoming_schedules(s.org_id) u where u.id = s.id;
  if kick is null then
    raise exception 'Match programmé introuvable.' using errcode = 'P0002';
  end if;
  perform _close_stuck_counting(s.org_id, least(kick, now()));
  if exists (select 1 from matches mt where mt.org_id = s.org_id and (mt.is_open or mt.phase = 'counting')) then
    raise exception 'Un vote est déjà en cours.' using errcode = 'P0001';
  end if;

  m_id := _create_scheduled_match(s, kick, least(kick, now()));
  update matches mt set notified_at = now() where mt.id = m_id;
  return query select * from matches mt where mt.id = m_id;
end;
$$;

revoke execute on function open_schedule_now(bigint) from public, anon;
grant  execute on function open_schedule_now(bigint) to authenticated;

-- ── B4 ──────────────────────────────────────────────────────────────────────
-- Returns the kick-off that follows the skipped one (NULL: none).
create or replace function skip_next_occurrence(p_schedule_id bigint)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  s    match_schedules%rowtype;
  kick timestamptz;
begin
  select * into s from match_schedules ms where ms.id = p_schedule_id for update;
  if not found then
    raise exception 'Match programmé introuvable.' using errcode = 'P0002';
  end if;
  if not can_run_matches(s.org_id) then
    raise exception 'Réservé aux administrateurs et capitaines' using errcode = '42501';
  end if;
  if s.starts_at is not null then
    raise exception 'Seul un match qui se répète peut être sauté.' using errcode = 'P0001';
  end if;
  select u.next_kick_off into kick from get_upcoming_schedules(s.org_id) u where u.id = s.id;
  if kick is null then
    raise exception 'Match programmé introuvable.' using errcode = 'P0002';
  end if;

  update match_schedules set last_opened_on = (kick at time zone s.timezone)::date where id = s.id;
  select u.next_kick_off into kick from get_upcoming_schedules(s.org_id) u where u.id = s.id;
  return kick;
end;
$$;

revoke execute on function skip_next_occurrence(bigint) from public, anon;
grant  execute on function skip_next_occurrence(bigint) to authenticated;

-- Verification (one statement): expect columns_ok = true and functions = 4.
-- select (select count(*) from information_schema.columns where table_name = 'match_schedules'
--           and column_name in ('interval_weeks', 'first_on')) = 2 as columns_ok,
--        (select count(*) from pg_proc where proname in ('_is_schedule_day', '_close_stuck_counting',
--           'skip_next_occurrence', 'get_upcoming_schedules')) as functions;
