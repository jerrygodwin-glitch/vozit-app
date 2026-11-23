// @ts-nocheck
// Renews the currently-live VOZIT_INSTAGRAM_TOKEN before its 60-day expiry —
// same underlying Graph API exchange as /api/instagram/extend-token, just
// fed the current long-lived token instead of a fresh short-lived one. No
// scheduled-task runner exists in this project yet (no vercel.json), so
// this is a manually-triggered admin action for now, not an automatic cron
// job — call it every ~50 days.
//
// Returns the new token for you to copy into VOZIT_INSTAGRAM_TOKEN in
// Vercel yourself — it never writes to Vercel's env vars itself.
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { isAdminIpAllowed } from '@/lib/security'
import { exchangeForLongLivedToken } from '@/lib/instagram-api'
import { captureError } from '@/lib/monitoring'

async function requireAdmin(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!isAdminIpAllowed(ip)) return { error: 'Admin access is not permitted from this network.', status: 403 }

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { error: 'Admin only', status: 403 }

  return { user }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const currentToken = process.env.VOZIT_INSTAGRAM_TOKEN
  if (!currentToken) return NextResponse.json({ error: 'VOZIT_INSTAGRAM_TOKEN is not set — nothing to refresh. Use /api/instagram/extend-token for first-time setup instead.' }, { status: 400 })

  try {
    const result = await exchangeForLongLivedToken(currentToken)
    if ('error' in result) {
      captureError(new Error(result.error), { route: 'POST /api/instagram/refresh-token' })
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    const expiresInDays = Math.round(result.expiresInSeconds / 86400)
    return NextResponse.json({
      ok: true,
      long_lived_token: result.token,
      expires_in_days: expiresInDays,
      note: `Save this as VOZIT_INSTAGRAM_TOKEN in Vercel, replacing the old value. Expires in ~${expiresInDays} days.`,
    })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/instagram/refresh-token' })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
