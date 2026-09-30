-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: crisis-resource panel flag                                   ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Set by moderateContent() (src/lib/hive-moderation.ts) whenever self-harm
-- content is detected at any meaningful confidence — independent of whether
-- the report was actually removed. Read by the report page to decide
-- whether to show a localized crisis-resource panel (src/lib/crisis-resources.ts).
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS show_crisis_resources BOOLEAN NOT NULL DEFAULT false;
