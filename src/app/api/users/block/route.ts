// @ts-nocheck
// Block another user — the other half of Apple's App Store requirement
// for user-generated-content apps (report content + block abusive
// users, both required; VozIt already had /api/reports/flag for the
// first half).
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase } = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_id, created_at, blocked:users!blocked_users_blocked_id_fkey(id, username, display_name, tier)')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ blocked: data })
}

export async function POST(req: NextRequest) {
  const { user, supabase } = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { blockedUserId } = await req.json()
  if (!blockedUserId) return NextResponse.json({ error: 'blockedUserId is required' }, { status: 400 })
  if (blockedUserId === user.id) return NextResponse.json({ error: "You can't block yourself" }, { status: 400 })

  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocker_id: user.id, blocked_id: blockedUserId })

  // Already blocked — the UNIQUE(blocker_id, blocked_id) constraint rejects
  // a duplicate insert, but blocking someone twice isn't a real error from
  // the caller's point of view.
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { user, supabase } = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { blockedUserId } = await req.json()
  if (!blockedUserId) return NextResponse.json({ error: 'blockedUserId is required' }, { status: 400 })

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedUserId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
