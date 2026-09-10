// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()
  const { data } = await supabase.from('tasks').select('*, creator:users!created_by(id, username, display_name)').eq('status', 'open').order('created_at', { ascending: false }).limit(30)
  return NextResponse.json({ tasks: data })
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const admin = createAdminClient()
  const { data, error } = await admin.from('tasks').insert({ created_by: user.id, title: body.title, description: body.description || '', location_name: body.location_name, reward_usd: body.reward_usd, deadline: body.deadline || new Date(Date.now() + 86400000).toISOString(), status: 'open' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
export const dynamic = 'force-dynamic'
