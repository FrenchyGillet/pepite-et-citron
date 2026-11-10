-- ─── Track the migrations applied to the database ───────────────────────────
-- Migrations are applied by hand in the SQL Editor, so nothing in the
-- database said which ones ran. From now on, every migration ends by
-- recording its own number in schema_migrations (checked by
-- src/test/migrations.test.ts), and `npm run db:missing` prints a one-statement
-- query that lists the migrations of the repository the database lacks.
--
--  T1  schema_migrations(version, applied_at). RLS on, no policy: only the
--      SQL Editor (service role / postgres) reads it.
--  T2  Backfill: the migrations up to 20260026 are recorded as applied, as
--      production is up to date when this one runs. If that is not the case,
--      delete the rows of the missing ones after running this migration.
--
-- Deploy order: independent of the front.

create table if not exists schema_migrations (
  version    text primary key,
  applied_at timestamptz not null default now()
);

alter table schema_migrations enable row level security;
revoke all on table schema_migrations from public, anon, authenticated;

insert into schema_migrations (version) values
  ('20240001'), ('20240002'), ('20240003'), ('20250001'),
  ('20260001'), ('20260002'), ('20260003'), ('20260004'), ('20260005'),
  ('20260006'), ('20260007'), ('20260008'), ('20260009'), ('20260010'),
  ('20260011'), ('20260012'), ('20260013'), ('20260014'), ('20260015'),
  ('20260016'), ('20260017'), ('20260018'), ('20260019'), ('20260020'),
  ('20260021'), ('20260022'), ('20260023'), ('20260024'), ('20260025'),
  ('20260026')
on conflict (version) do nothing;

-- Verification (one statement): expect 31.
-- select count(*) from schema_migrations;

insert into schema_migrations (version) values ('20260027') on conflict (version) do nothing;
