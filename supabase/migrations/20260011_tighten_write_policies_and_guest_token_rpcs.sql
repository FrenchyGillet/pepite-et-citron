-- ─── Tighten write access + close guest_tokens enumeration ──────────────────
-- Found from a live `pg_policies` dump requested during the permissions audit
-- (2026-09). These are the base policies that predate this repo's migration
-- history, so 20260006-20260008 never touched them.
--
--  I1  matches/players/teams/guest_tokens INSERT, UPDATE, DELETE were all
--      `is_org_admin(...)` — no wait, they were `is_org_member(org_id)`,
--      i.e. open to any *voter*, not just admins. In particular
--      matches_update meant any voter could call the same mutations the UI
--      only shows to admins (revealNext, closeMatch, updateMatch for
--      tiebreakers) directly against Supabase — advance the reveal early,
--      close the vote, or pick their own tiebreaker winner. That's a direct
--      hit on the app's core integrity guarantee ("one vote revealed at a
--      time, admin-controlled"). Every INSERT/UPDATE/DELETE mutation for
--      matches/players/teams/guest_tokens is called exclusively from
--      AdminView or an isAdmin-gated control (verified against the client
--      code) — none of it is legitimately used by a plain voter — so these
--      are tightened to admin-only with no functional loss.
--
--  I2  matches_select / players_select were `true` (fully public — any
--      anon-key holder can dump every org's rosters and match history).
--      teams_select was also `true` but teams are never read by the
--      anonymous/guest voting flow (only AdminView/StatsView, both behind
--      an authenticated session) — teams_select is tightened to
--      is_org_member now. matches_select / players_select are LEFT AS-IS
--      here: VoteView needs to read the active match + roster for an
--      anonymous ?org= visitor or guest-token holder who isn't an org
--      member yet, and scoping that correctly needs the same
--      RPC-with-context treatment already used for votes (20260008) — a
--      bigger, separate piece of work, not bundled into this hardening pass.
--
--  I3  guest_tokens_select was `true` — anyone with the anon key could list
--      every unused guest voting link for every match in every org and
--      impersonate a supporter. guest_tokens has no legitimate anonymous
--      "list" use case (only AdminView lists them, as an org member); the
--      anonymous guest only ever needs to validate the ONE token they were
--      given. So guest_tokens_select is tightened to is_org_member(org_id),
--      and the anonymous single-token lookup moves to a SECURITY DEFINER
--      RPC scoped by the exact token value (same pattern as votes' RPCs).
--
--  I4  guest_tokens had no UPDATE policy at all, so useGuestToken() marking
--      a token "used" silently affected zero rows — a real (if low-impact)
--      functional bug, not just a security gap. Fixed via a second RPC
--      rather than an UPDATE policy, for the same "no legitimate direct
--      write" reasoning as I3.
--
-- Depends on is_org_admin() / is_org_member() (20260006).

-- ── I1: matches — admin-only writes ───────────────────────────────────────
drop policy if exists "matches_insert" on matches;
create policy "matches_insert" on matches
  for insert
  with check (is_org_admin(org_id));

drop policy if exists "matches_update" on matches;
create policy "matches_update" on matches
  for update
  using      (is_org_admin(org_id))
  with check (is_org_admin(org_id));

drop policy if exists "matches_delete" on matches;
create policy "matches_delete" on matches
  for delete
  using (is_org_admin(org_id));

-- ── I1: players — admin-only writes (profile self-update policies from ────
--      20260002 are untouched: those are by user_id, not by org role) ──────
drop policy if exists "players_insert" on players;
create policy "players_insert" on players
  for insert
  with check (is_org_admin(org_id));

drop policy if exists "players_delete" on players;
create policy "players_delete" on players
  for delete
  using (is_org_admin(org_id));

-- ── I1/I2: teams — admin-only writes, members-only read ───────────────────
drop policy if exists "teams_insert" on teams;
create policy "teams_insert" on teams
  for insert
  with check (is_org_admin(org_id));

drop policy if exists "teams_update" on teams;
create policy "teams_update" on teams
  for update
  using      (is_org_admin(org_id))
  with check (is_org_admin(org_id));

drop policy if exists "teams_delete" on teams;
create policy "teams_delete" on teams
  for delete
  using (is_org_admin(org_id));

drop policy if exists "teams_select" on teams;
create policy "teams_select" on teams
  for select
  using (is_org_member(org_id));

-- ── I1/I3: guest_tokens — admin-only writes, members-only list ────────────
drop policy if exists "guests_insert" on guest_tokens;
create policy "guests_insert" on guest_tokens
  for insert
  with check (is_org_admin(org_id));

drop policy if exists "guests_delete" on guest_tokens;
create policy "guests_delete" on guest_tokens
  for delete
  using (is_org_admin(org_id));

drop policy if exists "guests_select" on guest_tokens;
create policy "guests_select" on guest_tokens
  for select
  using (is_org_member(org_id));

-- ── I3/I4: anonymous guest access to their own token, via RPC only ────────
create or replace function validate_guest_token(p_token text)
returns setof guest_tokens
language sql
security definer
stable
as $$
  select * from guest_tokens where token = p_token;
$$;

create or replace function mark_guest_token_used(p_token text)
returns void
language sql
security definer
as $$
  update guest_tokens set used = true where token = p_token;
$$;

revoke all on function validate_guest_token(text)  from public;
revoke all on function mark_guest_token_used(text) from public;
grant execute on function validate_guest_token(text)  to anon, authenticated;
grant execute on function mark_guest_token_used(text) to anon, authenticated;
