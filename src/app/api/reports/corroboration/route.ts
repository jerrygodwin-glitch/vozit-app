// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET /api/reports/corroboration?report_id=X — other independently
// published reports near the same place and time. Multiple reporters
// converging on the same event without coordinating is a strong organic
// authenticity signal a single isolated upload doesn't have — surfaced as
// "confirmed by N other reports" rather than any single arbiter deciding.
const RADIUS_DEG = 0.05 // ~5km at most latitudes — good enough without PostGIS
const WINDOW_HOURS = 48

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const reportId = new URL(req.url).searchParams.get('report_id')
  if (!reportId) return NextResponse.json({ error: 'report_id required' }, { status: 400 })

  const { data: report } = await supabase.from('reports').select('id, location_lat, location_lng, when_happened, category').eq('id', reportId).single()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.location_lat == null || report.location_lng == null) {
    return NextResponse.json({ corroborating: [], count: 0 })
  }

  let query = supabase
    .from('reports')
    .select('id, title, location_name, when_happened, user:users(username, tier)')
    .eq('status', 'published')
    .neq('id', reportId)
    .gte('location_lat', report.location_lat - RADIUS_DEG)
    .lte('location_lat', report.location_lat + RADIUS_DEG)
    .gte('location_lng', report.location_lng - RADIUS_DEG)
    .lte('location_lng', report.location_lng + RADIUS_DEG)
    .limit(10)

  if (report.when_happened) {
    const claimed = new Date(report.when_happened)
    const from = new Date(claimed.getTime() - WINDOW_HOURS * 3600000).toISOString()
    const to = new Date(claimed.getTime() + WINDOW_HOURS * 3600000).toISOString()
    query = query.gte('when_happened', from).lte('when_happened', to)
  }

  const { data: corroborating } = await query
  return NextResponse.json({ corroborating: corroborating || [], count: corroborating?.length || 0 })
}
export const dynamic = 'force-dynamic'
