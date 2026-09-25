// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getAuthedUser } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { calculateTrendingScore, updateTrendingScores } from '@/lib/trending'
import { checkAndPromoteTier } from '@/lib/revenue'
import { rateLimit, RATE_LIMITS, sanitizeInput } from '@/lib/security'
import { moderateContent, logModerationResult } from '@/lib/hive-moderation'
import { captureError } from '@/lib/monitoring'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const url = new URL(req.url)
    const region = url.searchParams.get('region')
    const category = url.searchParams.get('category')
    const sort = url.searchParams.get('sort') || 'recent' // recent | trending | top | credible
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Strip characters that would break PostgREST's .or() filter syntax
    // (commas/parens are filter-string delimiters, not literal search text)
    const qRaw = url.searchParams.get('q')
    const q = qRaw ? qRaw.replace(/[,()]/g, '').trim().slice(0, 100) : ''

    let query = supabase
      .from('reports')
      .select('*, user:users(id, username, display_name, tier, credibility_score)')
      .eq('status', 'published')

    if (region) {
      query = query.ilike('location_name', `%${region}%`)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (q) {
      query = query.or(`title.ilike.%${q}%,who.ilike.%${q}%,what.ilike.%${q}%,why.ilike.%${q}%,location_name.ilike.%${q}%`)
    }

    // Sort by trending score, recency, votes, or credibility
    switch (sort) {
      case 'trending':
        query = query.order('trending_score', { ascending: false })
        break
      case 'top':
        query = query.order('upvotes', { ascending: false })
        break
      case 'credible':
        query = query.order('credibility_pct', { ascending: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    if (error) throw error

    return NextResponse.json({ reports: data || [], total: count || 0 })
  } catch (e: any) {
    captureError(e, { route: 'GET /api/reports' })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthedUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limit = await rateLimit(`upload:${user.id}`, RATE_LIMITS.upload.max, RATE_LIMITS.upload.window, supabase)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'You are posting reports too quickly. Please wait before submitting another.' }, { status: 429 })
    }

    const body = await req.json()
    const { title, who, what, where_text, when_happened, why, location_name, location_lat, location_lng, mux_upload_id, content_hash, update_to_report_id, category } = body

    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

    const CATEGORIES = ['justice', 'politics', 'economy', 'environment', 'crisis', 'entertainment', 'sports', 'other']
    const categoryClean = CATEGORIES.includes(category) ? category : 'other'

    // Posting an update to an earlier report — link them via series_id/series_part
    // so the feed and report page can show them as one unfolding story instead of
    // disconnected posts.
    let seriesId: string | null = null
    let seriesPart = 1
    if (update_to_report_id) {
      const { data: parent } = await supabase
        .from('reports')
        .select('id, user_id, series_id, series_part')
        .eq('id', update_to_report_id)
        .single()

      if (!parent || parent.user_id !== user.id) {
        return NextResponse.json({ error: 'You can only post updates to your own reports.' }, { status: 403 })
      }

      if (parent.series_id) {
        seriesId = parent.series_id
        const { data: latest } = await supabase
          .from('reports')
          .select('series_part')
          .eq('series_id', parent.series_id)
          .order('series_part', { ascending: false })
          .limit(1)
          .single()
        seriesPart = (latest?.series_part || parent.series_part || 1) + 1
      } else {
        // First update to this report — retroactively start a series with the original as part 1
        seriesId = crypto.randomUUID()
        seriesPart = 2
        await supabase.from('reports').update({ series_id: seriesId, series_part: 1 }).eq('id', parent.id)
      }
    }

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

    const titleClean = sanitizeInput(title, 200)
    const whoClean = who ? sanitizeInput(who, 2000) : null
    const whatClean = what ? sanitizeInput(what, 2000) : null
    const whereTextClean = where_text ? sanitizeInput(where_text, 500) : null
    const whyClean = why ? sanitizeInput(why, 2000) : null
    const locationNameClean = location_name ? sanitizeInput(location_name, 200) : null

    // Pre-publish text moderation — the video itself is scanned separately once
    // Mux finishes processing it (see /api/mux-webhook). This catches abusive
    // titles/descriptions before they ever reach the public feed.
    const textModeration = await moderateContent({ title: titleClean, who: whoClean, what: whatClean, why: whyClean })
    let status: 'published' | 'flagged' | 'removed' = 'published'
    if (textModeration.autoAction === 'auto_remove' || textModeration.autoAction === 'auto_ban') {
      status = 'removed'
    } else if (textModeration.autoAction === 'flag_review') {
      status = 'flagged'
    }

    // Insert report
    const { data: report, error } = await supabase.from('reports').insert({
      user_id: user.id,
      title: titleClean,
      who: whoClean,
      what: whatClean,
      where_text: whereTextClean,
      when_happened: when_happened || null,
      why: whyClean,
      location_name: locationNameClean,
      location_lat: location_lat || null,
      location_lng: location_lng || null,
      category: categoryClean,
      mux_upload_id: mux_upload_id || null,
      content_hash: content_hash || null,
      series_id: seriesId,
      series_part: seriesPart,
      status,
      upvotes: 0,
      downvotes: 0,
      credibility_pct: 80,
      trending_score: status === 'published' ? 100 : 0, // Initial boost for new published reports
    }).select().single()

    if (error) throw error

    await logModerationResult(supabase, report.id, textModeration)

    if (textModeration.autoAction === 'auto_ban') {
      await supabase.from('users').update({
        is_banned: true,
        ban_reason: `Auto-banned: ${textModeration.flags.map(f => f.category).join(', ')}`,
      }).eq('id', user.id)
    }

    // report_count is incremented automatically by the trg_increment_report_count
    // DB trigger on INSERT — do not also increment it here, or tier promotion
    // (which reads report_count) will fire at half the intended report count.

    // Check for tier promotion
    const promotion = status === 'published' ? await checkAndPromoteTier(supabase, user.id) : { promoted: false }

    return NextResponse.json({
      ok: true,
      report,
      moderation: status !== 'published' ? { status, flags: textModeration.flags.map(f => f.category) } : null,
      promotion: promotion.promoted ? {
        from: promotion.oldTier,
        to: promotion.newTier,
      } : null,
    })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/reports' })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
