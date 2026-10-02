// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/supabase-server'
import { createMuxUpload } from '@/lib/mux'
import { captureError } from '@/lib/monitoring'

export async function POST(req: NextRequest) {
  const { user } = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    // The real origin this request actually came from — always matches
    // wherever the browser is about to upload from, so it can't drift out
    // of sync with the live domain the way a separately-set env var can.
    const origin = req.headers.get('origin') || undefined
    const { uploadId, uploadUrl } = await createMuxUpload(origin)
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
