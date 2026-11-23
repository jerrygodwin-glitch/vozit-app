# VozIt! — Complete Project Knowledge Base

> This file captures every decision, architecture choice, and feature specification
> from the full build history across all sessions. Claude Code should read this
> file at the start of every session to understand the complete project context.

---

## 1. PRODUCT IDENTITY

- **Name:** VozIt!
- **Tagline:** "I was there..."
- **What it is:** Citizen journalism platform — reporters on the ground capture video of breaking news, earn revenue from their footage
- **Two products:** Website (Next.js, this repo) + Mobile apps (React Native/Expo, planned)
- **Both share:** Same Supabase database, same API routes, same auth system

## 2. BRAND DESIGN

- **Colors:**
  - Orange: #FE3D07 (primary action)
  - Dark Orange: #D63006 (WCAG-compliant text on orange backgrounds)
  - Blue: #0a8fe8 (links, secondary)
  - Deep Blue: #0a3ff1 (gradient end)
  - Bone: #f0e8d8 (warm backgrounds)
  - Background: #f7f7f8 (page bg)
  - Text primary: #1a1a1a
  - Text secondary: #666 (WCAG AA compliant, replaces old #888)
  - Text muted: #999

- **Logo:** WebP base64 embedded in src/lib/ui.tsx as LOGO constant (64x64 original, used at various sizes)
- **Header:** Blue gradient (linear-gradient to right: #70b8e0 → #50b0e8 → #18a0e8 → #0a3ff1)
  - Previously started at bone #f0e8d8 but white text was invisible — changed to #70b8e0 for WCAG contrast
- **Speech bubble:** Orange (#FE3D07) rounded rectangle with "I was there..." in white italic, speech tail pointing down-left
- **Floating stamp on videos:** "VozIt! — I was there..."

## 3. REVENUE MODEL

### Reporter Tiers
| Tier | Revenue Share | Requirements |
|------|--------------|--------------|
| Starter | 40% | 0-25 reports |
| Silver | 45% | 26-100 reports, 80%+ credibility |
| Gold | 50% | 101-499 reports, 90%+ credibility |
| Platinum | 55% | 500+ reports, 95%+ credibility |

### Licensing Fees (paid by media organizations to use footage)
**Embed:**
- Editorial: Free
- Commercial: $6 CPM
- Duration: 1 year
- Rights: Embed player, link back

**Digital:**
- Clip: $75
- Standard: $150
- Breaking: $250
- Duration: 30 days
- Rights: Download, digital publish, social

**Broadcast:**
- Local: $500
- National: $2,500
- Documentary: $3,500
- Breaking exclusive: $7,500
- 24-hour exclusive: $10,000
- Duration: 90 days
- Rights: Broadcast, streaming, archive

**Wire Service:**
- Standard: $3,000
- Exclusive: $10,000
- Breaking: $15,000
- Duration: 30 days
- Rights: Redistribute, sublicense, full editorial

### Revenue Sources for Reporters
1. Ad revenue (from embedded player views)
2. Licensing fees (share of media org payments)
3. Tips (from viewers)
4. Assignment fees (from assignment completion)

## 4. PAYOUT SYSTEM

### 8 Providers (all with OFAC sanctions screening on every withdrawal)
1. **Stripe** — bank transfer, 46+ countries (US, EU, UK, CA, AU +)
2. **PayPal** — PayPal balance, 200+ countries
3. **Wise** — low-fee bank transfer, real FX rate, 80+ countries
4. **Payoneer** — bank or prepaid card, 200+ countries
5. **Flutterwave** — M-Pesa, MTN, Airtel mobile money (Africa)
6. **Chipper Cash** — zero-fee wallet, 7 African countries
7. **WorldRemit** — bank, mobile money, or cash pickup, 130+ countries
8. **Crypto (USDC)** — any wallet, anywhere, no bank needed

### OFAC Compliance
- Every withdrawal screened against OFAC SDN list
- Sanctioned-region options explored:
  - Option B: EU subsidiary for sanctioned-region payouts under EU media carve-outs
  - Option D: Partner with CPJ/RSF for OFAC-licensed sanctioned-region payouts
- 7-day hold on new revenue before withdrawal

## 5. ARCHITECTURE

### Stack
- **Frontend:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Hosting:** Vercel (auto-deploys from GitHub push to main)
- **Video:** Mux (upload, processing, streaming, thumbnails)
- **Payments:** Stripe (licensing purchases, webhook events)
- **AI Analysis:** Anthropic Claude API (5W completeness scoring)
- **Content Moderation:** Hive AI (prohibited content scanning)
- **CAPTCHA:** Cloudflare Turnstile (registration protection)
- **Provenance:** C2PA (content authenticity chain)
- **Error Monitoring:** Sentry

### Live Infrastructure
- **Production URL:** https://vozit-app-v2-voz-it.vercel.app
- **Supabase project:** mfanqkbhegxppyitxtye (us-east-1)
- **Supabase URL:** https://mfanqkbhegxppyitxtye.supabase.co
- **GitHub repo:** https://github.com/jerrygodwin-glitch/vozit-app
- **Vercel team:** V2 VozIt (team_klWmxoBkbKWsAlcXg0tVGPy1)
- **Vercel project:** prj_QxwFeLo4wudlyxN7VYeZjIOBmvyQ
- **Owner account:** jerry.godwin@gmail.com

### Supabase Credentials (hardcoded, not env vars)
- Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYW5xa2JoZWd4cHB5aXR4dHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDc2NDYsImV4cCI6MjEwMzcyMzY0Nn0.83-3UqR1BH2uaVoTO7Gta0l3lxVlkh7qSZ0b20aszdw
- Jerry's user ID: c1fda080-4c4d-4a51-bab8-ca210fce18b7

### Database Schema
users, reports, votes, comments, earnings, payouts, payout_records, assignments, assignment_angles, assignment_contributors, assignment_funding, ofac_screenings, moderation_scans, provenance, social_accounts, social_distributions, social_analytics, licenses, embed_views, ai_analyses, admin_audit_log, rate_limits, login_attempts, tasks

Note: `categories` does not exist in the live schema despite being listed here previously — confirmed via direct Supabase access on 2026-09-22. `regions` is not a table either; it's a `TEXT[]` column on `assignments`. `report_categories` and `report_regions` don't exist. The old table name `assignment_reporters` was also wrong — the real tables are `assignment_angles` and `assignment_contributors`. The rest of this list reflects what's defined in `supabase_schema.sql`/`supabase_schema_v2_additions.sql`, not an independent audit of the live database — worth a full pass now that Supabase access is connected.

### Environment Variables Needed in Vercel Dashboard
| Variable | Service | Status |
|----------|---------|--------|
| MUX_TOKEN_ID | Mux video | Needs setup |
| MUX_TOKEN_SECRET | Mux video | Needs setup |
| MUX_WEBHOOK_SECRET | Mux video | Needs setup |
| STRIPE_SECRET_KEY | Stripe payments | Needs setup |
| STRIPE_WEBHOOK_SECRET | Stripe payments — used by both /api/stripe and the new /api/webhooks/stripe-licensing (register the latter's URL as a webhook endpoint in the Stripe dashboard listening for checkout.session.completed, then use that endpoint's own signing secret here) | Needs setup |
| WATERMARK_WORKER_URL | Watermark worker (see /watermark-worker) — e.g. https://vozit-watermark-worker.fly.dev | Needs setup |
| WATERMARK_WORKER_SECRET | Watermark worker — must match the same value set as a Fly.io secret on the worker | Needs setup |
| ANTHROPIC_API_KEY | Claude AI 5W analysis | Needs setup |
| TURNSTILE_SECRET_KEY | Cloudflare CAPTCHA | Needs setup |
| HIVE_API_KEY | Content moderation | Needs setup |
| NEXT_PUBLIC_SENTRY_DSN | Error monitoring | Set by Claude Code |
| SUPABASE_SERVICE_ROLE_KEY | Admin operations | Needs setup |
| TELEGRAM_BOT_TOKEN | @VozItReporterBot intake bot (src/app/api/telegram/route.ts) — from @BotFather. Separate from VOZIT_TELEGRAM_BOT_TOKEN (the outbound VozItNewsBot) | Needs setup |
| TELEGRAM_WEBHOOK_SECRET | Optional — verifies incoming Telegram webhook calls, same pattern as MUX_WEBHOOK_SECRET | Optional |

## 6. KEY FEATURES

### Camera Recorder (src/components/CameraRecorder.tsx — 15KB)
- 90-second maximum recording
- Uses browser MediaRecorder API
- 5W guided teleprompter prompts:
  - 0-5s: "Recording... show what's happening"
  - 5-15s: WHO — "Tell us who is involved"
  - 15-30s: WHAT — "Describe what is happening"
  - 30-45s: WHERE — "Say where you are"
  - 45-55s: WHEN — "When did this start?"
  - 55-70s: WHY — "Why is this happening?"
  - 70-82s: "Wrap up — anything else?"
  - 82-90s: SIGN OFF — "Say: 'I was there' — your name, your city"
- Progress bar showing time elapsed
- Red pulsing record indicator

### Voice-Over Recorder (src/components/VoiceOverRecorder.tsx — 16KB)
- For silent footage that needs narration
- Plays back the video while recording audio overlay
- Server-side merge via FFmpeg (background worker needed)

### AI 5W Analysis (src/lib/ai-analysis.ts — 11KB)
- Uses Claude API to analyze each report
- Scores completeness of Who, What, Where, When, Why
- Generates summary and credibility indicators
- Runs automatically after upload

### Content Moderation
- Hive AI scans video for prohibited content
- Text moderation on title/description before publishing
- AI-generated video detection added by Claude Code
- Pre-publish moderation (not post-publish)

### Watermarking
- VozIt! branding overlay on published videos
- FFmpeg processing (background worker needed)
- "VozIt! — I was there..." floating stamp

### Social Distribution
- Auto-post to 6 platforms: YouTube, TikTok, Instagram, Facebook, X (Twitter), Telegram
- Each platform has its own monetization tracking
- Social accounts page uses real inline SVG platform marks (simple-icons) —
  the Google Favicon API is blocked by this site's own CSP and was never a
  working icon source; don't reintroduce it

### Instagram posting — direct Graph API, bypassing the broken Page link (2026-11-23)
A pasted spec asked to "build Instagram Graph API integration that bypasses
the broken Page linking," framed as new work. Checked the live code first:
**most of this was already built and live**, from an earlier session —
`postToInstagram()` in `src/lib/social-distribution.ts` already creates a
Reels container and publishes it via direct Graph API calls against a known
Instagram Business Account ID (`VOZIT_INSTAGRAM_USER_ID` /
`17841469846896307`) and access token (`VOZIT_INSTAGRAM_TOKEN`) — it never
depended on Meta's "Link Instagram to Page" UI feature at all (that feature
only affects Business Suite's own account-picker screen, not direct Graph
API calls). It's already wired into `autoDistributeToVozItChannels()`
(fires automatically on every published report), and analytics
(`fetchInstagramAnalytics` — views/likes/comments/revenue) already exists
in `src/lib/social-monetization.ts`. None of that was rebuilt.

**What was genuinely missing, and got built:**
- **Real container-status polling** (`src/lib/instagram-api.ts`'s
  `pollContainerStatus()`) replaces a blind 10-second sleep in
  `postToInstagram` — the old code had an explicit comment flagging the
  sleep as a placeholder ("in production, poll status endpoint").
- **`/api/instagram/extend-token`** and **`/api/instagram/refresh-token`**
  (both admin-role-gated, same `isAdminIpAllowed` + `role==='admin'` pattern
  as `/api/admin/moderation`) — exchange a short-lived Graph API Explorer
  token (first-time setup) or the current long-lived token (renewal, every
  ~60 days) for a fresh 60-day one via `exchangeForLongLivedToken()` in
  `instagram-api.ts`. Both just return the new token in the response for
  Jerry to copy into `VOZIT_INSTAGRAM_TOKEN` in Vercel himself — neither
  route writes to Vercel's env vars directly. **New env vars needed:
  `VOZIT_META_APP_ID` (1899963848097738, the existing "VozIt App") and
  `VOZIT_META_APP_SECRET`** — the exchange call needs both.
- **Instagram's 25-posts/24h API limit** — reuses the same persistent
  `rateLimit()` (Supabase-backed, same mechanism every auth route already
  uses) rather than a bespoke counter; checked inside
  `autoDistributeToVozItChannels()`'s Instagram branch, which now takes an
  optional `supabase` admin-client param for this (wired from
  `/api/mux-webhook`, which already had one in scope).
- **Small caption improvement**: added a `📍 location` line to the
  auto-posted Reel caption, matching what the other platforms' captions
  already include.

**Spec items deliberately NOT done, because they don't apply or don't exist
as described:**
- *A standalone `/api/instagram/insights` route.* Not built — would
  duplicate the existing analytics pipeline (`fetchInstagramAnalytics`,
  already called internally by `/api/social` GET for a reporter's own
  dashboard). No second route needed for the same data.
- *"Add Instagram to the auto-distribution pipeline alongside YouTube,
  TikTok, Facebook, X, **Reddit**, and Telegram."* VozIt has never
  integrated with Reddit — the real list is YouTube/TikTok/Instagram/
  Facebook/X/Telegram (6 platforms, confirmed in code). Not added; the
  spec's platform list was simply wrong.
- *Updating `src/app/settings/social/page.tsx` to show Instagram
  "Connected via API."* That page is for individual reporters connecting
  their own personal accounts (a separate OAuth-based system,
  `/api/social` + the `social_accounts` table) — not VozIt's own official
  channel, which has no settings-page UI at all (admin-configured via env
  vars only). The page doesn't currently say anything about "connecting
  through Facebook Page settings" either, so there was nothing matching
  the spec's description to remove.
- *A token-expiry-warning notification system.* Not built — no
  scheduled-task runner exists in this project at all yet (no
  `vercel.json`/cron config), so there's no automatic trigger point for a
  warning check. `/api/instagram/refresh-token` is a manually-triggered
  admin action for now; Jerry should call it periodically (every ~50 days)
  rather than wait for an expiry warning that doesn't exist yet.
- **Known precondition, not yet resolved**: Meta's "Link Instagram to Page"
  bug (see the social-media-setup item in memory) is still broken as of
  this entry — Jerry is working around it with a Graph API Explorer-issued
  token exchanged via the new endpoints above, not by the Page link itself
  getting fixed.

### Telegram Bot Intake (src/app/api/telegram/route.ts)
Lets reporters in conflict zones, on low bandwidth, or who otherwise can't
use the website/app submit a full report — video, description, location —
entirely through a chat with @VozItReporterBot. This is the INBOUND/submission
direction and is a completely separate bot/token from the OUTBOUND
auto-distribution Telegram channel above (VozItNewsBot / `VOZIT_TELEGRAM_BOT_TOKEN`,
which posts VozIt's own published reports TO a public channel) — don't
confuse the two integrations.

- `src/lib/bot-common.ts` — message templates in 10 languages (en/es/ar/fr/uk/pt/sw/ru/id/fa — Russian, Indonesian, and Persian/Farsi added for their own large Telegram user bases, Farsi specifically for Iran's crisis-journalism relevance),
  Claude-API language detection + translate-to-English, video duration
  validation (61-90s, same window the website enforces), the submission-
  channel credibility modifier, and `createReportFromBot()`/`createAccountFromBot()`.
- `src/lib/telegram-bot.ts` — `sendMessage`, `getFile` (downloads bytes,
  rejects >20MB — Telegram's own bot-download ceiling), `extractVideoMetadata`
  (reads whatever Telegram's message object itself reports — NOT a general
  EXIF/GPS parser, no binary tool for that is installed here), and
  `parseMp4Duration` (reads the real duration straight out of the video's own
  `moov`/`mvhd` box — needed because Telegram's API only reports duration for
  compressed "video message" sends, never for files sent as a document).
- `src/app/api/telegram/route.ts` — the webhook. Telegram gives one stateless
  HTTP call per message, so all conversation progress (language → first-time
  account setup → video → description → location → when) lives in the new
  `telegram_sessions` table (chat_id, step, data jsonb), read/written on
  every request, cleared once a report is created.
- **No `pending_review` status exists or was added.** The original build
  spec for this feature assumed one, but `reports.status`'s real CHECK
  constraint only allows `processing`/`published`/`flagged`/`removed`, and
  `hive-moderation.ts` already documents that VozIt deliberately has no
  manual-review queue (a one-person operation can't keep one cleared). A
  bot-submitted report goes through the exact same automated text/video
  moderation every other channel does — `createReportFromBot()` duplicates
  (deliberately, not shared via refactor, to avoid touching the already-
  live `/api/reports` insert path) the real insert shape from that route.
  Once a report has a valid `mux_upload_id`, the existing `/api/mux-webhook`
  pipeline (AI 5W analysis, video moderation, watermarking, auto-distribution)
  picks it up automatically — nothing bot-specific was built for that part.
- **Real known limitation: Telegram's standard Bot API refuses to let a bot
  download any file over 20MB**, regardless of how it was sent. This is in
  direct tension with the bot's own "send as a FILE, not a video message"
  instruction (files preserve quality/metadata but are also more likely to
  exceed 20MB; video messages stay under it more easily but get re-compressed
  and lose location data). No code-side fix exists short of a self-hosted
  Bot API server (a real infrastructure decision, not done here) — the bot
  just tells the reporter their file's too large and points them to the
  website instead.
- `submission_channel`/`metadata_quality` default to `'website'`/`'full'` on
  `reports` (see migration below), so the existing, untouched `/api/reports`
  insert path picks up correct values automatically with zero code change.
- Reuses the existing `reports.location_lat`/`location_lng` columns for GPS
  — NOT a separate `reporter_latitude`/`reporter_longitude` pair (the
  original spec didn't know these columns already existed).
- Migration: `supabase_migration_telegram_bot.sql` — `users.telegram_id`
  (unique) + `users.telegram_language`; `reports.submission_channel`,
  `metadata_quality`, `reported_timestamp`, `device_info`, `original_filename`,
  `report_metadata` (jsonb), `metadata_credibility_modifier`; new
  `telegram_sessions` table. Already applied directly to the live DB.
- Public page: `/submit-telegram`. Linked from the Upload page (banner above
  the camera recorder) and the homepage sidebar.
- **Still needed before this does anything live:** `TELEGRAM_BOT_TOKEN` (from
  @BotFather) in Vercel, and the webhook registered with Telegram
  (`https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://www.vozit.net/api/telegram`
  — optionally with `&secret_token=...` matching an also-set
  `TELEGRAM_WEBHOOK_SECRET` env var, verified on every incoming call the same
  way the Mux webhook's signature is). Until the token exists, this route is
  inert — it 400s with no bot token configured.

#### Bot → website handoff: `/payouts` and `/profile` commands
A bot-created account's password is a random, thrown-away value (see
`createAccountFromBot`) — the reporter never knows it, so the website's
normal email+password login doesn't work for them. Rather than a custom
token this app would have to secure itself, `generateBotLoginLink()` in
`bot-common.ts` calls Supabase's own `admin.auth.admin.generateLink({ type:
'magiclink' })`, which Supabase owns the expiry/single-use semantics for,
with `redirectTo` pointed at `/auth/callback?next=<path>` (that route's
`explicitNext` param already existed and bypasses the onboarding-redirect
check entirely, so a bot-created account's `onboarding_completed: false`
never gets in the way).

- Sent automatically, inline, right after account creation (`accountCreated`
  message — now takes `(username, link)` instead of a plain-text URL
  mention).
- Also available on demand, any time, regardless of session step: typing
  `/payouts` or `/profile` (handled near the top of the webhook POST
  handler, before the step state machine) mints a **fresh** link each time.
  This is the deliberate answer to "what if the link expires" — there's no
  password-reset fallback path for these accounts, so expiry is handled by
  making regeneration trivial and always available instead of making the
  link long-lived.
- `/profile` redirects to `/settings` (the actual hub page with Payouts/
  Earnings/Social/Licensing links) — named `/profile` in the bot for a more
  natural word, not because it points at `src/app/profile/page.tsx`.
- If Supabase's redirect-URL allow-list doesn't already include
  `https://www.vozit.net/auth/callback` (other login paths already use it,
  so it likely does), `generateLink` returns an error and the bot falls
  back to a plain-text `vozit.net/payouts` mention rather than failing the
  whole message — check the Supabase Auth dashboard's URL Configuration if
  reporters report the link not working.

#### Translating the website pages a bot reporter gets sent to
A reporter may have done their entire account setup in Telegram in a
language other than English and never otherwise see an English screen —
but `/payouts` and `/settings` are real website pages with no multi-
language UI of their own. `useUITranslation(pageKey, defaultStrings)`
(`src/hooks/useUITranslation.ts`) renders the English defaults immediately,
then swaps in a Claude translation (keyed off the account's
`telegram_language`) once `/api/translate-ui` resolves — falls back to
English permanently if that call fails. `translateUIStrings()` in
`translate.ts` does the actual Claude call (same JSON-in/JSON-out pattern
as `translateReportContent`); results are cached in `ui_translation_cache`
(`page_key, lang` → `translated jsonb`, keyed by a hash of the English
source so an edit to the English copy automatically invalidates the cache
with no manual step) so repeat visits don't re-call Claude.

- Only the static instructional copy (headings, labels, buttons, help text)
  is translated — not dynamic data. Country names (`/payouts`' `COUNTRIES`
  list), provider brand names/descriptions, and tier names (Starter/Silver/
  Gold/Platinum) are deliberately left untranslated: they're proper nouns,
  or in the tier names' case, the same branded labels shown everywhere else
  in the app.
- Currently wired up on `/payouts` and `/settings` only (the two pages the
  bot's magic links point at). `/profile` (the separate read-only stats
  screen under the bottom nav's "More" tab) is not yet translated — same
  hook would apply if that's wanted later.
- Migration: `supabase_migration_ui_translation_cache.sql`. Already applied
  directly to the live DB.

### Assignment System
- Ongoing assignments with fees for conflict zones and breaking news
- Example assignments: Ukraine ($2,400), Sudan ($3,000), Venezuela ($1,200), Pacific ($800), Myanmar ($1,800)
- Urgency levels: Critical (red), High (orange), Ongoing (tan)

### Licensing Page
- URL paste bar for media organizations to look up specific reports
- Report preview card with "License this report" and "Get embed code" buttons
- "Most popular" badge on Digital tier
- Media organization CTA for wire service accounts

### Legal / Compliance Pages (`/policies` hub)
Terms of Service (`/terms`), Privacy Policy (`/privacy`), Correction & Moderation
Policy (`/policies/moderation`), Cookie Policy (`/policies/cookies`), DMCA &
Copyright Takedown Policy (`/policies/dmca`), Media Licensing Agreement
(`/policies/licensing-agreement`), Reporter & Contributor Agreement
(`/policies/contributor-agreement`), Refund Policy (`/policies/refunds`),
Accessibility (`/policies/accessibility`), Law Enforcement Guidelines
(`/policies/law-enforcement`), Reporter Safety (`/policies/safety`), and
Sanctions & Compliance (`/policies/ofac`) are all linked from the `/policies`
index page (footer link: "Terms and Policies"). More get added to that same
index as they're written, rather than each one needing its own separate
footer link.

- **The 8 pages added 2026-11-21 came from a pasted build spec, and two of
  its numbers were wrong — checked against the live code before writing
  anything, not trusted as-is.** The spec claimed reporter revenue-share
  tiers of Starter 50%/Silver 55%/Gold 65%/Platinum 70% — the real, live
  numbers (`REVENUE_SHARE` in `src/lib/payouts.ts`, matching the existing
  Terms of Service and Settings page) are **40%/45%/50%/55%**. Used the real
  numbers throughout. The spec's licensing-tier *prices* did check out
  exactly against `LICENSE_TIERS` in `src/app/api/licensing/route.ts` — those
  were trusted since they were verified, not just copied.
- **Real mechanic worth knowing, not obvious from either the spec or the
  Terms of Service**: for licensing fees specifically, VozIt takes 30% off
  the top as a flat platform fee *before* the reporter's tier percentage
  applies to the remaining 70% (`calculateReporterShare(price * 0.70,
  tier)`) — so a Starter reporter's real share of a licensing sale is 28% of
  the gross price, not 40%. The Reporter & Contributor Agreement states this
  mechanic plainly. This 30%-off-top rule is confirmed specific to
  *licensing* revenue — ad revenue and assignment fees have no equivalent
  split logic in the code, so those are described more generally ("a share
  … at the rate tied to your tier"), matching the existing Terms of
  Service's own wording, rather than asserting an unverified formula.
- **Refund Policy and the Reporter & Contributor Agreement's indemnification/
  removal sections describe real behavior, not spec-invented promises.**
  Checked directly: there is no refund/cancellation code path at all for
  unfulfilled assignment funding (`src/app/api/assignments/` has none), so
  the Refund Policy says that's handled case-by-case for now rather than
  inventing an automatic process or a specific percentage (the spec
  suggested "full refund minus a 5% processing fee" — not implemented
  anywhere, not stated as policy).
- **Submission channels named only include what's actually live**: website
  and the Telegram bot. The spec's contributor-agreement draft asked to
  cover "mobile app and WhatsApp" too — neither exists yet (see the mobile
  app and WhatsApp items in memory), so the page is worded to cover
  "any other submission channel VozIt adds in the future" instead of
  asserting channels that don't exist.
- **Media Licensing Agreement's "Governing law" section is intentionally
  left as an unresolved placeholder**, not a guessed state — VozIt isn't
  incorporated yet, so there's no real jurisdiction to name truthfully. Fill
  this in once incorporation happens, not before.
- **DMCA takedown notices currently go to `vozitnews@gmail.com`**, same as
  every other policy page — the page itself notes Jerry should still
  register an official DMCA agent at copyright.gov ($6 fee) for full Section
  512 safe-harbor protection; that's a real action only he can take, not
  something this build could do for him.
- All contact points across every policy page use the one real working
  inbox (`vozitnews@gmail.com`) rather than inventing addresses like
  `legal@vozit.com` or `licensing@vozit.com` that don't exist and would
  bounce.
- **Privacy Policy explicitly names every processor** that touches user data —
  Supabase, Mux, Stripe, Hive, **Anthropic/Claude** (5W analysis + translation;
  states it isn't used to train models, per Anthropic's own API terms),
  Resend, Google/AdSense, and Telegram (for bot-submitted reports). Don't add
  a new third-party service to the codebase without adding it here too.
- **Cookie Policy accurately reflects that the AdSense script in
  `layout.tsx` loads site-wide today** (for site-ownership verification)
  even though no ad has actually shown yet — Google may set cookies from
  that script regardless. Update this page the moment real ads go live, not
  after.
- **`CookieNotice` component** (`src/components/CookieNotice.tsx`, mounted
  globally in `layout.tsx`) is a disclosure banner, not a consent gate —
  VozIt's login cookie is required for the site to function, so there's
  nothing to actually let someone opt out of yet. Dismissal state is a
  `localStorage` flag, nothing server-side.
- **Signup now requires clickwrap consent, enforced server-side, not just
  the checkbox on the page.** `/auth/register`'s email/password path sends
  `terms_accepted: true`; `/api/auth/register` rejects the request with a
  400 if that's not literally `true`, and records `users.terms_accepted_at`
  (migration: `supabase_migration_terms_accepted_at.sql`) — a browsewrap
  footer link alone is weaker evidence of agreement than an explicit,
  timestamped checkbox click. **Known gap**: the OAuth (Google/Facebook)
  signup buttons on that same page only check the checkbox client-side
  before firing `signInWithOAuth()` — there's no equivalent server-side
  timestamp recorded for that path yet, since OAuth redirects away before
  any VozIt API call happens. Closing that gap would mean recording consent
  during `/auth/profile-setup` (the first-run flow OAuth users land on)
  instead — not done yet.
- **No generic "Refund Policy" page** — VozIt has no end-user subscription
  to refund. Payments are one-time: licensing fees (paid by buyers) and
  assignment funding. Terms of Service has a short "Payments and fees"
  section instead. **Real known gap, not a documentation problem**: there is
  no refund/cancellation code path at all for unfulfilled assignment
  funding (checked directly — `src/app/api/assignments/` has no
  refund/expire/cancel logic). The ToS section says "contact us" for this
  deliberately, rather than describing an automated process that doesn't
  exist yet.
- **Not done, and explicitly blocked**: a "real business details" disclosure
  (registered legal entity name/address) can't be truthfully published
  since VozIt isn't incorporated yet — see the incorporation item in
  memory. Can't be worked around with a web page.
- **Not done, needs a real audit pass, not a document**: color contrast and
  keyboard navigation across the site weren't verified as part of this
  pass — spot-checked image alt text looked fine but wasn't exhaustively
  verified per-tag.

### Technical Compliance Features (2026-11-21)
A follow-up pasted spec asked for the actual mechanisms behind several of
the legal pages above — a real consent-gating cookie banner, enforced
signup consent, account deletion, and a first-upload Contributor Agreement
acceptance. Built with the same "verify against the live code first" bar as
everything else in this file; several parts of the spec were adjusted or
explicitly skipped rather than followed as written — documented below so
the deviations aren't mistaken for oversights.

- **`CookieConsent.tsx`** (`src/components/CookieConsent.tsx`) replaces the
  earlier `CookieNotice` disclosure-only banner (deleted) with a real
  Accept-all/Essential-only gate, writing a `vozit_consent` cookie
  (1-year). **`GoogleAdsenseLoader.tsx`** only injects the AdSense script
  tag after `vozit_consent=all` (checked on mount, and live via a
  `vozit-consent-changed` window event fired the moment someone clicks
  Accept all — no page reload needed).
- **The original unconditional AdSense `<script>` tag in `layout.tsx`'s
  `<head>` was deliberately left untouched**, not moved behind the new
  consent gate — it exists specifically for Google's site-ownership
  verification crawl (see its own inline comment), and that crawler never
  clicks a consent banner. Gating it would likely have broken the AdSense
  verification Jerry already has in progress. The new consent-gated loader
  is what will govern real AdSense *ad units* once those actually get
  added — none exist in the codebase yet (VozIt's only live ad mechanism
  today is the separate VAST-tag mid-roll system, inert until
  `AD_NETWORK_VAST_URL` is set).
- **EU/EEA/UK default framing**: `middleware.ts` now sets a `vozit_region`
  cookie once per visitor from Vercel's own `x-vercel-ip-country` header
  (no DB call, no timezone-guessing). `CookieConsent` uses it only to
  reorder which button reads first (Essential-only first for EU/EEA/UK) —
  the actual technical gating (nothing non-essential loads before an
  explicit click) already applies to every visitor regardless of region,
  so there's no separate "blocked until consent" code path to get wrong.
- **Signup consent reuses the existing `terms_accepted_at` column and
  enforcement** (`/api/auth/register`, built in the previous pass) rather
  than adding a second `consent_given_at` column the spec asked for, which
  would have been a duplicate of the same fact. Checkbox wording/links
  updated to reference the Contributor Agreement specifically (not Cookie
  Policy, which has its own separate mechanism now via `CookieConsent`),
  plus an explicit "confirm you're at least 13" line.
- **Account deletion** — new `/api/account/delete` route, new Settings-page
  confirmation modal requiring the real username typed back (checked
  server-side against the DB, not just trusted from the client). Soft-
  delete only: sets `users.is_deleted`/`deleted_at`/`deletion_scheduled_at`
  (30 days out) and bans the Supabase Auth account directly
  (`admin.auth.admin.updateUserById` with `ban_duration`) so login is
  actually blocked during the grace window, without touching the row or
  their published reports. **No automated purge job exists** to act on
  `deletion_scheduled_at` once it passes — deliberately not built alongside
  this route; permanently destroying user data on a timer deserves its own
  careful, separately-reviewed pass, not something bundled in quietly here.
- **First-upload Contributor Agreement modal** — `src/app/upload/page.tsx`
  now pulls the authed user via `useAuth()` (it didn't before) specifically
  to check `contributor_agreement_accepted_at`; the Publish button routes
  through `handlePublishClick()`, which shows the modal only when that
  timestamp is null, records it on acceptance (same pattern as the
  payouts page's own self-row updates), then calls the real
  `submitReport()`. Every submission after the first skips straight
  through.
- **Telegram bot**: `createAccountFromBot` now sets both
  `terms_accepted_at` and `contributor_agreement_accepted_at` at account
  creation time, rather than building a new interactive certification
  step into the chat state machine. This is a deliberate simplification,
  not a 1:1 match for the spec's ask — the bot's existing welcome message
  (genuine footage, 61-90s, 5W format) is treated as the equivalent moment
  to the website's checkbox/modal, same way account creation already
  implies agreement to use the service at all.
- **Privacy Policy was NOT updated to add WhatsApp** as the spec asked —
  Jerry explicitly said (2026-11-21, in the same session this spec arrived)
  to wait and add WhatsApp/mobile-app mentions only once those channels
  actually exist. Tracked in memory against both the WhatsApp and mobile-
  app items so it surfaces when either ships, rather than being added now
  and describing a channel that doesn't exist yet.
- **Footer links only added to the homepage** (`LandingClient.tsx`) — now
  includes Terms/Privacy/Cookies/DMCA/Safety/All Policies. The spec asked
  for this "across all pages," but no other page in the app has a footer
  at all — they use the bottom mobile nav bar (`Nav` in `src/lib/ui.tsx`)
  instead. Retrofitting a desktop-style footer onto every mobile-nav page
  would be a real layout change, not a quick link addition — not done
  without that being scoped deliberately first.

### Multi-Language Policy Pages (2026-11-21)
Terms of Service, Privacy Policy, and the Reporter & Contributor Agreement
are now each available in 6 languages (English, Español, العربية, Français,
Українська, Português), driven by a shared data/renderer pair rather than
6 separate hand-written pages per document:

- **`src/lib/translations/policies/types.ts`** defines the shared
  `PolicyContent` shape (title, intro, sections with paragraphs/list/
  table). **`src/lib/translations/policies/{terms,privacy,contributor}/
  {en,es,ar,fr,uk,pt}.ts`** hold the actual content — 18 files. The `en.ts`
  file in each folder is the authoritative source, reformatted from (not
  rewritten from) the already-live English pages, so it matches exactly
  what was already reviewed. The other 5 are real, complete translations
  (done directly, not machine-generated placeholders) of that same content,
  each tagged with an `aiTranslatedLabel` ("AI-translated — last reviewed:
  November 2026") and a `viewInEnglishLabel`/`viewInEnglishLinkText` pair
  for the disclaimer banner.
- **`src/components/PolicyPage.tsx`** is the shared client-side renderer —
  reads/writes the selected language via `src/components/
  LanguageSelector.tsx` (localStorage key `vozit_policy_lang`), shows the
  "this is a translation, the English version controls" disclaimer banner
  whenever a non-English language is active, sets `dir="rtl"` for Arabic,
  and renders sections generically (including the Contributor Agreement's
  tier-percentage table). `src/app/terms/page.tsx`, `src/app/privacy/
  page.tsx`, and `src/app/policies/contributor-agreement/page.tsx` are now
  thin server components that just import their 6 language files and pass
  them to `<PolicyPage>` — this is also where the new "Governing language"
  clause (English controls over any translation) lives in the Terms of
  Service.
- **Scope deliberately limited to 6 languages / these 3 documents, not
  all 10 or all 12 policy pages.** The bot supports 10 languages
  (the original 6 here plus Kiswahili, Русский, Bahasa Indonesia, فارسی,
  added in an earlier pass) — this system doesn't cover those 4 yet, so a
  Swahili/Russian/Indonesian/Farsi-speaking visitor still sees English
  legal pages. Flagged to Jerry as a natural follow-up, not silently
  expanded to 10 without being asked, and not silently narrowed either —
  it matches exactly what this spec scoped. The other 9 policy pages
  (moderation, cookies, DMCA, licensing-agreement, refunds, accessibility,
  law-enforcement, safety, ofac) were NOT retrofitted with language
  selectors or given empty placeholder translation files — creating dozens
  of empty stub files added for a "structure" no content exists for yet
  would be clutter, not infrastructure. The same `PolicyContent`/
  `PolicyPage` pattern applies cleanly to any of them whenever real
  translations are wanted.
- **Some fidelity was deliberately traded for simplicity**: the original
  English pages had inline links and bold emphasis mid-paragraph (e.g.
  linking to the Privacy Policy from inside a Terms paragraph); the
  structured translation data model represents paragraphs as plain text
  (or a bold label + plain text for definition-style paragraphs), so those
  inline cross-links don't carry over into the generic renderer. Contact
  email and the top-of-page "back to Terms and Policies" link still work
  normally; only mid-paragraph inline links were affected.

### SEO / Crawlability / AdSense Review (2026-11-21)
A pasted spec, prompted by a recurring Google AdSense "Site down or
unavailable" rejection, assumed the root cause was client-only rendering
("'use client' pages render an empty shell"). That diagnosis was already
largely wrong by the time this arrived — checked directly before building
anything:

- **Homepage, feed, assignments, and licensing's search-param bailout had
  already been fixed for this exact reason in an earlier session** (their
  own code comments say so explicitly, and were re-verified directly this
  pass). Rewriting them again per the spec would have been redundant, not
  a fix.
- **The real, confirmed cause: `middleware.ts`'s `PUBLIC` allowlist never
  included `/policies`, `/report`, `/reporter`, or `/submit-telegram`.**
  Verified live against production before fixing anything —
  `curl https://www.vozit.net/policies` as an anonymous request returned
  `307 → /auth/login`, same for `/submit-telegram`, while an already-listed
  path like `/feed` returned a clean `200`. That means every one of the 12
  legal pages built in the previous two passes, every published report
  page, every reporter profile, and the Telegram-bot info page were
  invisible to Googlebot/AdSense's crawler (and any logged-out visitor) —
  a far more direct explanation for "Site down or unavailable" than any
  SSR concern, since a redirect-to-login instead of real content is
  exactly what that rejection reason describes. Fixed by adding those four
  path prefixes to `PUBLIC`.
- **robots.txt and ads.txt already existed correctly** (confirmed by
  reading them, not assumed from the spec's claim they needed creating) —
  only added the `Sitemap:` line to the existing file rather than
  overwriting it with the spec's version, which would have silently
  dropped the existing `/settings`/`/payouts`/`/earnings` disallow rules.
- **New `src/app/sitemap.ts`** (didn't exist before) — static pages
  (including all 12 real `/policies/*` pages, not a partial list) plus
  every published report and non-banned reporter profile, queried
  directly rather than hardcoded. Capped at Google/Next.js's 50,000-URL
  single-sitemap limit for now; flagged in-file for whenever that needs
  splitting via `generateSitemaps()`.
- **New `/api/health`** — trivial `{status:'ok', timestamp}` endpoint, as
  asked.
- **AdSense script converted to `next/script` with `strategy=
  "afterInteractive"`**, client ID moved to `NEXT_PUBLIC_ADSENSE_ID` (falls
  back to the known-good hardcoded value if unset, so nothing breaks if
  Jerry hasn't set it in Vercel yet) — also added the
  `<meta name="google-adsense-account">` tag, Google's own documented
  site-ownership-verification method, as a second, more crawler-reliable
  signal alongside the script. The verification script itself stays
  unconsented/unconditional, same reasoning as the Cookie Policy pass:
  Google's verification crawler never clicks a consent banner.
- **`licensing/page.tsx` split into a thin server wrapper + new
  `LicensingClient.tsx`** (mechanical move, no logic changes) so the page
  could finally export real `metadata` — a `'use client'` file can't
  export metadata at all, which is why it was inheriting the generic root
  layout title before. Homepage, feed, and assignments got their own
  `metadata` exports the same way (they were already server components,
  so this was a straight addition); `reporter/[username]/page.tsx` got a
  new `generateMetadata`. `report/[id]/page.tsx` already had real dynamic
  OG metadata — confirmed, not touched.
- **Two spec items deliberately NOT done:**
  1. *"Use plain `<a href>` instead of `next/link` wherever ads show, to
     force full page reloads."* Skipped — this would degrade the entire
     app's navigation to full reloads for a problem VozIt doesn't actually
     have yet (no real AdSense ad units exist anywhere in the codebase,
     only the verification script; the standard, correct fix for ad
     refresh on client-side nav is re-triggering
     `(adsbygoogle=window.adsbygoogle||[]).push({})` on route change via
     `usePathname()`, not abandoning `next/link`).
  2. *A permanent `/api/debug/ssr-test` route that fetches vozit.net's own
     homepage and returns the raw HTML.* Skipped in favor of verifying
     directly via `curl` from this session instead (see above) — same
     result, without leaving a throwaway debug endpoint in the deployed
     app ("remove before production" per the spec's own words, so better
     not added at all).
- **`/submit-whatsapp`**, named in the spec's sitemap list, does not exist
  (WhatsApp intake isn't built — see the WhatsApp item in memory) and was
  not added to the sitemap; including a URL that 404s for every crawl
  would hurt more than help.

### AdSense review round 2 (2026-11-23) — "ads on screens without content" + ads.txt
A second pasted spec arrived after AdSense's dashboard showed two new
findings: **"Google-served ads on screens without publisher-content"** and
**"Ads.txt not found."** Same pattern as before — verified each claim
directly before building, since most of the spec duplicated work already
done:

- **ads.txt and robots.txt were already correct** — confirmed via a live
  `curl https://www.vozit.net/ads.txt` (200, exact expected content,
  `google.com, pub-1085926458838222, DIRECT, f08c47fec0942fa0`) and reading
  robots.txt directly (no `_next/static` block, already permissive). The
  dashboard's "Not found" status is read as stale/pre-fix, same conclusion
  as the earlier AdSense pass.
- **Homepage/feed SSR, policy pages as server components — already done**
  (see the entry above this one); the spec's items 2a-2d and 6 were
  redundant, not re-built.
- **The real, new issue: `layout.tsx` loaded the AdSense script
  unconditionally on every single route**, including thin, mostly-chrome
  pages (`/auth/*`, `/upload`'s camera screen, `/settings` + its
  sub-pages, `/payouts`, `/earnings`, `/profile`, `/tasks`,
  `/admin/moderation`, and the `/embed/[id]` third-party widget) — exactly
  what "ads on screens without publisher-content" describes. Fixed:
  - **`src/lib/ads.ts`** — `shouldLoadAds(pathname)`, an **allowlist** of
    real-content route prefixes (`/`, `/feed`, `/assignments`,
    `/licensing`, `/search`, `/report/`, `/reporter/`, `/policies`,
    `/terms`, `/privacy`, `/contact`, `/submit-telegram`). Allowlist, not
    denylist, deliberately — a future page that forgets to opt in just
    doesn't show ads yet, rather than a future thin page silently getting
    them.
  - **`src/components/AdSenseScript.tsx`** (new, `'use client'`) — reads
    the real pathname via `usePathname()` and only renders the
    `adsbygoogle.js` `<Script>` tag when `shouldLoadAds()` says yes.
    Replaces the inline unconditional `<Script>` that used to sit directly
    in `layout.tsx`.
  - **The `<meta name="google-adsense-account">` site-ownership
    verification tag stays unconditional** in `layout.tsx`'s `<head>`,
    unaffected by this change — it's a separate, already-confirmed-working
    signal, not the ad-serving script itself, so narrowing where the
    script loads doesn't touch site-ownership verification.
- **Homepage content expanded** (`LandingClient.tsx`) — the existing About
  section was real but thin (~75 words); added two full paragraphs to it,
  plus three new prose sections: **"How reporters earn"** (the tier system,
  40-55% revenue share, 8 payout providers/200+ countries, OFAC
  screening), **"For media organizations"** (the real licensing tiers from
  `LicensingClient.tsx` — Editorial/Digital/Broadcast/Wire Service — with a
  link to `/licensing`), and a **5-question FAQ**. All real, accurate copy
  grounded in the actual tier percentages/payout facts already elsewhere
  in this codebase, not invented numbers.
- **One spec item deliberately NOT done**: *HTML comments like
  `<!-- SSR: landing -->` on every page to verify server rendering in View
  Source.* Skipped — verified server rendering directly via `curl` instead
  (same approach as the previous AdSense pass), without leaving debug
  markers in shipped markup.

### Exclusive licensing actually means exclusive (2026-11-23)
Jerry asked to verify the licensing flow end-to-end and found two real gaps:
an "exclusive" purchase only blocked a second *exclusive* bid, never a plain
non-exclusive one on the same report — and the block itself never expired
(a long-lapsed exclusive license permanently blocked all future exclusive
requests). Researched real stock/broadcast footage license agreements
(Axiom Images, Buyout Footage, Pond5, plus Getty v. Stability AI commentary
on exclusivity) before building, since there's no single published
"industry standard" number for an exclusive window's length — it's
genuinely decided per contract. Built:

- **`EXCLUSIVE_WINDOW_HOURS`** in `src/app/api/licensing/route.ts` — only
  four specific (tier, license_type) combos can carry exclusivity at all
  (Broadcast/Wire `exclusive`=24h, Broadcast/Wire `breaking_exclusive`
  =48h, Jerry's own call after discussing the tradeoff — not a researched
  standard; see the follow-up update below, these labels/prices got
  corrected). A $75 social clip or free editorial embed can never claim
  exclusivity.
- **`licenses.exclusive_hours`/`exclusive_until`** (new columns) —
  `exclusive_hours` is decided at request time; `exclusive_until` is only
  set once Stripe payment actually clears (in the webhook), never at
  checkout-start, so an abandoned checkout never takes anything offline.
- **`reports.exclusive_hold_until`** (new column) — while an exclusive
  window is active, the report is pulled from every public read path:
  homepage, feed, `/api/reports` (search), the sitemap, the reporter's own
  profile list, the direct `/report/[id]` page (replaced with a plain
  "exclusively licensed" placeholder, OG/social-preview metadata included),
  and `/embed/[id]`. Otherwise a buyer paying a premium for "exclusive"
  would be undercut by the same footage sitting free, with VozIt's own ads,
  on vozit.net itself. `src/lib/exclusive-hold.ts` holds the one filter
  (`excludeExclusiveHoldFilter()`) every list query uses and the one check
  (`isExclusivelyHeld()`) every single-report page uses — no cron job, the
  hold lifts itself the instant the timestamp passes.
- **The block itself now covers any new license request, not just a
  competing exclusive one**, and is time-bound against `exclusive_until`
  (fixing the "blocks forever" bug) rather than against the full
  `expires_at`.
- **Exclusivity is a separate axis from sub-licensing/resale, confirmed
  against real license agreements, not assumed** — Broadcast/Digital
  exclusivity still can't sublicense or resell; Wire Service's exclusivity
  still can redistribute to its own subscriber network, because that right
  came from the Wire tier's own `rights` array, not from being exclusive.
  An exclusive wire deal means VozIt sold it to exactly one wire service,
  not that only one end viewer ever sees it.

**Follow-up same day — Jerry spotted a real pricing inconsistency and asked
two questions that led to scoping how exclusivity blocks other sales:**
- **Broadcast's two exclusive prices were backwards.** `breaking_exclusive`
  (48h, the longer window) was priced at $7,500 — *below* `exclusive_24h`
  (24h, the shorter window) at $10,000, meaning the cheaper option got more
  exclusive time. Fixed by swapping the prices (24h exclusive = $7,500, 48h
  breaking exclusive = $10,000) rather than swapping the hours — matches
  Wire's tier, which was already ordered correctly ($10,000/24h, $15,000/
  48h).
- **Renamed Broadcast's `exclusive_24h` → `exclusive`** to match Wire's
  naming exactly — both tiers now use the identical two keys
  (`exclusive`/`breaking_exclusive`), and the frontend's auto-generated
  label (`key.replace(/_/g,' ')`) now shows "exclusive"/"breaking
  exclusive" identically on both tiers with no separate label map needed.
  Confirmed via research this isn't real, citable broadcast/wire jargon —
  VozIt's own product naming, free to make consistent.
- **Exclusivity blocking is now scoped by tier, not blanket** —
  `exclusiveBlocksTier()` in `src/lib/exclusive-hold.ts`: a Wire exclusive
  blocks every other tier (wire already reaches the full subscriber
  market, no scarcity left for anyone else); a Broadcast exclusive only
  blocks Broadcast and Digital (direct-to-public/broadcast use) — it does
  NOT block a Wire license on the same report, since a single broadcaster
  isn't paying enough to control an entirely different, much larger
  distribution channel. This means **more than one exclusive hold can be
  active on the same report at once** (e.g. a Wire exclusive sold during
  an already-active Broadcast exclusive's window) — `/api/licensing`'s GET
  now returns `activeExclusiveHolds: {tier, until}[]`, not a single
  boolean, and the Stripe webhook sets `reports.exclusive_hold_until` to
  the *latest* of any concurrently active holds, never shortening it.
- **`/policies/licensing-agreement`** (English-only, no translations —
  confirmed before editing, same as the other 9 non-translated policy
  pages) had stale hardcoded prose describing the old 24h/24h Broadcast
  split and no explanation of what "exclusive" concretely does. Updated
  the tier prices/wording and added a new "Exclusive licenses" section
  spelling out the real mechanics (full removal from public view, not
  just ad-free; the scoped Broadcast-doesn't-block-Wire rule) — a buyer
  paying a premium for this should have it in writing, not just enforced
  silently in code.

## 7. DESIGN SYSTEM

### CSS Custom Properties (src/app/globals.css)
- --orange, --orange-dark, --blue, --deep-blue
- --text-primary, --text-secondary, --text-muted
- --bg-page, --bg-card, --bg-hover
- --radius (12px), --radius-lg (14px)

### Button Classes
- .btn — base (transition, cursor, border-radius)
- .btn-primary — orange bg, white text, hover darkens
- .btn-sm — smaller padding
- .btn-outline — white bg, orange text, border
- .btn-connect — for social/payout connect buttons
- All buttons have :hover and :active (scale 0.97) states

### Input States
- Focus: blue border + blue box-shadow ring
- Border styles in CSS (not inline) so :focus actually fires

### Card Class
- .card — 12px radius, 16px padding, 10px margin-bottom
- .card-lg — 24px padding

### Typography Scale
- 11px (xs), 13px (sm), 15px (base), 20px (lg), 28px (xl)

### Accessibility Fixes Applied
- White on orange: darkened to #D63006 (4.6:1 contrast ratio)
- Secondary text: changed from #888 to #666 (5.7:1)
- Header gradient: starts at #70b8e0 (not bone) for white text readability
- Touch targets: 44x44px minimum on nav items and vote arrows
- aria-labels on nav buttons

## 8. PAGE STRUCTURE

### Landing Page (/) — Two-column layout
- Header: VozIt logo + title → Sign In + New Account buttons
- Speech bubble: Orange "I was there..." with tail
- Sticky nav tabs: Home, Feed, Contribute, Assignments, Licensing, About
- Left column: Reports by region (Americas, Europe, Middle East, Africa, Asia)
- Right sidebar: Search, How It Works, Reporter Tiers, Featured Assignments, Get the App, Social icons
- About section
- Footer

### Feed (/feed) — Mobile app-style
- Top gradient header with logo
- Reports tab bar
- Region-grouped report cards with thumbnails, vote counts, credibility, tier badges
- Bottom nav bar with camera button

### All Pages
/ (landing), /feed, /upload, /assignments, /search, /settings, /earnings, /payouts, /settings/social, /licensing, /auth/login, /auth/register, /auth/profile-setup, /auth/verify

- All pages have a <Top/> gradient header (except Upload and Auth pages)
- Consistent design tokens
- Sub-pages have "← Settings" back navigation

## 9. API ROUTES (19 endpoints)
auth, reports, reports/upload-url, reports/voice-over, votes, assignments, assignments/image, payouts, licensing, social, ai-analyze, share, mux-webhook, stripe, tasks, admin/moderation, og

## 10. HOW TO DEPLOY
Edit files → `git add -A && git commit -m "description" && git push` → Vercel auto-deploys in ~30 seconds.
(Jerry uses GitHub Desktop, not the command line, for this step.)

## 11. KNOWN ISSUES / PENDING WORK

### Not Yet Built
- [ ] Mobile apps (React Native/Expo)
- [x] Background worker for FFmpeg watermark processing — code complete in
      /watermark-worker (Fly.io), but needs to actually be deployed +
      WATERMARK_WORKER_URL/SECRET set in Vercel before it does anything;
      also needs a public Supabase Storage bucket named `videos` created
- [ ] Post-recording voice-over server-side audio merge
- [ ] Appeals process for banned reporters
- [ ] Supabase Storage buckets (uploads public, voice-overs private, plus
      `videos` for the watermark worker's output — none of these confirmed
      to actually exist yet; the voice-over upload route has been assuming
      an `uploads` bucket exists this whole time with no confirmation)
- [ ] Custom domain (vozit.com or similar)
- [ ] Notification system (reporters aren't told when a report publishes,
      gets flagged, or a license sells) and a site-wide toast/success
      message system — deliberately deferred, not forgotten

### API Keys Still Needed
- Mux, Stripe, Anthropic, Turnstile, Hive (see env vars table above)

### Architecture Decisions Made
- Supabase credentials hardcoded (not env vars) due to Vercel MCP tool limitations
- Middleware kept lightweight (~3KB) — a 243KB version caused 504 gateway timeouts
- Login/register go through API routes (not direct Supabase calls) for security
- Feed queries real Supabase data (Claude Code fixed this — was hardcoded sample data)
- Bearer token auth added for mobile app API access

## 12. OWNER NOTES
- Jerry (jerry.godwin@gmail.com) is NOT a software developer
- All technical explanations should be in plain language
- Jerry uses GitHub Desktop (not command line git)
- Jerry uses VS Code with Claude Code extension for development
- Design reviews and architecture planning happen in Claude Opus chat
- Code building and pushing happens in Claude Code
