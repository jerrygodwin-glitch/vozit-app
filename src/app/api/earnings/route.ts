// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET /api/earnings?from=ISO&to=ISO (both optional — omit for all-time)
// Earnings currently live in two separate tables that were never unified:
// `earnings` (ad revenue, licensing, tips) and `payout_records` (mainly
// assignment fees, via a DB trigger). This merges both into one picture
// rather than a reporter seeing two different partial numbers.
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  try {
    let earningsQuery = supabase.from('earnings').select('id, amount, source, created_at').eq('user_id', user.id)
    if (from) earningsQuery = earningsQuery.gte('created_at', from)
    if (to) earningsQuery = earningsQuery.lte('created_at', to)
    const { data: earningsRows, error: earningsError } = await earningsQuery
    if (earningsError) throw earningsError

    // Exclude 'failed' payout_records — those never actually materialized
    // as real earnings, unlike pending/cleared/processing/paid which all
    // represent money genuinely owed at some stage of the payout pipeline.
    let payoutRecordsQuery = supabase.from('payout_records').select('id, amount_usd, source, created_at, status').eq('user_id', user.id).neq('status', 'failed')
    if (from) payoutRecordsQuery = payoutRecordsQuery.gte('created_at', from)
    if (to) payoutRecordsQuery = payoutRecordsQuery.lte('created_at', to)
    const { data: payoutRows, error: payoutError } = await payoutRecordsQuery
    if (payoutError) throw payoutError

    const entries = [
      ...(earningsRows || []).map(e => ({ id: e.id, amount: Number(e.amount), source: e.source, created_at: e.created_at, origin: 'earnings' })),
      ...(payoutRows || []).map(p => ({ id: p.id, amount: Number(p.amount_usd), source: p.source, created_at: p.created_at, origin: 'payout_records' })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const bySource: Record<string, number> = { ad_revenue: 0, licensing: 0, tip: 0, assignment_fee: 0, other: 0 }
    let total = 0
    for (const e of entries) {
      total += e.amount
      if (bySource[e.source] !== undefined) bySource[e.source] += e.amount
      else bySource.other += e.amount
    }
    for (const k of Object.keys(bySource)) bySource[k] = Math.round(bySource[k] * 100) / 100

    return NextResponse.json({
      total: Math.round(total * 100) / 100,
      bySource,
      count: entries.length,
      entries: entries.slice(0, 100), // detail list — bounded, this isn't a full export
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
