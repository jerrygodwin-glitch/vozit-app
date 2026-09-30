-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: language-aware 5W analysis + on-demand translation cache      ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Which language the AI 5W suggestions were actually written in (detected
-- from the reporter's own transcript/notes, not forced to English).
ALTER TABLE public.ai_analyses ADD COLUMN IF NOT EXISTS language TEXT;

-- Shared, cached translations of a report's title/5Ws/transcript — one row
-- per (report, target language), so the same translation is never paid for
-- twice. Never touches the original fields on the report itself.
CREATE TABLE IF NOT EXISTS public.report_translations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  lang        TEXT NOT NULL,
  title       TEXT,
  who         TEXT,
  what        TEXT,
  where_text  TEXT,
  why         TEXT,
  transcript  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, lang)
);

CREATE INDEX IF NOT EXISTS idx_report_translations_report ON public.report_translations(report_id);

ALTER TABLE public.report_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public translations" ON public.report_translations;
CREATE POLICY "Public translations" ON public.report_translations FOR SELECT USING (true);

-- Writes go through the admin client in the API route (it's a shared cache,
-- not user-owned data) — no insert/update policy needed for the public client.
