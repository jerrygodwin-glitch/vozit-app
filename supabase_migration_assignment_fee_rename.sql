-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: rename "bounty" terminology to "assignment fee"              ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ║                                                                            ║
-- ║  Brings the LIVE database in line with the renamed columns/functions in  ║
-- ║  supabase_schema.sql and supabase_schema_v2_additions.sql. Nothing in    ║
-- ║  the live app currently reads or writes these columns (the Assignments   ║
-- ║  page shows static sample data and its "Join" button isn't wired up      ║
-- ║  yet), so this is safe to run at any time before that feature goes live. ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- assignments table
ALTER TABLE public.assignments RENAME COLUMN bounty_pool_usd TO assignment_fee_pool_usd;
ALTER TABLE public.assignments RENAME COLUMN bounty_per_report_usd TO assignment_fee_per_report_usd;
ALTER TABLE public.assignments RENAME COLUMN bounty_spent_usd TO assignment_fee_spent_usd;

-- reports table
ALTER TABLE public.reports RENAME COLUMN assignment_bounty_paid TO assignment_fee_paid;

-- payout_records.source check constraint: 'assignment_bounty' -> 'assignment_fee'
-- (constraint name assumed from Postgres's default naming — verify with
--  \d payout_records in the SQL editor if this DROP fails to match anything)
ALTER TABLE public.payout_records DROP CONSTRAINT IF EXISTS payout_records_source_check;
UPDATE public.payout_records SET source = 'assignment_fee' WHERE source = 'assignment_bounty';
ALTER TABLE public.payout_records ADD CONSTRAINT payout_records_source_check
  CHECK (source IN ('ad_revenue','task_reward','licensing','community_pool','assignment_fee'));

-- earnings.source check constraint: 'bounty' -> 'assignment_fee'
ALTER TABLE public.earnings DROP CONSTRAINT IF EXISTS earnings_source_check;
UPDATE public.earnings SET source = 'assignment_fee' WHERE source = 'bounty';
ALTER TABLE public.earnings ADD CONSTRAINT earnings_source_check
  CHECK (source IN ('ad_revenue','licensing','tip','assignment_fee'));

-- Replace the payout trigger + function (old ones dropped, new ones match
-- the renamed columns above)
DROP TRIGGER IF EXISTS trg_pay_assignment_bounty ON public.reports;
DROP FUNCTION IF EXISTS pay_assignment_bounty();

CREATE OR REPLACE FUNCTION pay_assignment_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_fee    NUMERIC(8,2);
  v_pool   NUMERIC(10,2);
  v_spent  NUMERIC(10,2);
BEGIN
  IF NEW.assignment_id IS NOT NULL
     AND NEW.assignment_accepted = true
     AND (OLD.assignment_accepted IS DISTINCT FROM true)
     AND NEW.assignment_fee_paid = false
  THEN
    SELECT assignment_fee_per_report_usd, assignment_fee_pool_usd, assignment_fee_spent_usd
      INTO v_fee, v_pool, v_spent
      FROM public.assignments WHERE id = NEW.assignment_id;

    IF v_spent + v_fee <= v_pool THEN
      NEW.assignment_fee_paid := true;

      UPDATE public.assignments
      SET assignment_fee_spent_usd = assignment_fee_spent_usd + v_fee, updated_at = now()
      WHERE id = NEW.assignment_id;

      UPDATE public.assignment_contributors
      SET total_earned = total_earned + v_fee
      WHERE assignment_id = NEW.assignment_id AND user_id = NEW.user_id;

      INSERT INTO public.payout_records
        (user_id, amount_usd, source, report_id, assignment_id, clears_at)
      VALUES
        (NEW.user_id, v_fee, 'assignment_fee', NEW.id, NEW.assignment_id,
         now() + interval '7 days');

      UPDATE public.users
      SET pending_payout = pending_payout + v_fee
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_pay_assignment_fee
  BEFORE UPDATE OF assignment_accepted ON public.reports
  FOR EACH ROW EXECUTE FUNCTION pay_assignment_fee();

-- update_assignment_pool() references the renamed pool column
CREATE OR REPLACE FUNCTION update_assignment_pool()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.assignments
  SET assignment_fee_pool_usd = assignment_fee_pool_usd + NEW.amount_usd, updated_at = now()
  WHERE id = NEW.assignment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- (trg_assignment_funding already points at this function name — no change needed there)
