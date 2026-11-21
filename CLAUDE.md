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
| TELEGRAM_BOT_TOKEN | @VozItBot intake bot (src/app/api/telegram/route.ts) — from @BotFather. Separate from VOZIT_TELEGRAM_BOT_TOKEN (the outbound VozItNewsBot) | Needs setup |
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

### Telegram Bot Intake (src/app/api/telegram/route.ts)
Lets reporters in conflict zones, on low bandwidth, or who otherwise can't
use the website/app submit a full report — video, description, location —
entirely through a chat with @VozItBot. This is the INBOUND/submission
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
