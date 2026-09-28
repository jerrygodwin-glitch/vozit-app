// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// POST /api/reports/flag — a viewer flags a report as fake/misleading,
// separate from up/downvoting (which is about newsworthiness, not
// authenticity). This is the decentralized human layer alongside the AI
// scans — flagged reports surface in the admin moderation queue rather
// than being auto-hidden, since a flag count alone can be brigaded and
// shouldn't silently suppress real reporting.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { report_id, reason, notes } = await req.json()
  if (!report_id) return NextResponse.json({ error: 'report_id required' }, { status: 400 })
  const REASONS = ['fake_or_ai_generated', 'recycled_footage', 'wrong_location_or_time', 'other']
  if (!REASONS.includes(reason)) return NextResponse.json({ error: `reason must be one of: ${REASONS.join(', ')}` }, { status: 400 })

  const { data: existing } = await supabase.from('report_flags').select('id').eq('report_id', report_id).eq('user_id', user.id).single()
  if (existing) return NextResponse.json({ error: 'You already flagged this report' }, { status: 400 })

  const { error } = await supabase.from('report_flags').insert({ report_id, user_id: user.id, reason, notes: notes || null })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
export const dynamic = 'force-dynamic'
