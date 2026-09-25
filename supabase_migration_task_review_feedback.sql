-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: task review feedback                                          ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ║                                                                            ║
-- ║  Lets a task's creator reject a submission with a reason instead of      ║
-- ║  every submission auto-paying instantly. No CHECK constraint change      ║
-- ║  needed — 'submitted' was already a valid status value, just unused.    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS review_feedback TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
