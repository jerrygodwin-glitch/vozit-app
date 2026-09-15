// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { calculateTrendingScore, updateTrendingScores } from '@/lib/trending'
import { checkAndPromoteTier } from '@/lib/revenue'
import { rateLimit, RATE_LIMITS, sanitizeInput } from '@/lib/security'
import { moderateContent, logModerationResult } from '@/lib/hive-moderation'

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

    const limit = await rateLimit(`upload:${user.id}`, RATE_LIMITS.upload.max, RATE_LIMITS.upload.window, supabase)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'You are posting reports too quickly. Please wait before submitting another.' }, { status: 429 })
    }

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
      mux_upload_id: mux_upload_id || null,
      content_hash: content_hash || null,
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
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
