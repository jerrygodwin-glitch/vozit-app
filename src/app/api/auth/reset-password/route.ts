// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { validatePassword } from '@/lib/security'
import { captureError } from '@/lib/monitoring'

// Called from /auth/reset-password after the reporter clicked the emailed
// reset link — /auth/callback already exchanged that link's code for a
// real (recovery) session in their cookies, so this route just needs that
// session to actually set the new password.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Reset link expired or invalid. Please request a new one.' }, { status: 401 })

  try {
    const { password } = await req.json()
    const pwCheck = validatePassword(password)
    if (!pwCheck.valid) return NextResponse.json({ error: 'Password too weak', details: pwCheck.errors }, { status: 400 })

    const { error } = await supabase.auth.updateUser({ password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/auth/reset-password', userId: user.id })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
