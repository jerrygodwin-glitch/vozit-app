// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// POST /api/assignments/vote — toggles "I'm interested in this" on an
// assignment itself, before anyone's even filed a report. This is the only
// demand signal an unfunded coverage request has, and a hint to anyone
// deciding whether to fund one (see /api/assignments/fund).
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assignment_id } = await req.json()
  if (!assignment_id) return NextResponse.json({ error: 'assignment_id required' }, { status: 400 })

  const { data: existing } = await supabase.from('assignment_votes').select('id').eq('assignment_id', assignment_id).eq('user_id', user.id).single()

  if (existing) {
    const { error } = await supabase.from('assignment_votes').delete().eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, voted: false })
  }

  const { error } = await supabase.from('assignment_votes').insert({ assignment_id, user_id: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, voted: true })
}
export const dynamic = 'force-dynamic'
