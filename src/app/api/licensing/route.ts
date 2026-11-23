// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { calculateReporterShare } from '@/lib/payouts'
import { captureError } from '@/lib/monitoring'
import type { ReporterTier } from '@/types'
import { exclusiveBlocksTier } from '@/lib/exclusive-hold'

// ── LICENSING TIERS ──────────────────────────────────────────────────
// What news organizations pay to use VozIt footage

export const LICENSE_TIERS = {
  // Tier 1: Embed only — iframe player on their site, VozIt branded
  embed: {
    name: 'Embed License',
    description: 'Embed the VozIt player on your site. VozIt branding shown. Free for editorial use, CPM-based for commercial.',
    pricing: {
      editorial: 0,           // Free for news editorial (drives traffic)
      commercial: 6.00,       // $6 CPM for commercial use (ads around it)
    },
    rights: ['embed_player', 'link_back'],
    duration_days: 365,
  },

  // Tier 2: Digital license — download video, use on own platforms
  digital: {
    name: 'Digital License',
    description: 'Download and use footage across your digital properties. Must credit VozIt + reporter.',
    pricing: {
      breaking: 250,          // Breaking news (first 24 hours)
      standard: 150,          // Standard digital use
      social_clip: 75,        // 15-second clip for social media
    },
    rights: ['download', 'digital_publish', 'social_post', 'credit_required'],
    duration_days: 30,
  },

  // Tier 3: Broadcast license — TV, streaming, documentary
  broadcast: {
    name: 'Broadcast License',
    description: 'Use footage in TV broadcasts, streaming shows, or documentaries.',
    pricing: {
      local_market: 500,      // Local/regional TV station
      national: 2500,         // National network (CNN, BBC, etc.) — raised from $1,500
      documentary: 3500,      // Documentary / long-form — raised from $2,500
      exclusive: 7500,        // 24h exclusive — the shorter, cheaper exclusive option
      breaking_exclusive: 10000, // 48h exclusive — longer window costs more, same ordering as Wire below (previously backwards: breaking_exclusive was priced BELOW the shorter 24h option)
    },
    rights: ['download', 'broadcast', 'streaming', 'archive', 'credit_required'],
    duration_days: 90,
  },

  // Tier 4: Wire service — redistributable to their subscribers
  wire: {
    name: 'Wire Service License',
    description: 'For AP, Reuters, AFP — redistribute to your subscriber network.',
    pricing: {
      standard: 3000,         // Standard wire distribution
      exclusive: 10000,       // Exclusive rights (24-48 hours)
      breaking_exclusive: 15000, // Breaking exclusive wire — NEW tier
    },
    rights: ['download', 'redistribute', 'sublicense_subscribers', 'credit_required'],
    duration_days: 30,
  },
}

type LicenseTier = keyof typeof LICENSE_TIERS

// Which (tier, license_type) combos can actually carry exclusivity, and how
// many hours that exclusive window lasts once payment clears — researched
// against real stock/broadcast-footage license agreements rather than
// guessed: exclusivity is sold as a short, separately-priced premium window
// for breaking news specifically (not the full usage-rights duration), and
// there's no single published industry number for the window length, so
// these are a deliberate choice, not a standard being quoted. A $75 social
// clip or a free editorial embed should never be able to claim exclusivity
// and take a report fully offline — only these four combos can. "Exclusive"
// and "breaking_exclusive" mean the same 24h/48h split on both tiers now —
// Broadcast used to call its 24h option "exclusive_24h" while Wire just
// called it "exclusive"; same product, now the same name on both.
const EXCLUSIVE_WINDOW_HOURS: Record<string, number> = {
  'broadcast:exclusive': 24,
  'broadcast:breaking_exclusive': 48,
  'wire:exclusive': 24,
  'wire:breaking_exclusive': 48,
}

