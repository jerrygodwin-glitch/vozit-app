// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { calculateReporterShare } from '@/lib/payouts'
import type { ReporterTier } from '@/types'

// ── LICENSING TIERS ──────────────────────────────────────────────────
// What news organizations pay to use VozIt footage

const LICENSE_TIERS = {
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
      breaking_exclusive: 7500, // Breaking exclusive (24h) — NEW tier
      exclusive_24h: 10000,   // Full 24-hour exclusive rights — raised from $5,000
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
        contact: 'licensing@vozit.app',
      })
    }

    // Return specific report licensing info
    const supabase = createServerClient()
    const { data: report } = await supabase
      .from('reports')
      .select('id, title, playback_id, thumbnail_url, location_name, duration, created_at, status, user:users(username, tier)')
      .eq('id', reportId)
      .eq('status', 'published')
      .single()

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
      .select('tier, license_type, licensee_org, exclusive, expires_at')
      .eq('report_id', reportId)
      .eq('status', 'active')

    const hasExclusive = licenses?.some(l => l.exclusive && new Date(l.expires_at) > new Date())

    return NextResponse.json({
      report: {
        id: report.id,
        title: report.title,
        thumbnail: report.thumbnail_url,
        location: report.location_name,
        duration: report.duration,
        reporter: (report.user as any)?.username,
        isBreaking,
        hoursOld: Math.round(hoursOld),
        exclusiveAvailable: !hasExclusive,
      },
      pricing: LICENSE_TIERS,
      existingLicenses: (licenses || []).length,
      embedCode: `<iframe src="${process.env.NEXT_PUBLIC_APP_URL || 'https://vozit.app'}/embed/${reportId}" width="640" height="400" frameborder="0" allowfullscreen></iframe>`,
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

    const supabase = createServerClient()
    const admin = createAdminClient()

    // Get report + reporter info for revenue split
    const { data: report } = await supabase
      .from('reports')
      .select('id, user_id, title, status, user:users(tier)')
      .eq('id', report_id)
      .eq('status', 'published')
      .single()

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    // Check exclusivity — admin client, see note in GET above
    if (exclusive) {
      const { data: existing } = await admin
        .from('licenses')
        .select('id')
        .eq('report_id', report_id)
        .eq('status', 'active')
        .eq('exclusive', true)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Exclusive license already active for this report' }, { status: 409 })
      }
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
        embedCode: `<iframe src="${process.env.NEXT_PUBLIC_APP_URL || 'https://vozit.app'}/embed/${report_id}" width="640" height="400" frameborder="0" allowfullscreen></iframe>`,
        message: 'Editorial embed license activated. Credit VozIt + reporter.',
      })
    }

    // For paid licenses, return payment instructions
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
      payment: {
        method: 'Invoice or Stripe checkout',
        contact: 'licensing@vozit.app',
        note: `$${reporterShare} of this license fee goes directly to the citizen reporter who captured this footage.`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
