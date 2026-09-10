// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { distributeToAll, type SocialAccount } from '@/lib/social-distribution'
import { aggregateSocialRevenue, calculateReporterSocialRevenue } from '@/lib/social-monetization'
import { getRevenueShare } from '@/lib/revenue'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const url = new URL(req.url)
    const reportId = url.searchParams.get('report_id')
    const { data: accounts } = await supabase.from('social_accounts').select('platform, account_id, username, connected').eq('user_id', user.id)
    let analytics = null
    if (reportId) {
      analytics = await aggregateSocialRevenue(supabase, reportId)
      const { data: profile } = await supabase.from('users').select('tier').eq('id', user.id).single()
      const tierShare = getRevenueShare(profile?.tier || 'starter')
      if (analytics.totalRevenue > 0) {
        const split = calculateReporterSocialRevenue(analytics.totalRevenue, tierShare)
        analytics = { ...analytics, reporterEarnings: split.reporterShare }
      }
    }
    return NextResponse.json({
      accounts: accounts || [],
      analytics,
      availablePlatforms: [
        { id: 'youtube', name: 'YouTube', icon: '📺', description: 'Upload as YouTube video. Monetize via AdSense.' },
        { id: 'tiktok', name: 'TikTok', icon: '🎵', description: 'Post as TikTok. Creator Fund eligible.' },
        { id: 'instagram', name: 'Instagram', icon: '📸', description: 'Post as Instagram Reel.' },
        { id: 'facebook', name: 'Facebook', icon: '👤', description: 'Post to Facebook Page/Profile.' },
        { id: 'x', name: 'X (Twitter)', icon: '𝕏', description: 'Tweet with video. Revenue sharing eligible.' },
      ],
    })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { action } = body

    if (action === 'connect') {
      const { platform, access_token, refresh_token, account_id, username, expires_at } = body
      await supabase.from('social_accounts').upsert({ user_id: user.id, platform, account_id: account_id || '', access_token, refresh_token: refresh_token || null, token_expires_at: expires_at || null, username: username || null, connected: true }, { onConflict: 'user_id,platform' })
      return NextResponse.json({ ok: true, platform, connected: true })
    }

    if (action === 'disconnect') {
      await supabase.from('social_accounts').update({ connected: false, access_token: null }).eq('user_id', user.id).eq('platform', body.platform)
      return NextResponse.json({ ok: true, disconnected: body.platform })
    }

    if (action === 'distribute') {
      const { report_id, platforms } = body
      if (!report_id) return NextResponse.json({ error: 'report_id required' }, { status: 400 })
      const { data: report } = await supabase.from('reports').select('title, what, playback_id, location_lat, location_lng, location_name').eq('id', report_id).eq('user_id', user.id).single()
      if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      if (!report.playback_id) return NextResponse.json({ error: 'Video not ready' }, { status: 400 })
      let query = supabase.from('social_accounts').select('*').eq('user_id', user.id).eq('connected', true)
      if (platforms?.length) query = query.in('platform', platforms)
      const { data: accounts } = await query
      if (!accounts?.length) return NextResponse.json({ error: 'No connected social accounts' }, { status: 400 })
      const videoUrl = `https://stream.mux.com/${report.playback_id}/high.mp4`
      const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vozit.app'}/report/${report_id}`
      const results = await distributeToAll({ reportId: report_id, title: report.title, description: report.what || report.title, videoUrl, reportUrl, tags: ['citizenjournalism', 'IWasThere', 'VozIt', report.location_name || ''].filter(Boolean), location: report.location_lat ? { lat: report.location_lat, lng: report.location_lng } : undefined, accounts: accounts as SocialAccount[] })
      for (const result of results) { await supabase.from('social_distributions').insert({ report_id, user_id: user.id, platform: result.platform, post_id: result.postId, post_url: result.postUrl, success: result.success, error: result.error, distributed_at: result.distributedAt }) }
      const successCount = results.filter(r => r.success).length
      return NextResponse.json({ ok: true, distributed: successCount, failed: results.filter(r => !r.success).length, results })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
export const dynamic = 'force-dynamic'
