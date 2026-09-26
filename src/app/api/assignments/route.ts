// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const mine = searchParams.get('mine')

  // Creator's queue of published, assignment-tagged reports awaiting an
  // accept/reject-for-payment decision. Only meaningful for funded
  // assignments — a $0 coverage request has nothing to accept.
  if (mine === 'review') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: myAssignments } = await supabase.from('assignments').select('id').eq('created_by', user.id).gt('assignment_fee_pool_usd', 0)
    const ids = (myAssignments || []).map(a => a.id)
    if (!ids.length) return NextResponse.json({ reports: [] })
    const { data } = await supabase.from('reports')
      .select('id, title, created_at, assignment_id, assignment_review_feedback, user:users(id, username, display_name), assignment:assignments(id, title, assignment_fee_per_report_usd)')
      .in('assignment_id', ids).eq('status', 'published').eq('assignment_accepted', false).is('assignment_review_feedback', null)
      .order('created_at', { ascending: false })
    return NextResponse.json({ reports: data })
  }

  // Reporter's own assignment-tagged reports and their status.
  if (mine === 'submissions') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data } = await supabase.from('reports')
      .select('id, title, created_at, assignment_accepted, assignment_fee_paid, assignment_review_feedback, assignment:assignments(id, title, assignment_fee_per_report_usd, assignment_fee_pool_usd)')
      .eq('user_id', user.id).not('assignment_id', 'is', null).eq('status', 'published')
      .order('created_at', { ascending: false })
    return NextResponse.json({ reports: data })
  }

  const urgency = searchParams.get('urgency')
  let q = supabase.from('assignments').select('*, creator:users!created_by(id, username, display_name, avatar_url, tier), angles:assignment_angles(id, title, report_count), contributors:assignment_contributors(id, user_id, reports_filed, total_earned, user:users(id, username, display_name, avatar_url, tier, credibility_score)), votes:assignment_votes(user_id)').eq('status', 'active').order('created_at', { ascending: false }).limit(30)
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
//
// A $0 pool is a separate, honest case: an unfunded "coverage request"
// that signals community interest in a topic rather than promising money.
// It skips Stripe entirely and is created immediately — the per-report
// rate is still recorded so it's ready to go the moment someone funds it
// (via /api/assignments/fund), but pay_assignment_fee() can never actually
// pay out against a $0 pool, so there's no way to fake a payout here.
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
  if (pool !== 0 && pool < perReport) return NextResponse.json({ error: `Leave the pool at $0 for an unfunded coverage request, or fund at least one report ($${perReport} minimum)` }, { status: 400 })

  if (pool === 0) {
    const admin = createAdminClient()
    const { data: assignment, error } = await admin.from('assignments').insert({
      created_by: user.id, title, description,
      urgency: body.urgency || 'medium',
      regions: body.regions || [],
      assignment_fee_pool_usd: 0,
      assignment_fee_per_report_usd: perReport,
      safety_notes: body.safety_notes || null,
      allows_anonymous: body.allows_anonymous || false,
      status: 'active',
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (body.angles?.length) await admin.from('assignment_angles').insert(body.angles.map((t: string) => ({ assignment_id: assignment.id, title: t })))
    await admin.from('assignment_contributors').insert({ assignment_id: assignment.id, user_id: user.id })
    return NextResponse.json(assignment, { status: 201 })
  }

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
