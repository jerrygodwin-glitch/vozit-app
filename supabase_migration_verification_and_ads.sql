-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: verification/safety features + in-video ad tracking           ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Capture-time metadata for verification (bearing/altitude come from the
-- phone's own sensors; weather is looked up server-side from location+time)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS bearing_degrees NUMERIC(5,1);
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS altitude_meters NUMERIC(7,1);
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS weather_data JSONB;

-- Real transcript of the reporter's own spoken narration (from Whisper),
-- feeding the 5W AI suggestions instead of only title/notes text.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Community "flag as fake/misleading" — separate from up/downvotes, which
-- are about newsworthiness, not authenticity.
CREATE TABLE IF NOT EXISTS public.report_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL CHECK (reason IN ('fake_or_ai_generated','recycled_footage','wrong_location_or_time','other')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_flags_report ON public.report_flags(report_id);

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS flag_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.report_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public flag counts" ON public.report_flags;
CREATE POLICY "Public flag counts" ON public.report_flags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Self flag" ON public.report_flags;
CREATE POLICY "Self flag" ON public.report_flags FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Self unflag" ON public.report_flags;
CREATE POLICY "Self unflag" ON public.report_flags FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_report_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reports
  SET flag_count = (SELECT COUNT(*) FROM public.report_flags WHERE report_id = COALESCE(NEW.report_id, OLD.report_id))
  WHERE id = COALESCE(NEW.report_id, OLD.report_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_report_flag_count ON public.report_flags;
CREATE TRIGGER trg_report_flag_count
  AFTER INSERT OR DELETE ON public.report_flags
  FOR EACH ROW EXECUTE FUNCTION update_report_flag_count();

-- ══════════════════════════════════════════════════════════════════════════
-- IN-VIDEO AD MONETIZATION
-- ══════════════════════════════════════════════════════════════════════════
-- One row per ad actually played to a viewer, so payouts are auditable —
-- same pattern as every other earnings source (payout_records / earnings).
CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id       UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  reporter_id     UUID NOT NULL REFERENCES public.users(id),
  viewer_id       UUID REFERENCES public.users(id),
  ad_network      TEXT NOT NULL DEFAULT 'house',
  revenue_usd     NUMERIC(8,4) NOT NULL DEFAULT 0,
  completed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_report ON public.ad_impressions(report_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_reporter ON public.ad_impressions(reporter_id, created_at);

ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reporter reads own ad impressions" ON public.ad_impressions;
CREATE POLICY "Reporter reads own ad impressions" ON public.ad_impressions FOR SELECT USING (auth.uid() = reporter_id);

-- 'ad_revenue' was already a valid earnings source value in the CHECK
-- constraint — this is the first thing that actually inserts it.
