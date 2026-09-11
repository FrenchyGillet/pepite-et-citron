-- ─── Vote deadline (audit F1) ───────────────────────────────────────────────
-- The admin can give a vote a closing time when opening the match (30 min,
-- 1 h, 2 h, or none). Once it has passed, submit_vote refuses new ballots, for
-- players, guest links and replayed offline votes alike. The reveal stays a
-- live, admin-triggered moment: nothing changes phase on its own, so no cron
-- job is needed. The admin can push the deadline back (matches_update is
-- admin-only, 20260011).
--
-- Redefines submit_vote from 20260014 with one extra check (the deadline).
-- Everything else is identical. No deploy-order constraint: the column
-- defaults to NULL (no deadline).

alter table matches add column if not exists vote_deadline timestamptz;

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

  if m.vote_deadline is not null and now() > m.vote_deadline then
    raise exception 'Le vote est clôturé : l''heure limite est passée.' using errcode = 'P0001';
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
