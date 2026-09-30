// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

const CATEGORIES = ['confirms_location', 'contradicts', 'nearby_witness', 'additional_context']
const MIN_LENGTH = 30
const MIN_ACCOUNT_AGE_DAYS = 7

// GET /api/fact-checks?report_id=X — every note on a report, split into
// visible (sorted by helpfulness) and hidden (enough ratings, mostly
// "not helpful") — the community's own filter, not a moderator's.
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const reportId = new URL(req.url).searchParams.get('report_id')
  if (!reportId) return NextResponse.json({ error: 'report_id required' }, { status: 400 })

  const { data: { user } } = await supabase.auth.getUser()

  const { data: notes } = await supabase
    .from('fact_checks')
    .select('*, user:users(id, username, display_name, tier)')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false })

  let myRatings: Record<string, boolean> = {}
  if (user && notes?.length) {
    const { data: ratings } = await supabase
      .from('fact_check_ratings')
      .select('fact_check_id, helpful')
      .eq('user_id', user.id)
      .in('fact_check_id', notes.map(n => n.id))
    myRatings = Object.fromEntries((ratings || []).map(r => [r.fact_check_id, r.helpful]))
  }

  const withScore = (notes || []).map(n => ({
    ...n,
    score: n.helpful_count - n.not_helpful_count,
    total_ratings: n.helpful_count + n.not_helpful_count,
    my_rating: myRatings[n.id] ?? null,
  }))

  // Hidden once there's enough signal (5+ ratings) AND it's mostly
  // negative — protects brand-new notes from being hidden before they've
  // had a chance to collect any ratings at all.
  const visible = withScore.filter(n => !(n.total_ratings >= 5 && n.helpful_count / n.total_ratings < 0.4))
  const hidden = withScore.filter(n => n.total_ratings >= 5 && n.helpful_count / n.total_ratings < 0.4)

  visible.sort((a, b) => b.score - a.score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ visible, hidden, hiddenCount: hidden.length })
}

// POST /api/fact-checks — add a fact-check note. Structured (category +
// substantiation), never an open box — the category picker comes first,
// so there's nowhere for a one-word reaction to go.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { report_id, category, content } = await req.json()
  if (!report_id) return NextResponse.json({ error: 'report_id required' }, { status: 400 })
  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: `category must be one of: ${CATEGORIES.join(', ')}` }, { status: 400 })
  if (!content || content.trim().length < MIN_LENGTH) {
    return NextResponse.json({ error: `Please write at least ${MIN_LENGTH} characters explaining your fact-check.` }, { status: 400 })
  }

  const admin = createAdminClient()

  // Account tenure gate — same trust principle as vote-weighting: a
  // day-old account's fact-check is worth less scrutiny-wise than an
  // established reporter's.
  const { data: profile } = await admin.from('users').select('created_at').eq('id', user.id).single()
  const accountAgeDays = profile ? (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24) : 0
  if (accountAgeDays < MIN_ACCOUNT_AGE_DAYS) {
    return NextResponse.json({
      error: `Fact-checks require an account at least ${MIN_ACCOUNT_AGE_DAYS} days old — yours is ${Math.floor(accountAgeDays)} day(s) old. This helps keep fact-checks credible.`,
    }, { status: 403 })
  }

  const { data: note, error } = await admin.from('fact_checks').insert({
    report_id, user_id: user.id, category, content: content.trim(),
  }).select('*, user:users(id, username, display_name, tier)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, note: { ...note, score: 0, total_ratings: 0, my_rating: null } })
}
export const dynamic = 'force-dynamic'
