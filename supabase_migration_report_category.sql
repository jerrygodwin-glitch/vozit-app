-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: report category                                               ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ║                                                                            ║
-- ║  Adds a category to each report, picked by the reporter at upload time    ║
-- ║  (Justice, Politics, Economy, Environment, Entertainment, or Other) so    ║
-- ║  the feed/search can be filtered by topic, not just location.            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_category_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_category_check
  CHECK (category IN ('justice','politics','economy','environment','entertainment','other'));

CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
