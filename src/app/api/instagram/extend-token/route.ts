// @ts-nocheck
// One-time setup endpoint — exchanges the 1-hour short-lived token you copy
// out of Graph API Explorer for a 60-day long-lived one. Doesn't need the
// broken "Link Instagram to Page" feature at all — this calls the Graph API
// directly with the app secret, the same way postToInstagram() in
// social-distribution.ts already posts without going through that UI.
//
// Returns the long-lived token in the response for you to copy into
// VOZIT_INSTAGRAM_TOKEN in Vercel yourself — this route never writes to
// Vercel's env vars itself (no API access to do that safely from here).
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

  try {
    const { short_lived_token } = await req.json()
    if (!short_lived_token) return NextResponse.json({ error: 'short_lived_token required' }, { status: 400 })

    const result = await exchangeForLongLivedToken(short_lived_token)
    if ('error' in result) {
      captureError(new Error(result.error), { route: 'POST /api/instagram/extend-token' })
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    const expiresInDays = Math.round(result.expiresInSeconds / 86400)
    return NextResponse.json({
      ok: true,
      long_lived_token: result.token,
      expires_in_days: expiresInDays,
      note: `Save this as VOZIT_INSTAGRAM_TOKEN in Vercel. Expires in ~${expiresInDays} days — call /api/instagram/refresh-token again before then.`,
    })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/instagram/extend-token' })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
