-- ─── Fix: run_scheduled_matches result types ────────────────────────────────
-- In production matches.id is an integer (supabase/schema.sql said bigint and
-- is not up to date). run_scheduled_matches (20260021) returned it as is in
-- its bigint match_id column, which RETURN QUERY refuses ("Returned type
-- integer does not match expected type bigint in column 3"), so every cron
-- call failed with a 500. Same function, with explicit casts.
--
-- Deploy order: none (the front never calls it; the cron starts working).

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
    select 'opened'::text, a.org_id::uuid, a.id::bigint, a.label::text, a.created_at::timestamptz,
           coalesce(ms.timezone, 'Europe/Brussels')::text
    from announced a left join match_schedules ms on ms.id = a.schedule_id;
end;
$$;

revoke execute on function run_scheduled_matches() from public, anon, authenticated;
grant  execute on function run_scheduled_matches() to service_role;

-- Verification (one statement, safe: opens only what is due): expect
-- "Success. No rows returned" or rows, never an error.
-- select * from run_scheduled_matches();
