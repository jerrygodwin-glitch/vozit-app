// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const urgency = searchParams.get('urgency')
  let q = supabase.from('assignments').select('*, creator:users!created_by(id, username, display_name, avatar_url, tier), angles:assignment_angles(id, title, report_count), contributors:assignment_contributors(id, user_id, reports_filed, total_earned, user:users(id, username, display_name, avatar_url, tier, credibility_score))').eq('status', 'active').order('created_at', { ascending: false }).limit(30)
  if (urgency && urgency !== 'all') q = q.eq('urgency', urgency)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignments: data })
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.title || !body.description) return NextResponse.json({ error: 'Title and description required' }, { status: 400 })
  const admin = createAdminClient()
  const { data: assignment, error } = await admin.from('assignments').insert({ created_by: user.id, title: body.title, description: body.description, urgency: body.urgency || 'medium', regions: body.regions || [], assignment_fee_pool_usd: body.assignment_fee_pool_usd || 0, assignment_fee_per_report_usd: body.assignment_fee_per_report_usd || 10, safety_notes: body.safety_notes, allows_anonymous: body.allows_anonymous || false }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (body.angles?.length) await admin.from('assignment_angles').insert(body.angles.map((t: string) => ({ assignment_id: assignment.id, title: t })))
  await admin.from('assignment_contributors').insert({ assignment_id: assignment.id, user_id: user.id })
  return NextResponse.json(assignment, { status: 201 })
}
export const dynamic = 'force-dynamic'
