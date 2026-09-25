-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: report categories v2 — Conflict/Crisis, Sports                ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ║                                                                            ║
-- ║  Safe to run whether or not supabase_migration_report_category.sql was    ║
-- ║  already run — this covers the column from scratch and just widens the   ║
-- ║  allowed category list.                                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_category_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_category_check
  CHECK (category IN ('justice','politics','economy','environment','crisis','entertainment','sports','other'));

CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
