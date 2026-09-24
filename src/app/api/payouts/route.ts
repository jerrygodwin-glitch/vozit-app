// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { PAYOUT_PROVIDERS, validatePayoutRequest, calculateAvailableBalance, executePayout, type PayoutProvider } from '@/lib/payouts'
import { fullPayoutScreening, logScreeningResult, type ScreeningResult } from '@/lib/ofac-screening'
import { rateLimit, RATE_LIMITS } from '@/lib/security'
import { captureError } from '@/lib/monitoring'

// GET — retrieve payout status, balance, and provider info
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('country, payout_provider, payout_account_id, stripe_account_id, display_name, total_earned, tier')
      .eq('id', user.id)
      .single()

    // Get earnings for 7-day hold calculation
    const { data: earnings } = await supabase
      .from('earnings')
      .select('id, amount, created_at, paid_out')
      .eq('user_id', user.id)

    const balance = calculateAvailableBalance(earnings || [])

    // Get payout history
    const { data: payouts } = await supabase
      .from('payouts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get last OFAC screening result
    const { data: lastScreening } = await supabase
      .from('ofac_screenings')
      .select('cleared, blocked, reason, screened_at')
      .eq('user_id', user.id)
      .order('screened_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      provider: profile?.payout_provider || null,
      country: profile?.country || null,
      balance,
      tier: profile?.tier || 'starter',
      payouts: payouts || [],
      lastScreening: lastScreening || null,
      availableProviders: Object.entries(PAYOUT_PROVIDERS).map(([id, p]) => ({
        id, name: p.name, icon: p.icon, description: p.description,
        minPayout: p.minPayout, methods: p.methods, regions: p.regions,
      })),
    })
  } catch (e: any) {
    captureError(e, { route: '/api/payouts' })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — request payout or connect provider
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // payouts/earnings only have SELECT RLS policies (a reporter can see
    // their own rows, but nothing lets them write to them directly — by
    // design, since letting a user's own session mark its own payout
    // "completed" or its own earnings "paid_out" would be a real hole).
    // Every write to those two tables below goes through the admin client,
    // gated by this route's own auth check instead of RLS.
    const admin = createAdminClient()

    const body = await req.json()
    const { action, provider, amount, account_details } = body

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('display_name, country, payout_provider, payout_account_id, stripe_account_id, tier')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // ─── CONNECT PROVIDER ────────────────────────────────────────────
    if (action === 'connect' || (!action && !amount)) {
      const p = provider as PayoutProvider
      if (!PAYOUT_PROVIDERS[p]) {
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
      }

      // Stripe Connect — redirect to onboarding
      if (p === 'stripe') {
        if (!process.env.STRIPE_SECRET_KEY) {
          return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
        }
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
        let accountId = profile.stripe_account_id

        if (!accountId) {
          const account = await stripe.accounts.create({
            type: 'express',
            country: profile.country || 'US',
            capabilities: { transfers: { requested: true } },
          })
          accountId = account.id
          await supabase.from('users').update({
            stripe_account_id: accountId,
            payout_provider: 'stripe',
          }).eq('id', user.id)
        }

        const link = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile?stripe=retry`,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile?stripe=success`,
          type: 'account_onboarding',
        })

        return NextResponse.json({ ok: true, onboarding_url: link.url })
      }

      // All other providers — save selection + account details
      await supabase.from('users').update({
        payout_provider: p,
        payout_account_id: account_details?.account_id || account_details?.email || account_details?.wallet_address || null,
      }).eq('id', user.id)

      return NextResponse.json({ ok: true, provider: p })
    }

    // ─── REQUEST PAYOUT ──────────────────────────────────────────────
    if (action === 'payout' && amount) {
      const limit = await rateLimit(`payout:${user.id}`, RATE_LIMITS.payout.max, RATE_LIMITS.payout.window, supabase)
      if (!limit.allowed) {
        return NextResponse.json({ error: 'Too many payout requests. Please try again tomorrow.' }, { status: 429 })
      }

      const p = (provider || profile.payout_provider) as PayoutProvider
      if (!p) return NextResponse.json({ error: 'No payout provider configured' }, { status: 400 })

      // Guard against double-submission: reject if this user already has a
      // payout in flight instead of letting two concurrent requests both
      // execute a real transfer.
      const { data: inFlight } = await supabase
        .from('payouts')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing'])
        .limit(1)
      if (inFlight && inFlight.length > 0) {
        return NextResponse.json({ error: 'A payout is already in progress. Please wait for it to complete.' }, { status: 409 })
      }

      // 1. Calculate available balance (7-day hold enforced)
      const { data: earnings } = await supabase
        .from('earnings')
        .select('id, amount, created_at, paid_out')
        .eq('user_id', user.id)
      const balance = calculateAvailableBalance(earnings || [])

      // 2. Validate payout amount
      const validation = validatePayoutRequest(amount, p, balance.available)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }

      // 3. ═══ OFAC SDN SCREENING (MANDATORY) ═══════════════════════
      const screening: ScreeningResult = await fullPayoutScreening({
        fullName: profile.display_name || user.email || '',
        countryCode: profile.country || 'US',
        amount,
      })

      // Create payout record (pending) — via admin client, see note above
      const { data: payout } = await admin.from('payouts').insert({
        user_id: user.id,
        amount,
        provider: p,
        status: 'pending',
      }).select().single()

      // Log screening result for audit trail
      if (payout) {
        await logScreeningResult(admin, user.id, payout.id, screening)
      }

      // BLOCKED — sanctions match
      if (screening.blocked) {
        if (payout) {
          await admin.from('payouts').update({
            status: 'failed',
          }).eq('id', payout.id)
        }
        return NextResponse.json({
          error: 'Payout blocked by compliance screening.',
          reason: screening.reason,
          screeningId: screening.screeningId,
          // Don't expose match details to user — security risk
        }, { status: 403 })
      }

      // MANUAL REVIEW REQUIRED — fuzzy match or enhanced country
      if (screening.requiresManualReview) {
        if (payout) {
          await admin.from('payouts').update({
            status: 'pending', // Stays pending until manual review
          }).eq('id', payout.id)
        }
        return NextResponse.json({
          ok: true,
          status: 'pending_review',
          message: 'Your payout is pending compliance review. This usually takes 1-2 business days.',
          screeningId: screening.screeningId,
        })
      }

      // CLEARED — proceed with payout
      if (payout) {
        await admin.from('payouts').update({ status: 'processing' }).eq('id', payout.id)
      }

      // Build account details for provider
      const acctDetails = {
        stripe_account_id: profile.stripe_account_id,
        paypal_email: account_details?.paypal_email || profile.payout_account_id,
        wallet_address: account_details?.wallet_address || profile.payout_account_id,
        payoneer_id: account_details?.payoneer_id || profile.payout_account_id,
        chipper_tag: account_details?.chipper_tag || profile.payout_account_id,
        phone_number: account_details?.phone_number,
        bank_details: account_details?.bank_details,
        currency: account_details?.currency || 'USD',
        country: profile.country,
        name: profile.display_name,
        chain: account_details?.chain || 'ETH',
        ...account_details,
      }

      // Execute payout — payout.id doubles as the idempotency key/reference
      // sent to the provider, so a retried request can't move money twice.
      if (!payout) return NextResponse.json({ error: 'Failed to create payout record' }, { status: 500 })
      const result = await executePayout(p, amount, acctDetails, payout.id)

      if (result.success) {
        // Mark payout as completed
        await admin.from('payouts').update({
          status: 'completed',
          transaction_id: result.transactionId,
          completed_at: new Date().toISOString(),
        }).eq('id', payout.id)

        // Mark earnings as paid out (oldest first, up to amount) — this
        // previously computed `remaining` but never persisted which
        // earnings were covered, so paid earnings kept counting toward
        // available balance indefinitely.
        let remaining = amount
        const unpaidEarnings = (earnings || [])
          .filter(e => !e.paid_out && new Date(e.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

        const paidEarningIds: string[] = []
        for (const earning of unpaidEarnings) {
          if (remaining <= 0) break
          paidEarningIds.push(earning.id)
          remaining -= earning.amount
        }
        if (paidEarningIds.length > 0) {
          await admin.from('earnings').update({
            paid_out: true,
            payout_id: payout.id,
            payout_at: new Date().toISOString(),
          }).in('id', paidEarningIds)
        }

        return NextResponse.json({
          ok: true,
          status: 'completed',
          transactionId: result.transactionId,
          amount,
          provider: p,
        })
      } else {
        // Payout failed
        if (payout) {
          await admin.from('payouts').update({ status: 'failed' }).eq('id', payout.id)
        }
        return NextResponse.json({
          error: 'Payout failed',
          reason: result.error,
        }, { status: 502 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    captureError(e, { route: '/api/payouts' })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
