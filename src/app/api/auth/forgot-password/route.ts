// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sanitizeInput, rateLimit, RATE_LIMITS } from '@/lib/security'
import { captureError } from '@/lib/monitoring'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const supabase = createServerClient()

  try {
    const { email } = await req.json()
    const emailClean = sanitizeInput(email, 254).toLowerCase().trim()
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      return NextResponse.json({ error: 'Valid email address required' }, { status: 400 })
    }

    // Rate limit by IP and by the email itself, so this can't be used to
    // spam a specific inbox with reset emails either.
    const ipLimit = await rateLimit(`password_reset:${ip}`, RATE_LIMITS.password_reset.max, RATE_LIMITS.password_reset.window, supabase)
    const emailLimit = await rateLimit(`password_reset:${emailClean}`, RATE_LIMITS.password_reset.max, RATE_LIMITS.password_reset.window, supabase)
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return NextResponse.json({ error: 'Too many reset requests. Please try again later.' }, { status: 429 })
    }

    await supabase.auth.resetPasswordForEmail(emailClean, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/auth/reset-password`,
    })

    // Always return the same success response whether or not that email is
    // registered — confirming/denying an account's existence here would let
    // someone enumerate reporters' email addresses.
    return NextResponse.json({ ok: true, message: 'If an account exists for that email, a reset link has been sent.' })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/auth/forgot-password' })
    // Same reasoning as above — don't leak internal errors that could hint
    // at whether the email exists.
    return NextResponse.json({ ok: true, message: 'If an account exists for that email, a reset link has been sent.' })
  }
}
export const dynamic = 'force-dynamic'
