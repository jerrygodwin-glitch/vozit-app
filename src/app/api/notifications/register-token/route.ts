// @ts-nocheck
// Push-notification backend plumbing, built ahead of the actual mobile
// apps existing — see src/lib/push-notifications.ts for why this is
// inert (no real sends happen) until real APNs/FCM credentials exist.
// This route just lets a mobile client register/unregister the device
// token it gets from Apple/Google once it's built.
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { user, supabase } = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform, token } = await req.json()
  if (!platform || !token) return NextResponse.json({ error: 'platform and token are required' }, { status: 400 })
  if (platform !== 'ios' && platform !== 'android') return NextResponse.json({ error: "platform must be 'ios' or 'android'" }, { status: 400 })

  // A token belongs to whichever device/app install generated it, not to a
  // specific account forever — if the same token shows up under a
  // different signed-in user (new owner, re-login), reassign it rather
  // than erroring on the UNIQUE(platform, token) constraint.
  const { error } = await supabase
    .from('device_tokens')
    .upsert({ user_id: user.id, platform, token, updated_at: new Date().toISOString() }, { onConflict: 'platform,token' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { user, supabase } = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

  const { error } = await supabase.from('device_tokens').delete().eq('user_id', user.id).eq('token', token)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
