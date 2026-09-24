// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { sanitizeUsername, sanitizeInput } from '@/lib/security'
import { captureError } from '@/lib/monitoring'

// POST /api/auth/set-username — used right after OAuth sign-in (Google/
// Facebook) to make sure every reporter has a deliberately chosen, unique
// username, since OAuth never asks for one. A DB trigger may (or may not)
// have already auto-created a `users` row from the email's local part —
// this upserts via the admin client instead of a plain insert/update, so it
// works correctly either way without depending on which state the DB is in.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { username } = await req.json()
    const check = sanitizeUsername(username || '')
    if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 })

    const admin = createAdminClient()
    const { data: existing } = await admin.from('users').select('id').eq('username', check.cleaned).neq('id', user.id).single()
    if (existing) return NextResponse.json({ error: 'That username is already taken' }, { status: 409 })

    const displayName = sanitizeInput(user.user_metadata?.full_name || user.user_metadata?.name || check.cleaned, 50)
    const { error } = await admin.from('users').upsert({
      id: user.id,
      username: check.cleaned,
      display_name: displayName,
    })
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'That username was just taken. Please choose another.' }, { status: 409 })
      throw error
    }

    return NextResponse.json({ ok: true, username: check.cleaned })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/auth/set-username', userId: user.id })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
