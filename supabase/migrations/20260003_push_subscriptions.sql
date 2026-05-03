-- ── push_subscriptions ───────────────────────────────────────────────────────
-- Stores Web Push subscriptions per user per org.
-- One row per (user_id, org_id, endpoint) — multiple devices per user allowed.
-- Subscriptions are cleaned up when they expire (delivery returns 410).

create table if not exists push_subscriptions (
  id          bigserial    primary key,
  user_id     uuid         not null references auth.users(id) on delete cascade,
  org_id      uuid         not null references organizations(id) on delete cascade,
  endpoint    text         not null,
  p256dh      text         not null,   -- public key for payload encryption
  auth        text         not null,   -- auth secret for payload encryption
  created_at  timestamptz  not null default now(),

  -- One subscription row per (user, org, endpoint)
  unique (user_id, org_id, endpoint)
);

-- Allow users to manage their own subscriptions
alter table push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on push_subscriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role (Vercel functions) can read all subs for an org to fan out pushes
-- (no RLS restriction needed for service role — it bypasses RLS by default)

-- Index for fast lookup by org when sending notifications
create index if not exists idx_push_subscriptions_org_id
  on push_subscriptions (org_id);
