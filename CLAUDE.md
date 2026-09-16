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
| Starter | 50% | 0-25 reports |
| Silver | 55% | 26-100 reports, 80%+ credibility |
| Gold | 65% | 101-499 reports, 90%+ credibility |
| Platinum | 70% | 500+ reports, 95%+ credibility |

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
4. Bounties (from assignment completion)

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

### Database Schema (25 tables)
users, reports, votes, comments, earnings, payouts, assignments, assignment_reporters, ofac_screenings, moderation_scans, provenance, social_accounts, social_distributions, social_analytics, licenses, embed_views, ai_analyses, admin_audit_log, rate_limits, login_attempts, categories, regions, report_categories, report_regions, tasks

### Environment Variables Needed in Vercel Dashboard
| Variable | Service | Status |
|----------|---------|--------|
| MUX_TOKEN_ID | Mux video | Needs setup |
| MUX_TOKEN_SECRET | Mux video | Needs setup |
| MUX_WEBHOOK_SECRET | Mux video | Needs setup |
| STRIPE_SECRET_KEY | Stripe payments | Needs setup |
| STRIPE_WEBHOOK_SECRET | Stripe payments | Needs setup |
| ANTHROPIC_API_KEY | Claude AI 5W analysis | Needs setup |
| TURNSTILE_SECRET_KEY | Cloudflare CAPTCHA | Needs setup |
| HIVE_API_KEY | Content moderation | Needs setup |
| NEXT_PUBLIC_SENTRY_DSN | Error monitoring | Set by Claude Code |
| SUPABASE_SERVICE_ROLE_KEY | Admin operations | Needs setup |

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
- Auto-post to 5 platforms: YouTube, TikTok, Instagram, Facebook, X (Twitter)
- Each platform has its own monetization tracking
- Social accounts page with official logos via Google Favicon API

### Assignment System
- Bounty-based missions for conflict zones and breaking news
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

### All pages have:
- <Top/> gradient header (except Upload and Auth pages)
- Consistent design tokens
- Sub-pages have "← Settings" back navigation

## 9. KNOWN ISSUES / PENDING WORK

### Not Yet Built
- [ ] Mobile apps (React Native/Expo)
- [ ] Background worker for FFmpeg watermark processing
- [ ] Post-recording voice-over server-side audio merge
- [ ] Appeals process for banned reporters
- [ ] Supabase Storage buckets (uploads public, voice-overs private)
- [ ] Custom domain (vozit.com or similar)

### API Keys Still Needed
- Mux, Stripe, Anthropic, Turnstile, Hive (see env vars table above)

### Architecture Decisions Made
- Supabase credentials hardcoded (not env vars) due to Vercel MCP tool limitations
- Middleware kept lightweight (~3KB) — a 243KB version caused 504 gateway timeouts
- Login/register go through API routes (not direct Supabase calls) for security
- Feed queries real Supabase data (Claude Code fixed this — was hardcoded sample data)
- Bearer token auth added for mobile app API access

## 10. OWNER NOTES
- Jerry (jerry.godwin@gmail.com) is NOT a software developer
- All technical explanations should be in plain language
- Jerry uses GitHub Desktop (not command line git)
- Jerry uses VS Code with Claude Code extension for development
- Design reviews and architecture planning happen in Claude Opus chat
- Code building and pushing happens in Claude Code
