// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sanitizeUsername, rateLimit, RATE_LIMITS } from '@/lib/security'

// GET /api/auth/check-username?username=foo — live availability check while
// typing on the registration form, so "username taken" surfaces before
// submit instead of after filling out the whole form.
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const supabase = createServerClient()
  const limit = await rateLimit(`check_username:${ip}`, RATE_LIMITS.api_general.max, RATE_LIMITS.api_general.window, supabase)
  if (!limit.allowed) return NextResponse.json({ error: 'Too many checks. Slow down.' }, { status: 429 })

  const username = new URL(req.url).searchParams.get('username') || ''
  const check = sanitizeUsername(username)
  if (!check.valid) return NextResponse.json({ available: false, reason: check.error })

  const { data: existing } = await supabase.from('users').select('id').eq('username', check.cleaned).single()
  return NextResponse.json({ available: !existing, cleaned: check.cleaned })
}
export const dynamic = 'force-dynamic'
