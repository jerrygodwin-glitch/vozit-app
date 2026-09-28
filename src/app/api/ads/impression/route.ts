// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { calculateEarnings } from '@/lib/revenue'

// POST /api/ads/impression — records that an ad actually played on a
// report, and credits the reporter's tier-based share as real earnings —
// the same revenue-share system every other earnings source already uses.
//
// AD_CPM_USD is a placeholder rate (default $5 per 1,000 views) until a
// real ad network is connected and providing actual bid data — this makes
// the whole pipeline (impression -> revenue -> tier split -> payout) real
// and testable now, not blocked on having a live ad account first.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { report_id, ad_network, completed } = await req.json()
  if (!report_id) return NextResponse.json({ error: 'report_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: report } = await admin.from('reports').select('id, user_id, user:users(tier)').eq('id', report_id).single()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const cpm = Number(process.env.AD_CPM_USD || 5)
  const grossRevenue = completed ? cpm / 1000 : 0

  const { error } = await admin.from('ad_impressions').insert({
    report_id,
    reporter_id: report.user_id,
    viewer_id: user?.id || null,
    ad_network: ad_network || 'house',
    revenue_usd: grossRevenue,
    completed: !!completed,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Only credit real earnings once the ad actually finished playing —
  // a skipped/abandoned ad doesn't earn anything.
  if (completed && grossRevenue > 0) {
    const reporterShare = calculateEarnings(grossRevenue, report.user?.tier || 'starter')
    if (reporterShare > 0) {
      await admin.from('earnings').insert({
        user_id: report.user_id,
        report_id,
        amount: reporterShare,
        source: 'ad_revenue',
      })
    }
  }

  return NextResponse.json({ ok: true })
}
export const dynamic = 'force-dynamic'
