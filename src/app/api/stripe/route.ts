// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { captureError } from '@/lib/monitoring'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' })

// POST /api/stripe — create Stripe Connect account and return onboarding link
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('users')
      .select('stripe_account_id, display_name, username')
      .eq('id', user.id)
      .single()

    let accountId = profile?.stripe_account_id

    // Create Stripe Connect Express account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US', // Will be updated during onboarding
        email: user.email!,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          vozit_user_id: user.id,
          vozit_username: profile?.username ?? '',
        },
      })
      accountId = account.id

      // Save to our database
      await admin.from('users')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id)
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?stripe=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?stripe=complete`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url, account_id: accountId })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/stripe', userId: user.id })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET /api/stripe — check account status
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('users')
      .select('stripe_account_id, total_earned, pending_payout')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        earnings: { total: profile?.total_earned ?? 0, pending: profile?.pending_payout ?? 0 },
      })
    }

    // Check Stripe account status
    const account = await stripe.accounts.retrieve(profile.stripe_account_id)

    // Get pending payouts from our DB
    const { data: pendingPayouts } = await admin
      .from('payout_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('clears_at', { ascending: true })

    // Get cleared payouts ready to transfer
    const { data: clearedPayouts } = await admin
      .from('payout_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'cleared')

    const clearedTotal = clearedPayouts?.reduce((sum, p) => sum + Number(p.amount_usd), 0) ?? 0

    return NextResponse.json({
      connected: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      earnings: {
        total: profile.total_earned,
        pending: profile.pending_payout,
        cleared: clearedTotal,
        pending_payouts: pendingPayouts ?? [],
      },
    })
  } catch (e: any) {
    captureError(e, { route: 'GET /api/stripe', userId: user.id })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/stripe — trigger payout for cleared earnings
export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('stripe_account_id, pending_payout')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_account_id) {
    return NextResponse.json({ error: 'Stripe not connected. Complete onboarding first.' }, { status: 400 })
  }

  // Find all cleared payouts
  const { data: cleared } = await admin
    .from('payout_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'cleared')

  if (!cleared || cleared.length === 0) {
    return NextResponse.json({ error: 'No cleared earnings to pay out' }, { status: 400 })
  }

  const totalCents = Math.round(
    cleared.reduce((sum, p) => sum + Number(p.amount_usd), 0) * 100
  )

  // Minimum payout threshold: $10
  if (totalCents < 1000) {
    return NextResponse.json({
      error: 'Minimum payout is $10. Current cleared: $' + (totalCents / 100).toFixed(2),
    }, { status: 400 })
  }

  try {
    // Create transfer to connected account
    const transfer = await stripe.transfers.create({
      amount: totalCents,
      currency: 'usd',
      destination: profile.stripe_account_id,
      metadata: {
        vozit_user_id: user.id,
        payout_ids: cleared.map(p => p.id).join(','),
      },
    })

    // Mark payouts as paid
    await admin
      .from('payout_records')
      .update({ status: 'paid', stripe_transfer_id: transfer.id })
      .in('id', cleared.map(p => p.id))

    // Update user's pending_payout
    await admin
      .from('users')
      .update({
        pending_payout: Math.max(0, (profile.pending_payout ?? 0) - totalCents / 100),
        total_earned: admin.rpc ? undefined : undefined, // total_earned stays
      })
      .eq('id', user.id)

    return NextResponse.json({
      ok: true,
      amount_usd: totalCents / 100,
      transfer_id: transfer.id,
      payouts_cleared: cleared.length,
    })
  } catch (e: any) {
    captureError(e, { route: 'PATCH /api/stripe', userId: user.id })
    // Mark payouts as failed
    await admin
      .from('payout_records')
      .update({ status: 'failed' })
      .in('id', cleared.map(p => p.id))

    return NextResponse.json({ error: 'Transfer failed: ' + e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
