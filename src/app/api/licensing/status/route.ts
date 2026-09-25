// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// GET /api/licensing/status?license_id=X — polled by the licensing page
// right after returning from Stripe checkout, since the webhook that
// actually activates the license can land a second or two after the
// redirect back.
export async function GET(req: NextRequest) {
  const licenseId = new URL(req.url).searchParams.get('license_id')
  if (!licenseId) return NextResponse.json({ error: 'license_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: license } = await admin
    .from('licenses')
    .select('id, status, licensee_email, price, reporter_share')
    .eq('id', licenseId)
    .single()

  if (!license) return NextResponse.json({ error: 'License not found' }, { status: 404 })
  return NextResponse.json({ status: license.status, email: license.licensee_email, price: license.price, reporterShare: license.reporter_share })
}
export const dynamic = 'force-dynamic'
