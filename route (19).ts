// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

// POST /api/share — log a share event and increment report share count
export async function POST(req: NextRequest) {
  const { report_id, platform } = await req.json()

  if (!report_id || !platform) {
    return NextResponse.json({ error: 'report_id and platform required' }, { status: 400 })
  }

  const validPlatforms = ['x', 'facebook', 'tiktok', 'youtube', 'instagram', 'native', 'copy', 'whatsapp', 'telegram']
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  // Log the share event
  await admin.from('share_events').insert({
    report_id,
    platform,
    shared_by: user?.id ?? null,
    referrer: req.headers.get('referer') ?? null,
  })

  // Increment share count on the report
  await admin.rpc('increment_share_count', { rid: report_id })

  return NextResponse.json({ ok: true })
}

// GET /api/share?report_id=xxx — get share stats for a report
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reportId = searchParams.get('report_id')
  if (!reportId) return NextResponse.json({ error: 'report_id required' }, { status: 400 })

  const admin = createAdminClient()

  // Get share counts by platform
  const { data } = await admin
    .from('share_events')
    .select('platform')
    .eq('report_id', reportId)

  const counts: Record<string, number> = {}
  data?.forEach(e => { counts[e.platform] = (counts[e.platform] ?? 0) + 1 })
  const total = data?.length ?? 0

  return NextResponse.json({ total, byPlatform: counts })
}
export const dynamic = 'force-dynamic'
