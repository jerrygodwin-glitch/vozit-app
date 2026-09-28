-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: gyroscope tilt/roll                                           ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Rounds out the "compass & gyroscope vector" picture alongside the
-- existing bearing_degrees — beta (front-back tilt) and gamma (left-right
-- roll) from the phone's own orientation sensor.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS tilt_degrees NUMERIC(5,1);
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS roll_degrees NUMERIC(5,1);
