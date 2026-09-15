# VozIt! — Project Briefing for Claude Code

## What This Is
VozIt! is a citizen journalism platform with TWO products that share the same backend:
1. **Website** (this codebase) — Next.js 14, deployed on Vercel
2. **Mobile apps** (iOS + Android) — planned React Native/Expo build, NOT yet started

Both the website and mobile apps connect to the same Supabase database and use the same API routes. The website is the priority right now. Mobile apps come after the website is fully functional.

## Architecture
- **Frontend:** Next.js 14 (this repo)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Hosting:** Vercel (auto-deploys from GitHub on push to main)
- **Video:** Mux (processing, streaming, thumbnails)
- **Payments:** Stripe (subscriptions, licensing purchases)
- **AI:** Anthropic Claude API (5W analysis of reports)
- **Moderation:** Hive AI (content scanning)
- **CAPTCHA:** Cloudflare Turnstile

## Live URLs
- **Production:** https://vozit-app-v2-voz-it.vercel.app
- **Supabase:** https://mfanqkbhegxppyitxtye.supabase.co
- **GitHub:** https://github.com/jerrygodwin-glitch/vozit-app

## Revenue Model — Reporter Tiers
| Tier | Revenue Share | Requirements |
|------|--------------|--------------|
| Starter | 50% | 0-25 reports |
| Silver | 55% | 26-100 reports, 80%+ credibility |
| Gold | 65% | 101-499 reports, 90%+ credibility |
| Platinum | 70% | 500+ reports, 95%+ credibility |

## 8 Payout Providers (all with OFAC sanctions screening)
1. Stripe — bank transfer, 46+ countries
2. PayPal — 200+ countries
3. Wise — low-fee, real FX rate, 80+ countries
4. Payoneer — bank or prepaid card, 200+ countries
5. Flutterwave — M-Pesa, MTN, Airtel (Africa)
6. Chipper Cash — 7 African countries
7. WorldRemit — bank, mobile money, cash pickup, 130+ countries
8. Crypto (USDC) — any wallet, anywhere

## Licensing Fees (paid by media organizations)
- **Embed:** Free editorial / $6 CPM commercial (1yr)
- **Digital:** $75 clip / $150 standard / $250 breaking (30d)
- **Broadcast:** $500 local / $2,500 national / $3,500 documentary / $7,500 breaking excl. / $10,000 24h excl. (90d)
- **Wire Service:** $3,000 standard / $10,000 exclusive / $15,000 breaking (30d)

## Key Features
- **Camera Recorder:** 90-second guided recording with 5W teleprompter (Who, What, Where, When, Why) + "I was there" sign-off
- **Voice-Over Recorder:** Post-recording narration for silent footage
- **AI 5W Analysis:** Claude API analyzes each report for completeness
- **Content Moderation:** Hive AI scans for prohibited content
- **Watermarking:** VozIt! branding overlay on all published videos
- **C2PA Provenance:** Content authenticity chain
- **Social Distribution:** Auto-post to YouTube, TikTok, Instagram, Facebook, X
- **Assignment System:** Bounty-based missions for conflict zones and breaking news

## Brand Identity
- **Name:** VozIt!
- **Tagline:** "I was there..."
- **Colors:** Orange #FE3D07, Dark Orange #D63006, Blue #0a8fe8, Deep Blue #0a3ff1, Bone #f0e8d8
- **Logo:** WebP base64 embedded in src/lib/ui.tsx (LOGO constant)

## Database (Supabase — 25 tables)
users, reports, votes, comments, earnings, payouts, assignments, assignment_reporters, ofac_screenings, moderation_scans, provenance, social_accounts, social_distributions, social_analytics, licenses, embed_views, ai_analyses, admin_audit_log, rate_limits, login_attempts, categories, regions, report_categories, report_regions, tasks

## Pages
/ (landing), /feed, /upload, /assignments, /search, /settings, /earnings, /payouts, /settings/social, /licensing, /auth/login, /auth/register, /auth/profile-setup, /auth/verify

## API Routes (19 endpoints)
auth, reports, reports/upload-url, reports/voice-over, votes, assignments, assignments/image, payouts, licensing, social, ai-analyze, share, mux-webhook, stripe, tasks, admin/moderation, og

## How to Deploy
Edit files → git add -A && git commit -m "description" && git push → Vercel auto-deploys in 30 seconds

## Important Notes
- Supabase credentials are HARDCODED (not env vars)
- Middleware must stay lightweight — a previous 243KB version caused 504 timeouts
- Jerry (the owner) is NOT a developer — explain everything in plain language
