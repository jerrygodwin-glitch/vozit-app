// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { captureError } from '@/lib/monitoring'
import { LICENSE_TIERS } from '@/app/api/licensing/route'

// Stripe webhook — the moment a media org's payment for a license actually
// clears, this is what turns that into: license active, reporter's share
// becomes real earnings, and the license's validity period starts counting
// from payment (not from when they first submitted the request, which
// could've been days earlier while invoicing/back-and-forth happened).
export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  let event: any
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (e: any) {
    captureError(e, { route: 'POST /api/webhooks/stripe-licensing (signature)' })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      // Task-reward payment — the task row itself is only created once
      // payment actually clears, so someone can't post an unfunded "reward"
      // that a reporter later claims and completes for nothing.
      if (session.metadata?.purpose === 'task_creation') {
        const paymentRef = session.payment_intent || session.id
        // Idempotency — Stripe can redeliver the same event.
        const { data: existing } = await admin.from('tasks').select('id').eq('stripe_payment_intent_id', paymentRef).single()
        if (existing) return NextResponse.json({ ok: true, already: true })

        const m = session.metadata
        await admin.from('tasks').insert({
          created_by: m.created_by,
          title: m.title,
          description: m.description || '',
          location_name: m.location_name,
          reward_usd: Number(m.reward_usd),
          deadline: m.deadline,
          status: 'open',
          stripe_payment_intent_id: paymentRef,
        })
        return NextResponse.json({ ok: true })
      }

      const licenseId = session.metadata?.license_id
      if (!licenseId) return NextResponse.json({ ok: true }) // not one of ours

      const { data: license } = await admin.from('licenses').select('*').eq('id', licenseId).single()
      if (!license) return NextResponse.json({ ok: true })

      // Idempotency — Stripe can deliver the same event more than once, and
      // this must never double-credit the reporter's earnings.
      if (license.status === 'active') return NextResponse.json({ ok: true, already: true })

      const tierConfig = LICENSE_TIERS[license.tier as keyof typeof LICENSE_TIERS]
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (tierConfig?.duration_days || 30))

      await admin.from('licenses').update({
        status: 'active',
        payment_id: session.payment_intent || session.id,
        expires_at: expiresAt.toISOString(),
      }).eq('id', licenseId)

      // Credit the reporter's share as real, withdrawable earnings (same
      // 7-day hold as every other earnings source) — this is the step that
      // was entirely missing before: a license could be marked paid and the
      // reporter's cut would still never reach their actual balance.
      if (license.reporter_id && Number(license.reporter_share) > 0) {
        await admin.from('earnings').insert({
          user_id: license.reporter_id,
          report_id: license.report_id,
          amount: license.reporter_share,
          source: 'licensing',
        })
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/webhooks/stripe-licensing' })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
