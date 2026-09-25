// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { canDownloadCleanVideo } from '@/lib/watermark'

// GET /api/licensing/download?license_id=X&email=Y
// The "clean" master was never watermarked to begin with — only the
// public-facing copy gets the branded overlay burned in (by the worker),
// so licensed delivery is just the original Mux rendition, gated on an
// active, paid license with download rights (canDownloadCleanVideo also
// correctly excludes the Embed tier, which only grants embedding rights,
// not a downloadable file).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const licenseId = searchParams.get('license_id')
  const email = searchParams.get('email')
  if (!licenseId || !email) return NextResponse.json({ error: 'license_id and email required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: license } = await admin
    .from('licenses')
    .select('id, report_id, licensee_email')
    .eq('id', licenseId)
    .single()

  if (!license) return NextResponse.json({ error: 'License not found' }, { status: 404 })
  if (license.licensee_email.toLowerCase() !== email.toLowerCase()) return NextResponse.json({ error: 'Email does not match this license' }, { status: 403 })

  const allowed = await canDownloadCleanVideo(admin, license.report_id, license.licensee_email)
  if (!allowed) return NextResponse.json({ error: 'This license is not active, has expired, or does not include download rights' }, { status: 403 })

  const { data: report } = await admin.from('reports').select('playback_id').eq('id', license.report_id).single()
  if (!report?.playback_id) return NextResponse.json({ error: 'Video not available' }, { status: 404 })

  return NextResponse.redirect(`https://stream.mux.com/${report.playback_id}/high.mp4`)
}
export const dynamic = 'force-dynamic'
