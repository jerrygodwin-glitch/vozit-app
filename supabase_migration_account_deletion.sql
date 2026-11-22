-- Account deletion (soft-delete, 30-day grace window before any purge job
-- is ever built — see src/app/api/account/delete/route.ts) and the
-- first-upload Contributor Agreement acceptance timestamp. Does NOT add a
-- separate "consent_given_at" column for Terms/Privacy acceptance — that
-- already exists as users.terms_accepted_at (supabase_migration_terms_accepted_at.sql).
alter table public.users
  add column if not exists contributor_agreement_accepted_at timestamptz,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deletion_scheduled_at timestamptz;
