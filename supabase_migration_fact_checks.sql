-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: fact-check notes                                              ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- A fact-check note: structured (category + substantiation), not an open
-- text box — there's nowhere for a lone emoji or "wow" reaction to go.
-- Separate from report_flags (which is "this looks fake") and votes (which
-- is newsworthiness) — this is ongoing context/verification, available on
-- every report, not just disputed ones.
CREATE TABLE IF NOT EXISTS public.fact_checks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id         UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category          TEXT NOT NULL CHECK (category IN ('confirms_location','contradicts','nearby_witness','additional_context')),
  content           TEXT NOT NULL CHECK (char_length(content) >= 30),
  helpful_count     INT NOT NULL DEFAULT 0,
  not_helpful_count INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_checks_report ON public.fact_checks(report_id);

-- One rating per user per note — lets someone change their mind, same
-- pattern as votes on reports.
CREATE TABLE IF NOT EXISTS public.fact_check_ratings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fact_check_id  UUID NOT NULL REFERENCES public.fact_checks(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  helpful        BOOLEAN NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fact_check_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_check_ratings_note ON public.fact_check_ratings(fact_check_id);

ALTER TABLE public.fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_check_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public fact checks" ON public.fact_checks;
CREATE POLICY "Public fact checks" ON public.fact_checks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public fact check ratings" ON public.fact_check_ratings;
CREATE POLICY "Public fact check ratings" ON public.fact_check_ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Self rate" ON public.fact_check_ratings;
CREATE POLICY "Self rate" ON public.fact_check_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Self re-rate" ON public.fact_check_ratings;
CREATE POLICY "Self re-rate" ON public.fact_check_ratings FOR UPDATE USING (auth.uid() = user_id);

-- Note creation itself goes through the admin client in the API route (it
-- needs to check account tenure, which RLS can't easily express) — no
-- direct-insert policy needed for fact_checks beyond the read policy above.

CREATE OR REPLACE FUNCTION update_fact_check_rating_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_note_id UUID := COALESCE(NEW.fact_check_id, OLD.fact_check_id);
BEGIN
  UPDATE public.fact_checks
  SET helpful_count = (SELECT COUNT(*) FROM public.fact_check_ratings WHERE fact_check_id = v_note_id AND helpful = true),
      not_helpful_count = (SELECT COUNT(*) FROM public.fact_check_ratings WHERE fact_check_id = v_note_id AND helpful = false)
  WHERE id = v_note_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_fact_check_rating_counts ON public.fact_check_ratings;
CREATE TRIGGER trg_fact_check_rating_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.fact_check_ratings
  FOR EACH ROW EXECUTE FUNCTION update_fact_check_rating_counts();
