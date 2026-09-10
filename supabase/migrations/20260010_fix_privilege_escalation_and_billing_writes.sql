-- ─── Fix: role escalation via RPCs + free-form billing column writes ────────
-- Found during a permissions audit (2026-09). Three problems, none caught by
-- the earlier RLS hardening passes (20260006-20260008) because none of them
-- are RLS policies — `pg_policies` dumps don't show these.
--
--  H1  add_org_member(member_email, target_org_id, member_role) is
--      SECURITY DEFINER (bypasses RLS) and never checked that the caller is
--      an admin of target_org_id. It is called directly from the browser
--      (src/api.ts addMember → supabase.rpc). Any authenticated user could
--      call it against ANY org_id — including their own — with
--      member_role: 'admin' and self-promote, or add/promote anyone else.
--      This completely undoes the org_members "members_self_join" policy
--      from 20260006 (that policy only guards direct table inserts, not
--      this SECURITY DEFINER function).
--
--  H2  get_org_members(target_org_id) is the same shape of problem for
--      reads: no membership check, so any caller could pass any org_id and
--      get back every member's email + role for an org they don't belong to.
--
--  H3  organizations RLS only gates *which rows* an admin can touch
--      (is_org_admin(id)), not *which columns*. Nothing stops an admin from
--      calling `supabase.from('organizations').update({ plan: 'pro' })`
--      directly and granting themselves Pro without ever going through
--      Stripe. Those columns are meant to be written only by the
--      stripe-webhook handler (which uses the service role key).
--
-- Depends on is_org_admin() / is_org_member() (20260006) and auth.role()
-- (built-in Supabase helper).

-- ── H1: add_org_member — admin-only ───────────────────────────────────────
create or replace function add_org_member(
  member_email  text,
  target_org_id uuid,
  member_role   text default 'voter'
)
returns void
language plpgsql
security definer
as $$
declare
  target_user_id uuid;
begin
  if not is_org_admin(target_org_id) then
    raise exception 'Réservé aux administrateurs';
  end if;

  select id into target_user_id from auth.users where email = member_email;

  if target_user_id is null then
    raise exception 'Aucun compte trouvé pour %', member_email;
  end if;

  insert into org_members (user_id, org_id, role)
  values (target_user_id, target_org_id, member_role)
  on conflict (user_id, org_id) do update set role = excluded.role;
end;
$$;

revoke all on function add_org_member(text, uuid, text) from public;
grant execute on function add_org_member(text, uuid, text) to authenticated;

-- ── H2: get_org_members — members only (service role still allowed, for ──
--       api/send-match-notification.ts which calls it with the service key
--       and no caller JWT, so auth.uid() is null there) ────────────────────
create or replace function get_org_members(target_org_id uuid)
returns table(user_id uuid, email text, role text)
language plpgsql
security definer
stable
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not is_org_member(target_org_id) then
    return;
  end if;

  return query
    select m.user_id, u.email, m.role
    from   org_members m
    join   auth.users u on u.id = m.user_id
    where  m.org_id = target_org_id
    order by m.role, u.email;
end;
$$;

revoke all on function get_org_members(uuid) from public;
grant execute on function get_org_members(uuid) to authenticated;

-- ── H3: organizations — billing columns are service-role-only ────────────
-- An org admin can still update name/slug (org_update policy, 20260006);
-- this trigger silently discards any change to the billing columns unless
-- the request is running as service_role (the stripe-webhook handler).
create or replace function protect_organizations_billing_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.plan                   := old.plan;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.current_period_end     := old.current_period_end;
    new.cancel_at_period_end   := old.cancel_at_period_end;
    new.last_payment_failed_at := old.last_payment_failed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_protect_billing on organizations;

create trigger organizations_protect_billing
  before update on organizations
  for each row
  execute function protect_organizations_billing_columns();
