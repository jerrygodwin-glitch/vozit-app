// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { validatePassword, sanitizeInput, sanitizeUsername, rateLimit, RATE_LIMITS } from '@/lib/security'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limit = await rateLimit(`register:${ip}`, RATE_LIMITS.register.max, RATE_LIMITS.register.window)
  if (!limit.allowed) return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429 })

  try {
    const { email, password, username, display_name, turnstile_token } = await req.json()

    const emailClean = sanitizeInput(email, 254).toLowerCase().trim()
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean))
      return NextResponse.json({ error: 'Valid email address required' }, { status: 400 })

    const pwCheck = validatePassword(password)
    if (!pwCheck.valid) return NextResponse.json({ error: 'Password too weak', details: pwCheck.errors }, { status: 400 })

    const usernameCheck = sanitizeUsername(username || '')
    if (!usernameCheck.valid) return NextResponse.json({ error: usernameCheck.error }, { status: 400 })

    // Cloudflare Turnstile CAPTCHA
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!turnstile_token) return NextResponse.json({ error: 'CAPTCHA verification required' }, { status: 400 })
      const captchaRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: turnstile_token, remoteip: ip }),
      })
      const captchaData = await captchaRes.json()
      if (!captchaData.success) return NextResponse.json({ error: 'CAPTCHA failed. Please try again.' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: existing } = await supabase.from('users').select('id').eq('username', usernameCheck.cleaned).single()
    if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailClean, password,
      options: {
        data: { username: usernameCheck.cleaned, display_name: sanitizeInput(display_name || username, 50) },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    if (authData.user) {
      await supabase.from('users').insert({
        id: authData.user.id, email: emailClean, username: usernameCheck.cleaned,
        display_name: sanitizeInput(display_name || username, 50),
        tier: 'starter', report_count: 0, credibility_score: 0, total_earned: 0, is_admin: false, is_banned: false,
      }).then(() => {})
    }

    return NextResponse.json({ ok: true, message: 'Account created. Check your email to verify.', requiresVerification: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
export const dynamic = 'force-dynamic'
