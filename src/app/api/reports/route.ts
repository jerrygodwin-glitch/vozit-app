// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { calculateTrendingScore, updateTrendingScores } from '@/lib/trending'
import { checkAndPromoteTier } from '@/lib/revenue'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const url = new URL(req.url)
    const region = url.searchParams.get('region')
    const sort = url.searchParams.get('sort') || 'recent' // recent | trending | top
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query = supabase
      .from('reports')
      .select('*, user:users(id, username, display_name, tier, credibility_score)')
      .eq('status', 'published')

    if (region) {
      query = query.ilike('location_name', `%${region}%`)
    }

    // Sort by trending score, recency, or total votes
    switch (sort) {
      case 'trending':
        query = query.order('trending_score', { ascending: false })
        break
      case 'top':
        query = query.order('upvotes', { ascending: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    if (error) throw error

    return NextResponse.json({ reports: data || [], total: count || 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { title, who, what, where_text, when_happened, why, location_name, location_lat, location_lng, mux_upload_id, content_hash } = body

    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

    // Check for duplicate content hash
    if (content_hash) {
      const { data: dup } = await supabase
        .from('reports')
        .select('id')
        .eq('content_hash', content_hash)
        .limit(1)
      if (dup?.length) {
        return NextResponse.json({ error: 'Duplicate content detected', existingId: dup[0].id }, { status: 409 })
      }
    }

    // Insert report
    const { data: report, error } = await supabase.from('reports').insert({
      user_id: user.id,
      title,
      who: who || null,
      what: what || null,
      where_text: where_text || null,
      when_happened: when_happened || null,
      why: why || null,
      location_name: location_name || null,
      location_lat: location_lat || null,
      location_lng: location_lng || null,
      mux_upload_id: mux_upload_id || null,
      content_hash: content_hash || null,
      status: 'published',
      upvotes: 0,
      downvotes: 0,
      credibility_pct: 80,
      trending_score: 100, // Initial boost for new reports
    }).select().single()

    if (error) throw error

    // Update reporter's report count
    await supabase.rpc('increment_report_count', { uid: user.id }).catch(() => {
      // Fallback if RPC not available
      supabase.from('users').update({
        report_count: supabase.rpc ? undefined : 1, // handled by trigger
      }).eq('id', user.id)
    })

    // Check for tier promotion
    const promotion = await checkAndPromoteTier(supabase, user.id)

    return NextResponse.json({
      ok: true,
      report,
      promotion: promotion.promoted ? {
        from: promotion.oldTier,
        to: promotion.newTier,
      } : null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
