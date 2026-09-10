-- ─── Votes integrity (S3/S4) + private organizations + cleanup ──────────────
-- From the live schema export (2026-09-10). Validated with the product owner:
-- players never need an account. A vote is tied to the player chip picked on
-- the vote screen (voter_player_id) or to a single-use guest link.
--
--  V1  votes had no uniqueness at all and INSERT was open to anyone
--      (votes_insert: with check true): unlimited votes, any name, any match,
--      any phase. Writes now go through submit_vote(), which checks the phase,
--      that the picked players are present, no self-pépite, comment length, and
--      one vote per player per match (unique index). A guest link is consumed
--      atomically in the same call, so a failed vote no longer burns the link
--      and a used link cannot vote again.
--  V2  delete_vote(): an org admin can cancel a vote during the voting phase —
--      the escape hatch when someone voted under another player's name.
--  V3  votes.match_id had no foreign key: deleting a match or a team left its
--      ballots (voter names + comments) in the table forever. 17 such orphans in
--      production. They are deleted, and the key is added with ON DELETE CASCADE.
--  O1  organizations was readable by anyone (org_select: using true), including
--      stripe_customer_id / stripe_subscription_id, and every slug was listable,
--      which defeats the slug check of get_match_votes (20260010/12). It is now
--      members-only. Anonymous ?org= visitors resolve their link through
--      get_org_public(slug), which returns id, name, slug, plan only.
--  O2  org_insert let any account insert an organization directly (with
--      plan = 'pro'). Teams are only created through create_organization().
--  C1  settings: legacy key/value table superseded by 20260004, readable by
--      anyone. Dropped.
--
-- Left as is (on purpose): matches_select / players_select stay public — the
-- anonymous vote screen reads the active match and roster before any auth.
--
-- DEPLOY ORDER: deploy the frontend FIRST. It calls submit_vote /
-- get_org_public and falls back to the old direct queries when they do not
-- exist yet. Applying this migration before that frontend is live would break
-- voting and ?org= links on the old frontend.

-- ── V3: orphan ballots + foreign key ────────────────────────────────────────
delete from votes v
where v.match_id is null
   or not exists (select 1 from matches m where m.id = v.match_id);

alter table votes alter column match_id set not null;
alter table votes drop constraint if exists votes_match_id_fkey;
alter table votes add constraint votes_match_id_fkey
  foreign key (match_id) references matches(id) on delete cascade;

-- ── V1: one vote per player per match ──────────────────────────────────────
-- Name-only rows (legacy, guests) are not constrained: two supporters may share
-- a first name, and a guest link is single-use anyway.
create unique index if not exists votes_one_per_player
  on votes (match_id, voter_player_id)
  where voter_player_id is not null;

