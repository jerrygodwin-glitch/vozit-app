// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sanitizeInput, rateLimit, RATE_LIMITS } from '@/lib/security'
import { captureError } from '@/lib/monitoring'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  try {
    const { email } = await req.json()
    const emailClean = sanitizeInput(email, 254).toLowerCase().trim()
    if (!emailClean) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const limit = await rateLimit(`resend_verify:${emailClean}`, RATE_LIMITS.password_reset.max, RATE_LIMITS.password_reset.window, supabase)
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })

    await supabase.auth.resend({
      type: 'signup',
      email: emailClean,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback` },
    })

    // Same rationale as forgot-password: don't reveal whether the email
    // exists or was already verified.
    return NextResponse.json({ ok: true, message: 'If that account needs verifying, a new email is on its way.' })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/auth/resend-verification' })
    return NextResponse.json({ ok: true, message: 'If that account needs verifying, a new email is on its way.' })
  }
}
export const dynamic = 'force-dynamic'
