// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const urgency = searchParams.get('urgency')
  let q = supabase.from('assignments').select('*, creator:users!created_by(id, username, display_name, avatar_url, tier), angles:assignment_angles(id, title, report_count), contributors:assignment_contributors(id, user_id, reports_filed, total_earned, user:users(id, username, display_name, avatar_url, tier, credibility_score))').eq('status', 'active').order('created_at', { ascending: false }).limit(30)
  if (urgency && urgency !== 'all') q = q.eq('urgency', urgency)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignments: data })
}

// POST — creates a Stripe Checkout session for the assignment's initial fee
// pool instead of inserting the assignment directly. Previously anyone
// could type in "$50,000 pool" with zero money actually changing hands —
// reporters would join and file reports the trigger could never actually
// pay out. The assignment row only gets created once payment clears (see
// /api/webhooks/stripe-licensing, which now also handles this).
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description } = body
  if (!title || !description) return NextResponse.json({ error: 'Title and description required' }, { status: 400 })

  const perReport = Number(body.assignment_fee_per_report_usd || 10)
  const pool = Number(body.assignment_fee_pool_usd || 0)
  if (perReport < 5) return NextResponse.json({ error: 'Minimum per-report fee is $5' }, { status: 400 })
  if (pool < perReport) return NextResponse.json({ error: `Initial pool must cover at least one report ($${perReport} minimum)` }, { status: 400 })

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Payments are not configured yet' }, { status: 503 })
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `VozIt! assignment fee pool — ${title}`, description: `Funds ${Math.floor(pool / perReport)} report(s) at $${perReport} each` },
        unit_amount: Math.round(pool * 100),
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/assignments?paid=1`,
    cancel_url: `${appUrl}/assignments?canceled=1`,
    metadata: {
      purpose: 'assignment_creation',
      created_by: user.id,
      title, description,
      urgency: body.urgency || 'medium',
      regions: JSON.stringify(body.regions || []),
      assignment_fee_pool_usd: String(pool),
      assignment_fee_per_report_usd: String(perReport),
      safety_notes: body.safety_notes || '',
      allows_anonymous: body.allows_anonymous ? '1' : '',
      angles: JSON.stringify(body.angles || []),
    },
  })

  return NextResponse.json({ checkoutUrl: session.url })
}
export const dynamic = 'force-dynamic'
