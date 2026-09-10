// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { sanitizeInput, checkAccountLockout, recordFailedLogin, clearLoginAttempts, rateLimit, RATE_LIMITS } from '@/lib/security'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limit = await rateLimit(`auth:${ip}`, RATE_LIMITS.auth.max, RATE_LIMITS.auth.window)
  if (!limit.allowed) return NextResponse.json({ error: 'Too many login attempts. Try again in a few minutes.' }, { status: 429 })

  try {
    const { email, password } = await req.json()
    const emailClean = sanitizeInput(email, 254).toLowerCase().trim()

    const lockout = checkAccountLockout(emailClean)
    if (lockout.locked) return NextResponse.json({ error: `Account temporarily locked. Try again in ${lockout.minutesRemaining} minutes.` }, { status: 423 })

    const supabase = createServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailClean, password })

    if (error) {
      const result = recordFailedLogin(emailClean)
      return NextResponse.json({ error: result.locked ? 'Account locked due to too many failed attempts.' : `Invalid credentials. ${result.attemptsRemaining} attempts remaining.` }, { status: 401 })
    }

    clearLoginAttempts(emailClean)

    const { data: profile } = await supabase.from('users').select('is_banned, ban_reason').eq('id', data.user.id).single()
    if (profile?.is_banned) { await supabase.auth.signOut(); return NextResponse.json({ error: `Account suspended: ${profile.ban_reason || 'Policy violation'}` }, { status: 403 }) }

    return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email }, requiresVerification: !data.user.email_confirmed_at })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
export const dynamic = 'force-dynamic'
