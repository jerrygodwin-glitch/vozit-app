-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: automated Hive strikes + is_banned columns                   ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- is_banned/ban_reason were already referenced by the app (auto-ban path in
-- /api/reports and /api/mux-webhook, and the login/register gate) but were
-- never actually defined in any tracked schema file — this adds them for
-- real, whether or not they already exist live, so the auto-ban path (the
-- single most severe protection in the whole moderation system) is
-- guaranteed to have somewhere to write.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- A high-confidence Hive auto-remove now applies a strike automatically
-- (src/lib/strikes.ts), logged with moderator_id = NULL to mark it as an
-- automated decision rather than a human's. moderator_id was NOT NULL —
-- relax it, and allow the new 'auto_strike' action value alongside the
-- existing human-issued ones.
ALTER TABLE public.moderation_log ALTER COLUMN moderator_id DROP NOT NULL;

ALTER TABLE public.moderation_log DROP CONSTRAINT IF EXISTS moderation_log_action_check;
ALTER TABLE public.moderation_log ADD CONSTRAINT moderation_log_action_check
  CHECK (action IN ('restore','remove','remove_warn','remove_ban','keep_flagged','auto_strike'));
