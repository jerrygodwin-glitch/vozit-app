-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: allow 'processing' status on payout_records                  ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ║                                                                            ║
-- ║  The Stripe payout route (PATCH /api/stripe) now atomically "claims"     ║
-- ║  cleared payout_records by flipping them to a 'processing' status before ║
-- ║  calling Stripe, so two concurrent payout requests can't both transfer   ║
-- ║  the same earnings. The existing CHECK constraint only allowed           ║
-- ║  ('pending','cleared','paid','failed'), so without this migration that   ║
-- ║  claim update fails outright. Run this before that code path is used.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE public.payout_records DROP CONSTRAINT IF EXISTS payout_records_status_check;
ALTER TABLE public.payout_records ADD CONSTRAINT payout_records_status_check
  CHECK (status IN ('pending','cleared','processing','paid','failed'));
