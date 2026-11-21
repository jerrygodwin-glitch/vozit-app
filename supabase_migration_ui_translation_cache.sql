-- Caches Claude-translated UI copy for the handful of website pages a
-- Telegram-bot reporter gets sent to (payouts, settings) so a page isn't
-- re-translated via the Anthropic API on every single visit — only the
-- first visit per (page, language) pays for a translation call; every
-- later visit (by anyone) is a cache hit until the English source copy
-- actually changes. See src/app/api/translate-ui/route.ts.
create table if not exists public.ui_translation_cache (
  page_key text not null,
  lang text not null,
  content_hash text not null,
  translated jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (page_key, lang)
);

alter table public.ui_translation_cache enable row level security;
-- Service-role only (createAdminClient()) — same reasoning as
-- telegram_sessions: no end-user session to check an RLS policy against,
-- this is a server-to-server cache, not user data.
