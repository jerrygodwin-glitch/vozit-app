// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// POST /api/assignments/fund — anyone can add real money to an existing
// assignment's pool via Stripe, including turning a $0 "coverage request"
// into a funded one. The contribution is only recorded once payment
// actually clears (see /api/webhooks/stripe-licensing), which is what
// triggers the DB's update_assignment_pool() to add it to the pool.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assignment_id, amount_usd } = await req.json()
  const amount = Number(amount_usd)
  if (!assignment_id || !amount || amount < 5) return NextResponse.json({ error: 'assignment_id and a minimum $5 amount are required' }, { status: 400 })

  const { data: assignment } = await supabase.from('assignments').select('id, title, status').eq('id', assignment_id).single()
  if (!assignment || assignment.status !== 'active') return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

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
        product_data: { name: `VozIt! assignment funding — ${assignment.title}` },
        unit_amount: Math.round(amount * 100),
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/assignments?funded=1`,
    cancel_url: `${appUrl}/assignments?canceled=1`,
    metadata: {
      purpose: 'assignment_funding',
      assignment_id,
      funded_by: user.id,
      amount_usd: String(amount),
    },
  })

  return NextResponse.json({ checkoutUrl: session.url })
}
export const dynamic = 'force-dynamic'
