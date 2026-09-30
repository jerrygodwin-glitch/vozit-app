-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: collapse the manual-review queue                             ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Seconds into the video where Hive detected gore — the report still
-- publishes normally; the player blurs a short window around each of these
-- timestamps instead of the report being held or removed.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS gore_timestamps NUMERIC[] DEFAULT '{}';

-- Two new community flag reasons, now that flags (not a review queue) are
-- the backstop for explicit/hateful content Hive wasn't confident enough
-- to auto-remove on its own.
ALTER TABLE public.report_flags DROP CONSTRAINT IF EXISTS report_flags_reason_check;
ALTER TABLE public.report_flags ADD CONSTRAINT report_flags_reason_check
  CHECK (reason IN ('fake_or_ai_generated','recycled_footage','wrong_location_or_time','explicit_content','hateful_content','other'));
