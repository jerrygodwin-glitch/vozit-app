// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const mine = new URL(req.url).searchParams.get('mine')

  if (mine === 'claimed') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Includes 'submitted' (awaiting the creator's review) so a reporter
    // can see that state, and a rejected submission naturally reappears
    // here too since review sends it back to 'claimed' with feedback.
    const { data } = await supabase.from('tasks').select('*').eq('claimed_by', user.id).in('status', ['claimed', 'submitted']).order('created_at', { ascending: false })
    return NextResponse.json({ tasks: data })
  }

  if (mine === 'review') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data } = await supabase.from('tasks').select('*, claimer:users!claimed_by(id, username, display_name)').eq('created_by', user.id).eq('status', 'submitted').order('created_at', { ascending: false })
    return NextResponse.json({ tasks: data })
  }

  const { data } = await supabase.from('tasks').select('*, creator:users!created_by(id, username, display_name)').eq('status', 'open').order('created_at', { ascending: false }).limit(30)
  return NextResponse.json({ tasks: data })
}

// POST — creates a Stripe Checkout session for the reward instead of
// inserting the task directly. Previously anyone could type in "$500
// reward" with zero money actually changing hands — a reporter could claim
// and complete a task that was never funded. The task row itself only
// gets created once payment actually clears (see
// /api/webhooks/stripe-licensing, which now also handles this).
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, location_name, reward_usd, deadline } = body
  if (!title || !location_name || !reward_usd || !deadline) {
    return NextResponse.json({ error: 'title, location_name, reward_usd, and deadline are required' }, { status: 400 })
  }
  if (Number(reward_usd) < 5) return NextResponse.json({ error: 'Minimum reward is $5' }, { status: 400 })

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
        product_data: { name: `VozIt! task reward — ${title}`, description: location_name },
        unit_amount: Math.round(Number(reward_usd) * 100),
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/tasks?paid=1`,
    cancel_url: `${appUrl}/tasks?canceled=1`,
    metadata: {
      purpose: 'task_creation',
      created_by: user.id,
      title, description: description || '', location_name,
      reward_usd: String(reward_usd), deadline,
    },
  })

  return NextResponse.json({ checkoutUrl: session.url })
}
export const dynamic = 'force-dynamic'
