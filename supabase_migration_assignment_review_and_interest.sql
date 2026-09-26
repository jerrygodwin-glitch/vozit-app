-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: assignment review + $0 coverage requests + interest voting    ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Lets an assignment's creator explain why a submitted report wasn't
-- accepted for payment (publication is never affected by this — only
-- whether that specific report draws from the assignment's fee pool).
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS assignment_review_feedback TEXT;

-- Community "interest" signal on an assignment itself, before anyone's
-- even filed a report — lets an unfunded coverage request show visible
-- demand ("200 people want to know what's happening in X"), and lets
-- reporters or orgs decide a popular request is worth funding.
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS interest_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.assignment_votes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id  UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_votes_assignment ON public.assignment_votes(assignment_id);

ALTER TABLE public.assignment_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public assignment votes" ON public.assignment_votes;
CREATE POLICY "Public assignment votes" ON public.assignment_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Self vote" ON public.assignment_votes;
CREATE POLICY "Self vote" ON public.assignment_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Self unvote" ON public.assignment_votes;
CREATE POLICY "Self unvote" ON public.assignment_votes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_assignment_interest_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.assignments
  SET interest_count = (
    SELECT COUNT(*) FROM public.assignment_votes
    WHERE assignment_id = COALESCE(NEW.assignment_id, OLD.assignment_id)
  )
  WHERE id = COALESCE(NEW.assignment_id, OLD.assignment_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_assignment_interest_count ON public.assignment_votes;
CREATE TRIGGER trg_assignment_interest_count
  AFTER INSERT OR DELETE ON public.assignment_votes
  FOR EACH ROW EXECUTE FUNCTION update_assignment_interest_count();

-- No change needed to pay_assignment_fee() — a $0 pool already makes its
-- IF v_spent + v_fee <= v_pool check always false, so nothing can ever
-- accidentally pay out from an unfunded assignment. Funding one later
-- (via assignment_funding, already wired to top up assignment_fee_pool_usd)
-- is what turns that check true.
