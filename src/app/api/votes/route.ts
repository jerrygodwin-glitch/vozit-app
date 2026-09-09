// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

// Tier-based vote weights
const VOTE_WEIGHT: Record<string, number> = {
  starter: 1,
  silver: 1.5,
  gold: 2,
  platinum: 3,
}

// Simple device fingerprint from headers
function getFingerprint(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  const ua = req.headers.get('user-agent') || ''
  const lang = req.headers.get('accept-language') || ''
  // Hash-like fingerprint from IP + UA + lang
  let hash = 0
  const str = `${ip}:${ua}:${lang}`
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0 }
  return `${ip}::${Math.abs(hash).toString(36)}`
}

// Sybil detection: check for suspicious voting patterns
async function detectSybil(supabase: any, reportId: string, fingerprint: string, userId: string): Promise<{ blocked: boolean; reason?: string }> {
  const ip = fingerprint.split('::')[0]

  // 1. Check if same fingerprint already voted on this report
  const { data: existing } = await supabase
    .from('votes')
    .select('id')
    .eq('report_id', reportId)
    .eq('device_fingerprint', fingerprint)
    .neq('user_id', userId)
    .limit(1)
  if (existing?.length) return { blocked: true, reason: 'duplicate_device' }

  // 2. Check if same IP has cast too many votes in last hour (rate limit)
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
  const { count } = await supabase
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', oneHourAgo)
  if ((count || 0) > 50) return { blocked: true, reason: 'rate_limit_ip' }

  // 3. Check if user has voted on too many reports in last 5 minutes (burst detection)
  const fiveMinAgo = new Date(Date.now() - 300000).toISOString()
  const { count: burstCount } = await supabase
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', fiveMinAgo)
  if ((burstCount || 0) > 20) return { blocked: true, reason: 'burst_voting' }

  return { blocked: false }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { report_id, value } = await req.json()
    if (!report_id || ![1, -1].includes(value)) {
      return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })
    }

    // Get voter's tier for vote weighting
    const { data: voter } = await supabase.from('users').select('tier').eq('id', user.id).single()
    const tier = voter?.tier || 'starter'
    const weight = VOTE_WEIGHT[tier] || 1

    // Sybil detection
    const fingerprint = getFingerprint(req)
    const ip = fingerprint.split('::')[0]
    const sybilCheck = await detectSybil(supabase, report_id, fingerprint, user.id)
    if (sybilCheck.blocked) {
      return NextResponse.json({ error: 'Vote blocked', reason: sybilCheck.reason }, { status: 429 })
    }

    // Check for existing vote by this user
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, value')
      .eq('report_id', report_id)
      .eq('user_id', user.id)
      .single()

    if (existingVote) {
      if (existingVote.value === value) {
        return NextResponse.json({ ok: true, message: 'Already voted' })
      }
      // Update vote direction
      await supabase.from('votes').update({
        value,
        weight,
        device_fingerprint: fingerprint,
        ip_address: ip,
      }).eq('id', existingVote.id)
    } else {
      // Insert new vote with weight + fingerprint
      await supabase.from('votes').insert({
        report_id,
        user_id: user.id,
        value,
        weight,
        device_fingerprint: fingerprint,
        ip_address: ip,
      })
    }

    // Update report vote counts using weighted values
    const { data: votes } = await supabase
      .from('votes')
      .select('value, weight')
      .eq('report_id', report_id)

    const upvotes = (votes || []).filter(v => v.value === 1).reduce((sum, v) => sum + (v.weight || 1), 0)
    const downvotes = (votes || []).filter(v => v.value === -1).reduce((sum, v) => sum + (v.weight || 1), 0)
    const total = upvotes + downvotes
    const credibility = total > 0 ? Math.round((upvotes / total) * 100) : 80

    await supabase.from('reports').update({
      upvotes: Math.round(upvotes),
      downvotes: Math.round(downvotes),
      credibility_pct: credibility,
    }).eq('id', report_id)

    // Update reporter's credibility score
    const { data: report } = await supabase.from('reports').select('user_id').eq('id', report_id).single()
    if (report?.user_id) {
      const { data: allReports } = await supabase
        .from('reports')
        .select('credibility_pct')
        .eq('user_id', report.user_id)
      if (allReports?.length) {
        const avgCred = Math.round(allReports.reduce((s, r) => s + r.credibility_pct, 0) / allReports.length)
        await supabase.from('users').update({ credibility_score: avgCred }).eq('id', report.user_id)
      }
    }

    return NextResponse.json({ ok: true, upvotes: Math.round(upvotes), downvotes: Math.round(downvotes), credibility })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
