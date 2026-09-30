-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: field notes                                                  ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- A field note: structured (category + substantiation), not an open
-- text box — there's nowhere for a lone emoji or "wow" reaction to go.
-- Separate from report_flags (which is "this looks fake") and votes (which
-- is newsworthiness) — this is ongoing context/verification, available on
-- every report, not just disputed ones.
CREATE TABLE IF NOT EXISTS public.field_notes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id         UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category          TEXT NOT NULL CHECK (category IN ('confirms_location','contradicts','nearby_witness','additional_context')),
  content           TEXT NOT NULL CHECK (char_length(content) >= 30),
  helpful_count     INT NOT NULL DEFAULT 0,
  not_helpful_count INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_field_notes_report ON public.field_notes(report_id);

-- One rating per user per note — lets someone change their mind, same
-- pattern as votes on reports.
CREATE TABLE IF NOT EXISTS public.field_note_ratings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_note_id  UUID NOT NULL REFERENCES public.field_notes(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  helpful        BOOLEAN NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (field_note_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_field_note_ratings_note ON public.field_note_ratings(field_note_id);

ALTER TABLE public.field_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_note_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public field notes" ON public.field_notes;
CREATE POLICY "Public field notes" ON public.field_notes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public field note ratings" ON public.field_note_ratings;
CREATE POLICY "Public field note ratings" ON public.field_note_ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Self rate" ON public.field_note_ratings;
CREATE POLICY "Self rate" ON public.field_note_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Self re-rate" ON public.field_note_ratings;
CREATE POLICY "Self re-rate" ON public.field_note_ratings FOR UPDATE USING (auth.uid() = user_id);

-- Note creation itself goes through the admin client in the API route (it
-- needs to check account tenure, which RLS can't easily express) — no
-- direct-insert policy needed for field_notes beyond the read policy above.

CREATE OR REPLACE FUNCTION update_field_note_rating_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_note_id UUID := COALESCE(NEW.field_note_id, OLD.field_note_id);
BEGIN
  UPDATE public.field_notes
  SET helpful_count = (SELECT COUNT(*) FROM public.field_note_ratings WHERE field_note_id = v_note_id AND helpful = true),
      not_helpful_count = (SELECT COUNT(*) FROM public.field_note_ratings WHERE field_note_id = v_note_id AND helpful = false)
  WHERE id = v_note_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_field_note_rating_counts ON public.field_note_ratings;
CREATE TRIGGER trg_field_note_rating_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.field_note_ratings
  FOR EACH ROW EXECUTE FUNCTION update_field_note_rating_counts();
