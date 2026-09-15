// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/supabase-server'
import { createMuxUpload } from '@/lib/mux'

export async function POST(req: NextRequest) {
  const { user } = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { uploadId, uploadUrl } = await createMuxUpload()
    return NextResponse.json({ uploadId, uploadUrl })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export const dynamic = 'force-dynamic'
