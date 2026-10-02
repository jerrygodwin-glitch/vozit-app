-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: rename latitude/longitude to match the app's actual columns  ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- The original schema named these columns latitude/longitude, but every
-- single place in the app (7 files: report creation, AI 5W analysis, the
-- Mux webhook, corroboration search, the upload form, and more) has always
-- read and written location_lat/location_lng instead — a naming mismatch
-- that only surfaces once a report is actually saved with real GPS data,
-- which is exactly what changed once live recording-and-upload testing
-- started. Renaming the columns (not touching 7 files of app code) also
-- brings them in line with location_name's existing naming convention on
-- this same table.
ALTER TABLE public.reports RENAME COLUMN latitude TO location_lat;
ALTER TABLE public.reports RENAME COLUMN longitude TO location_lng;