create or replace function submit_vote(
  p_match_id        bigint,
  p_voter_name      text,
  p_voter_player_id bigint default null,
  p_best1_id        bigint default null,
  p_best2_id        bigint default null,
  p_best3_id        bigint default null,
  p_lemon_id        bigint default null,
  p_best1_comment   text   default null,
  p_best2_comment   text   default null,
  p_best3_comment   text   default null,
  p_lemon_comment   text   default null,
  p_guest_token     text   default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m      matches%rowtype;
  v_name text := nullif(trim(p_voter_name), '');
begin
  select * into m from matches where id = p_match_id;
  if not found or m.phase <> 'voting' or m.is_open is not true then
    raise exception 'Le vote est clôturé pour ce match.' using errcode = 'P0001';
  end if;

  if coalesce(m.pepite_count, 2) <> 3 then
    p_best3_id := null;
    p_best3_comment := null;
  end if;

  if p_best1_id is null or p_best2_id is null or p_lemon_id is null
     or (m.pepite_count = 3 and p_best3_id is null) then
    raise exception 'Vote incomplet.' using errcode = '22023';
  end if;

  if not (p_best1_id = any(m.present_ids) and p_best2_id = any(m.present_ids)
          and (p_best3_id is null or p_best3_id = any(m.present_ids))) then
    raise exception 'Joueur absent de ce match.' using errcode = '22023';
  end if;

  if p_best1_id = p_best2_id or p_best1_id = p_best3_id or p_best2_id = p_best3_id then
    raise exception 'Choisis des pépites différentes.' using errcode = '22023';
  end if;

  -- The citron may be absent (the UI offers absents), but must be in the team.
  if not exists (select 1 from players where id = p_lemon_id and org_id = m.org_id) then
    raise exception 'Joueur inconnu.' using errcode = '22023';
  end if;

  if greatest(length(coalesce(p_best1_comment, '')), length(coalesce(p_best2_comment, '')),
              length(coalesce(p_best3_comment, '')), length(coalesce(p_lemon_comment, ''))) > 280 then
    raise exception 'Commentaire trop long (280 caractères max).' using errcode = '22023';
  end if;

  -- Identity: a single-use guest link, or the player chip. No account needed.
  if p_guest_token is not null then
    update guest_tokens
    set    used = true
    where  token = p_guest_token and match_id = p_match_id and not used
    returning name into v_name;
    if not found then
      raise exception 'Ce lien d''invitation a déjà été utilisé ou n''est pas valide.' using errcode = 'P0001';
    end if;
    p_voter_player_id := null;
  elsif p_voter_player_id is not null then
    if not (p_voter_player_id = any(m.present_ids)) then
      raise exception 'Joueur absent de ce match.' using errcode = '22023';
    end if;
    if p_voter_player_id = p_best1_id or p_voter_player_id = p_best2_id
       or p_voter_player_id = p_best3_id then
      raise exception 'Tu ne peux pas être ta propre pépite.' using errcode = '22023';
    end if;
  else
    raise exception 'Choisis ton prénom avant de voter.' using errcode = '22023';
  end if;

  if v_name is null or length(v_name) > 50 then
    raise exception 'Prénom invalide.' using errcode = '22023';
  end if;

  begin
    insert into votes (match_id, voter_name, voter_player_id,
                       best1_id, best1_comment, best2_id, best2_comment,
                       best3_id, best3_comment, lemon_id, lemon_comment)
    values (p_match_id, v_name, p_voter_player_id,
            p_best1_id, nullif(trim(p_best1_comment), ''), p_best2_id, nullif(trim(p_best2_comment), ''),
            p_best3_id, nullif(trim(p_best3_comment), ''), p_lemon_id, nullif(trim(p_lemon_comment), ''));
  exception when unique_violation then
    raise exception 'Tu as déjà voté pour ce match.' using errcode = '23505';
  end;
end;
$$;

revoke execute on function submit_vote(bigint, text, bigint, bigint, bigint, bigint, bigint, text, text, text, text, text) from public;
grant  execute on function submit_vote(bigint, text, bigint, bigint, bigint, bigint, bigint, text, text, text, text, text) to anon, authenticated;

drop policy if exists votes_insert on votes;
revoke insert on votes from anon, authenticated;

-- ── V2: admin can cancel a vote while the vote is open ─────────────────────
create or replace function delete_vote(p_vote_id bigint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org   uuid;
  v_phase text;
begin
  select m.org_id, m.phase into v_org, v_phase
  from   votes v join matches m on m.id = v.match_id
  where  v.id = p_vote_id;

  if v_org is null or not is_org_admin(v_org) then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  if v_phase <> 'voting' then
    raise exception 'Impossible après le début du dépouillement.' using errcode = 'P0001';
  end if;

  delete from votes where id = p_vote_id;
end;
$$;

revoke execute on function delete_vote(bigint) from public, anon;
grant  execute on function delete_vote(bigint) to authenticated;

-- ── O1: organizations — members only, public lookup by slug ────────────────
drop policy if exists org_select on organizations;
drop policy if exists "org_members_can_read_org" on organizations;
create policy org_select on organizations
  for select
  using (is_org_member(id));

create or replace function get_org_public(p_slug text)
returns table(id uuid, name text, slug text, plan text)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select o.id, o.name, o.slug, o.plan from organizations o where o.slug = p_slug;
$$;

revoke execute on function get_org_public(text) from public;
grant  execute on function get_org_public(text) to anon, authenticated;

-- ── O2: no direct org creation (create_organization() is SECURITY DEFINER) ─
drop policy if exists org_insert on organizations;
revoke insert on organizations from anon, authenticated;

-- ── C1: legacy settings table ───────────────────────────────────────────────
drop table if exists settings;
