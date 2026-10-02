-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: rename mux_playback_id to match the app's actual column      ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Same class of bug as the location_lat/location_lng rename — the original
-- schema named this column mux_playback_id, but all 10 places in the app
-- that touch it (the Mux webhook that finalizes every video, the report
-- detail page's player, the OG image route, etc.) have always used
-- playback_id instead. Without this, a report would upload successfully
-- but the webhook's attempt to save the playback ID would fail silently,
-- leaving every report stuck on "Video processing..." forever.
ALTER TABLE public.reports RENAME COLUMN mux_playback_id TO playback_id;
