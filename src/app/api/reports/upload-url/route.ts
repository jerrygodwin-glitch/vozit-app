// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/supabase-server'
import { createMuxUpload } from '@/lib/mux'
import { captureError } from '@/lib/monitoring'

export async function POST(req: NextRequest) {
  const { user } = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    // req.nextUrl.origin first — it's derived from the request's own
    // destination URL, which is always present, unlike the Origin header
    // (some browsers, Safari included, omit it on same-origin requests,
    // which would have silently fallen through to a possibly-stale env
    // var — likely why this didn't actually fix anything last time).
    const origin = req.nextUrl?.origin || req.headers.get('origin') || undefined
    const { uploadId, uploadUrl } = await createMuxUpload(origin)
    // Temporary — three attempts at the CORS-origin angle and a full
    // client-library swap haven't changed the symptom at all, which rules
    // out the client side entirely. Logging exactly what was actually sent
    // to Mux so the next failure gives real data instead of another guess
    // (a CORS-blocked request tells the browser nothing useful at all —
    // this is the only vantage point left to inspect it from).
    console.log('[upload-url] origin=%s uploadId=%s uploadUrl=%s', origin, uploadId, uploadUrl)
    return NextResponse.json({ uploadId, uploadUrl })
  } catch (e: any) {
    // This had no logging at all before — a real failure here (e.g. a
    // missing Mux credential) left no trace anywhere except a generic
    // message on the upload screen, with nothing to actually diagnose it.
    captureError(e, { route: 'POST /api/reports/upload-url', userId: user.id })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
