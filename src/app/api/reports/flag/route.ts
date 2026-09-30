// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const REASONS = ['fake_or_ai_generated', 'recycled_footage', 'wrong_location_or_time', 'explicit_content', 'hateful_content', 'other']
// Same "5+" bar Field Notes uses before hiding a low-rated note — a single
// flag showing up publicly as "1 person flagged this as hateful" is more
// misleading than informative, and an easy target for brigading.
const MIN_VISIBLE_COUNT = 5

// GET /api/reports/flag?report_id=X — the public "buyer beware" tally,
// broken out by reason so a viewer knows why, not just that. Counts only,
// never who flagged it — same anonymity reasoning as Field Notes, given
// the kind of content this platform carries.
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const reportId = new URL(req.url).searchParams.get('report_id')
  if (!reportId) return NextResponse.json({ error: 'report_id required' }, { status: 400 })

  const { data: flags } = await supabase.from('report_flags').select('reason').eq('report_id', reportId)

  const tally: Record<string, number> = {}
  for (const f of flags || []) tally[f.reason] = (tally[f.reason] || 0) + 1

  const counts = Object.entries(tally)
    .filter(([, count]) => count >= MIN_VISIBLE_COUNT)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ counts })
}

// POST /api/reports/flag — a viewer flags a report as fake/misleading/
// explicit/hateful, separate from up/downvoting (which is about
// newsworthiness, not authenticity or appropriateness). Flags never hold
// or remove a report by themselves — they're the community's own visible
// signal (see GET above), backstopping what Hive wasn't confident enough
// to act on alone, not a moderation trigger in their own right.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { report_id, reason, notes } = await req.json()
  if (!report_id) return NextResponse.json({ error: 'report_id required' }, { status: 400 })
  if (!REASONS.includes(reason)) return NextResponse.json({ error: `reason must be one of: ${REASONS.join(', ')}` }, { status: 400 })

  const { data: existing } = await supabase.from('report_flags').select('id').eq('report_id', report_id).eq('user_id', user.id).single()
  if (existing) return NextResponse.json({ error: 'You already flagged this report' }, { status: 400 })

  const { error } = await supabase.from('report_flags').insert({ report_id, user_id: user.id, reason, notes: notes || null })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
export const dynamic = 'force-dynamic'
