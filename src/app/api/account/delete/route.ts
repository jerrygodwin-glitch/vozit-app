// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'
import { captureError } from '@/lib/monitoring'

const PURGE_WINDOW_DAYS = 30

// POST /api/account/delete — soft-deletes the authenticated user's own
// account. Requires the real username typed back (checked server-side, not
// just trusted from the confirmation modal's own client-side check) so a
// stray click can't trigger this by accident.
//
// This does NOT hard-delete anything. It sets is_deleted/deleted_at/
// deletion_scheduled_at (30 days out) and bans the Supabase Auth account
// (admin.auth.admin.updateUserById ban_duration) so the account can't be
// logged back into during the grace window, without touching the
// underlying row or their published reports. No automated purge job exists
// yet to actually act on deletion_scheduled_at once it passes — that's a
// deliberately separate, more carefully-reviewed piece of work, not
// something to build quietly alongside this route.
export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthedUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { username } = await req.json()
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Type your username to confirm.' }, { status: 400 })
    }

    const { data: profile } = await supabase.from('users').select('username').eq('id', user.id).single()
    if (!profile || profile.username !== username.trim()) {
      return NextResponse.json({ error: 'That username doesn’t match your account.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const now = new Date()
    const scheduledPurge = new Date(now.getTime() + PURGE_WINDOW_DAYS * 24 * 60 * 60 * 1000)

    const { error: updateError } = await admin.from('users').update({
      is_deleted: true,
      deleted_at: now.toISOString(),
      deletion_scheduled_at: scheduledPurge.toISOString(),
    }).eq('id', user.id)
    if (updateError) {
      captureError(updateError, { route: 'POST /api/account/delete (profile update)', userId: user.id })
      return NextResponse.json({ error: 'Could not delete your account. Please try again.' }, { status: 500 })
    }

    // Blocks any future login attempt for the duration of the grace window
    // (ban_duration, not a row delete) — the account genuinely still exists
    // until the purge job this route does NOT implement ever runs.
    await admin.auth.admin.updateUserById(user.id, { ban_duration: '87600h' }).catch((e: any) => {
      captureError(e, { route: 'POST /api/account/delete (auth ban)', userId: user.id })
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/account/delete' })
    return NextResponse.json({ error: 'Could not delete your account. Please try again.' }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
