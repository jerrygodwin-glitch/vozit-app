-- Telegram bot intake — chat-based report submission for reporters in
-- conflict zones, on low bandwidth, or who otherwise can't use the
-- website/app. See src/app/api/telegram/route.ts, src/lib/bot-common.ts,
-- src/lib/telegram-bot.ts.
--
-- Reuses the existing reports.location_lat/location_lng columns for GPS
-- (not a separate reporter_latitude/reporter_longitude pair) and does NOT
-- add a 'pending_review' status — reports.status's real CHECK constraint
-- only allows 'processing'/'published'/'flagged'/'removed', and
-- hive-moderation.ts already documents that VozIt deliberately has no
-- manual-review queue (a one-person operation can't keep one cleared). A
-- bot-submitted report goes through the exact same automated moderation
-- every other channel does.

-- Links a Telegram account to a VozIt user, and remembers their chosen bot
-- language across separate conversations (the per-conversation session
-- below is cleared after every report, so this is the only thing that
-- persists a reporter's language choice from one submission to the next).
alter table public.users
  add column if not exists telegram_id text unique,
  add column if not exists telegram_language text;

-- Submission-channel/provenance metadata — default values match what the
-- website/app flow already provides today (device sensors, so 'full'
-- quality), so the existing /api/reports insert needs no code change at all
-- to pick these up correctly.
alter table public.reports
  add column if not exists submission_channel text default 'website',
  add column if not exists metadata_quality text default 'full',
  add column if not exists reported_timestamp text,
  add column if not exists device_info text,
  add column if not exists original_filename text,
  add column if not exists report_metadata jsonb,
  add column if not exists metadata_credibility_modifier integer default 0;

do $$ begin
  alter table public.reports add constraint reports_submission_channel_check
    check (submission_channel = any (array['website','app','telegram','whatsapp']));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.reports add constraint reports_metadata_quality_check
    check (metadata_quality = any (array['full','partial','minimal']));
exception when duplicate_object then null; end $$;

-- Per-chat conversation state for the stateless Telegram webhook — each
-- incoming message is its own HTTP call with no memory of prior ones, so
-- progress through the language → account-setup → video → description →
-- location → when flow has to live somewhere between requests.
create table if not exists public.telegram_sessions (
  chat_id text primary key,
  step text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.telegram_sessions enable row level security;
-- Service-role only (createAdminClient()) — there is no end-user session
-- tied to a Telegram chat_id for RLS to check against, same reasoning as
-- every other server-to-server-only table in this schema (e.g.
-- moderation_log, admin_audit_log).
