-- ─── Archive players instead of deleting them (audit B8) ────────────────────
-- Deleting a player erased them from the season stats (built from the roster),
-- and their past ballots showed "?". An archived player leaves the vote,
-- presence and team pickers but keeps their history and stats.
--
-- Archiving goes through an admin-checked RPC because the live players table
-- has no admin UPDATE policy (only "claim unclaimed player" and "update own
-- profile"), so a plain update from AdminView would silently touch 0 rows.
-- No deploy-order constraint: the column defaults to NULL (= active), and the
-- frontend that reads it ships with this migration.

alter table players add column if not exists archived_at timestamptz;

create or replace function set_player_archived(p_player_id bigint, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from players where id = p_player_id;
  if v_org is null or not is_org_admin(v_org) then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;

  update players
  set    archived_at = case when p_archived then coalesce(archived_at, now()) else null end
  where  id = p_player_id;
end;
$$;

revoke execute on function set_player_archived(bigint, boolean) from public, anon;
grant  execute on function set_player_archived(bigint, boolean) to authenticated;