// GET — browse available reports + pricing for licensees
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const reportId = url.searchParams.get('report_id')

    // Return pricing tiers
    if (!reportId) {
      return NextResponse.json({
        pricing: LICENSE_TIERS,
        note: 'All prices in USD. VozIt shares licensing revenue with the citizen reporter who captured the footage.',
        contact: 'vozitnews@gmail.com',
      })
    }

    // Return specific report licensing info
    const supabase = createServerClient()
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, title, playback_id, thumbnail_url, location_name, duration_seconds, created_at, status, user:users(username, tier)')
      .eq('id', reportId)
      .eq('status', 'published')
      .single()

    // A real query error (bad column, RLS misconfig, etc.) looks identical
    // to a legitimate "not found" to the caller unless logged separately —
    // this is exactly how a now-fixed column-name typo here went unnoticed
    // and silently broke every licensing search.
    if (reportError && reportError.code !== 'PGRST116') captureError(reportError, { route: 'GET /api/licensing', reportId })
    if (!report) {
      return NextResponse.json({ error: 'Report not found or not published' }, { status: 404 })
    }

    // Check if it's breaking news (< 24 hours old)
    const hoursOld = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60)
    const isBreaking = hoursOld < 24

    // Check existing licenses — via admin client, since the "Reporters see
    // own licenses" RLS policy means a licensee (not the reporter) reading
    // this on the user-scoped client would always see zero rows and this
    // exclusivity check would silently never trigger.
    const admin = createAdminClient()
    const { data: licenses } = await admin
      .from('licenses')
      .select('tier, license_type, licensee_org, exclusive, exclusive_until')
      .eq('report_id', reportId)
      .eq('status', 'active')

    // An active exclusive window blocks some or all new licenses on this
    // report, scoped by which tier bought exclusivity (exclusiveBlocksTier)
    // — a broadcast exclusive doesn't block a wire deal, a wire exclusive
    // blocks everything. More than one can be active at once (a wire
    // exclusive can be sold during an already-active broadcast exclusive's
    // window, since broadcast doesn't block wire), so this is a list, not a
    // single row. Checked against exclusive_until (the real, payment-
    // cleared clock), not the license's full expires_at.
    const now = new Date()
    const activeExclusiveHolds = (licenses || [])
      .filter(l => l.exclusive && l.exclusive_until && new Date(l.exclusive_until) > now)
      .map(l => ({ tier: l.tier, until: l.exclusive_until }))

    return NextResponse.json({
      report: {
        id: report.id,
        title: report.title,
        thumbnail: report.thumbnail_url,
        location: report.location_name,
        duration: report.duration_seconds,
        reporter: (report.user as any)?.username,
        isBreaking,
        hoursOld: Math.round(hoursOld),
        activeExclusiveHolds,
      },
      pricing: LICENSE_TIERS,
      existingLicenses: (licenses || []).length,
      embedCode: `<iframe src="${process.env.NEXT_PUBLIC_APP_URL || 'https://vozit.net'}/embed/${reportId}" width="640" height="400" frameborder="0" allowfullscreen></iframe>`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — request a license (creates a pending license for approval/payment)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { report_id, tier, license_type, licensee_org, licensee_email, licensee_name, exclusive } = body

    if (!report_id || !tier || !license_type || !licensee_email || !licensee_org) {
      return NextResponse.json({ error: 'Missing required fields: report_id, tier, license_type, licensee_org, licensee_email' }, { status: 400 })
    }

    const tierConfig = LICENSE_TIERS[tier as LicenseTier]
    if (!tierConfig) return NextResponse.json({ error: 'Invalid license tier' }, { status: 400 })

    const pricing = tierConfig.pricing as Record<string, number>
    const price = pricing[license_type]
    if (price === undefined) return NextResponse.json({ error: 'Invalid license type for this tier' }, { status: 400 })

    // Only specific, named license types can actually carry exclusivity —
    // a $75 social clip or a free editorial embed was never meant to take a
    // report fully offline.
    const exclusiveHours = EXCLUSIVE_WINDOW_HOURS[`${tier}:${license_type}`]
    if (exclusive && !exclusiveHours) {
      return NextResponse.json({ error: 'Exclusive rights aren\'t available for this license type — only Broadcast (exclusive_24h / breaking_exclusive) and Wire Service (exclusive / breaking_exclusive) support exclusivity.' }, { status: 400 })
    }

    const supabase = createServerClient()
    const admin = createAdminClient()

    // Get report + reporter info for revenue split
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, user_id, title, status, user:users(tier)')
      .eq('id', report_id)
      .eq('status', 'published')
      .single()

    if (reportError && reportError.code !== 'PGRST116') captureError(reportError, { route: 'POST /api/licensing', report_id })
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    // Block this request if ANY currently-active exclusive hold on this
    // report blocks the tier being requested here — scoped, not a blanket
    // "any exclusive blocks everything": a broadcast exclusive doesn't block
    // a wire request, a wire exclusive blocks every tier (see
    // exclusiveBlocksTier). Previously this only blocked a second
    // *exclusive* bid of any tier, and checked against nothing time-bound at
    // all (a long-expired exclusive license blocked every future exclusive
    // request on that report forever). Checked against exclusive_until, the
    // real payment-cleared clock.
    const { data: activeExclusives } = await admin
      .from('licenses')
      .select('id, tier, exclusive_until')
      .eq('report_id', report_id)
      .eq('status', 'active')
      .eq('exclusive', true)
      .gt('exclusive_until', new Date().toISOString())

    const blockingHold = (activeExclusives || []).find(l => exclusiveBlocksTier(l.tier, tier))
    if (blockingHold) {
      return NextResponse.json({ error: `This report is under an active ${blockingHold.tier} exclusive license until ${blockingHold.exclusive_until}.` }, { status: 409 })
    }

    // Calculate revenue split
    const reporterTier = ((report.user as any)?.tier || 'starter') as ReporterTier
    const reporterShare = calculateReporterShare(price * 0.70, reporterTier) // VozIt keeps 30%
    const vozitShare = Math.round((price - reporterShare) * 100) / 100

    // Create license record
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + tierConfig.duration_days)

    const { data: license, error } = await supabase.from('licenses').insert({
      report_id,
      reporter_id: report.user_id,
      tier,
      license_type,
      licensee_org,
      licensee_email,
      licensee_name: licensee_name || null,
      price,
      reporter_share: reporterShare,
      vozit_share: vozitShare,
      exclusive: exclusive || false,
      exclusive_hours: exclusive ? exclusiveHours : null,
      rights: tierConfig.rights,
      status: price === 0 ? 'active' : 'pending_payment',
      expires_at: expiresAt.toISOString(),
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // For free licenses (editorial embed), activate immediately
    if (price === 0) {
      return NextResponse.json({
        ok: true,
        license: { id: license.id, status: 'active', tier, type: license_type, price: 0, expires: expiresAt.toISOString() },
        embedCode: `<iframe src="${process.env.NEXT_PUBLIC_APP_URL || 'https://vozit.net'}/embed/${report_id}" width="640" height="400" frameborder="0" allowfullscreen></iframe>`,
        message: 'Editorial embed license activated. Credit VozIt + reporter.',
      })
    }

    // For paid licenses, create a real Stripe Checkout session instead of
    // just returning "we'll invoice you" — the license stays pending_payment
    // until the webhook below confirms payment actually cleared.
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        ok: true,
        license: { id: license.id, status: 'pending_payment', tier, type: license_type, price, expires: expiresAt.toISOString() },
        payment: { method: 'Invoice', contact: 'vozitnews@gmail.com', note: 'Online payment is not configured yet — we\'ll follow up to invoice you.' },
      })
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: licensee_email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `VozIt! ${tierConfig.name} — ${report.title}`,
            description: `${license_type.replace(/_/g, ' ')} · ${licensee_org}`,
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/licensing?license_id=${license.id}&paid=1`,
      cancel_url: `${appUrl}/licensing?license_id=${license.id}&canceled=1`,
      metadata: { license_id: license.id },
    })

    await admin.from('licenses').update({ payment_id: session.id }).eq('id', license.id)

    return NextResponse.json({
      ok: true,
      license: {
        id: license.id,
        status: 'pending_payment',
        tier,
        type: license_type,
        price,
        currency: 'USD',
        reporterShare,
        exclusive: exclusive || false,
        expires: expiresAt.toISOString(),
        rights: tierConfig.rights,
      },
      checkoutUrl: session.url,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
