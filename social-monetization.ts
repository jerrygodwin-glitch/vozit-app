// @ts-nocheck
// Social Media Monetization & Revenue Attribution
// Tracks views, engagement, and estimated revenue from each platform
// Attributes social revenue back to reporters' earnings

export type SocialPlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x' | 'embed'

// Estimated CPM (cost per 1000 views) by platform
// These are configurable — actual rates vary by region and content
const PLATFORM_CPM: Record<SocialPlatform, number> = {
  youtube: 4.00,    // YouTube AdSense avg CPM
  tiktok: 0.50,     // TikTok Creator Fund
  instagram: 2.00,  // Instagram Reels bonus
  facebook: 2.50,   // Facebook in-stream ads
  x: 1.00,          // X revenue sharing
  embed: 3.00,      // Licensed embeds on news sites
}

// VozIt's share of social revenue before reporter split
const VOZIT_PLATFORM_SHARE = 0.30 // VozIt takes 30%, reporter gets their tier % of the rest

export interface SocialAnalytics {
  platform: SocialPlatform
  postId: string
  views: number
  likes: number
  comments: number
  shares: number
  watchTimeSeconds: number
  estimatedRevenue: number
  fetchedAt: string
}

// ── YOUTUBE ANALYTICS ────────────────────────────────────────────────
export async function fetchYouTubeAnalytics(params: {
  accessToken: string
  videoId: string
}): Promise<SocialAnalytics> {
  try {
    const res = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?` +
      `ids=channel==MINE&startDate=2020-01-01&endDate=2099-12-31&` +
      `metrics=views,likes,comments,shares,estimatedRevenue,estimatedMinutesWatched&` +
      `filters=video==${params.videoId}&dimensions=video`, {
        headers: { 'Authorization': `Bearer ${params.accessToken}` },
      }
    )
    const data = await res.json()
    const row = data.rows?.[0] || [0, 0, 0, 0, 0, 0]

    return {
      platform: 'youtube',
      postId: params.videoId,
      views: row[0] || 0,
      likes: row[1] || 0,
      comments: row[2] || 0,
      shares: row[3] || 0,
      estimatedRevenue: row[4] || 0,
      watchTimeSeconds: (row[5] || 0) * 60,
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    return emptyAnalytics('youtube', params.videoId)
  }
}

// ── TIKTOK ANALYTICS ─────────────────────────────────────────────────
export async function fetchTikTokAnalytics(params: {
  accessToken: string
  videoId: string
}): Promise<SocialAnalytics> {
  try {
    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters: { video_ids: [params.videoId] } }),
      }
    )
    const data = await res.json()
    const video = data.data?.videos?.[0] || {}

    const views = video.view_count || 0
    return {
      platform: 'tiktok',
      postId: params.videoId,
      views,
      likes: video.like_count || 0,
      comments: video.comment_count || 0,
      shares: video.share_count || 0,
      watchTimeSeconds: 0,
      estimatedRevenue: (views / 1000) * PLATFORM_CPM.tiktok,
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    return emptyAnalytics('tiktok', params.videoId)
  }
}

// ── INSTAGRAM ANALYTICS ──────────────────────────────────────────────
export async function fetchInstagramAnalytics(params: {
  accessToken: string
  mediaId: string
}): Promise<SocialAnalytics> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${params.mediaId}/insights?` +
      `metric=plays,likes,comments,shares,total_interactions&access_token=${params.accessToken}`
    )
    const data = await res.json()
    const metrics = data.data || []
    const get = (name: string) => metrics.find((m: any) => m.name === name)?.values?.[0]?.value || 0

    const views = get('plays')
    return {
      platform: 'instagram',
      postId: params.mediaId,
      views,
      likes: get('likes'),
      comments: get('comments'),
      shares: get('shares'),
      watchTimeSeconds: 0,
      estimatedRevenue: (views / 1000) * PLATFORM_CPM.instagram,
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    return emptyAnalytics('instagram', params.mediaId)
  }
}

// ── FACEBOOK ANALYTICS ───────────────────────────────────────────────
export async function fetchFacebookAnalytics(params: {
  accessToken: string
  videoId: string
}): Promise<SocialAnalytics> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${params.videoId}?` +
      `fields=views,likes.limit(0).summary(true),comments.limit(0).summary(true),shares&` +
      `access_token=${params.accessToken}`
    )
    const data = await res.json()
    const views = data.views || 0

    return {
      platform: 'facebook',
      postId: params.videoId,
      views,
      likes: data.likes?.summary?.total_count || 0,
      comments: data.comments?.summary?.total_count || 0,
      shares: data.shares?.count || 0,
      watchTimeSeconds: 0,
      estimatedRevenue: (views / 1000) * PLATFORM_CPM.facebook,
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    return emptyAnalytics('facebook', params.videoId)
  }
}

// ── EMBED TRACKING ───────────────────────────────────────────────────
// Track when VozIt content is embedded on external news sites
export function calculateEmbedRevenue(embedViews: number, isLicensed: boolean): number {
  if (isLicensed) {
    // Licensed embeds — negotiated rate per view
    return (embedViews / 1000) * PLATFORM_CPM.embed * 2 // Premium for licensed
  }
  // Organic embeds — standard CPM
  return (embedViews / 1000) * PLATFORM_CPM.embed
}

// ── REVENUE ATTRIBUTION ──────────────────────────────────────────────
// Calculate how much of social revenue goes to the reporter
export function calculateReporterSocialRevenue(
  grossRevenue: number,
  reporterTierShare: number, // e.g. 0.45 for starter, 0.70 for platinum
): { reporterShare: number; platformShare: number; vozitShare: number } {
  const afterPlatform = grossRevenue // Platform already took their cut
  const vozitCut = afterPlatform * VOZIT_PLATFORM_SHARE
  const reporterPool = afterPlatform - vozitCut
  const reporterShare = reporterPool * reporterTierShare

  return {
    reporterShare: Math.round(reporterShare * 100) / 100,
    platformShare: 0, // Already deducted by platform
    vozitShare: Math.round(vozitCut * 100) / 100,
  }
}

// ── AGGREGATE ALL SOCIAL REVENUE FOR A REPORT ────────────────────────
export async function aggregateSocialRevenue(
  supabase: any,
  reportId: string,
): Promise<{
  totalViews: number
  totalEngagement: number
  totalRevenue: number
  byPlatform: SocialAnalytics[]
}> {
  const { data: distributions } = await supabase
    .from('social_distributions')
    .select('platform, post_id, access_token')
    .eq('report_id', reportId)
    .eq('success', true)

  if (!distributions?.length) {
    return { totalViews: 0, totalEngagement: 0, totalRevenue: 0, byPlatform: [] }
  }

  const byPlatform: SocialAnalytics[] = []

  for (const dist of distributions) {
    let analytics: SocialAnalytics

    switch (dist.platform) {
      case 'youtube':
        analytics = await fetchYouTubeAnalytics({ accessToken: dist.access_token, videoId: dist.post_id })
        break
      case 'tiktok':
        analytics = await fetchTikTokAnalytics({ accessToken: dist.access_token, videoId: dist.post_id })
        break
      case 'instagram':
        analytics = await fetchInstagramAnalytics({ accessToken: dist.access_token, mediaId: dist.post_id })
        break
      case 'facebook':
        analytics = await fetchFacebookAnalytics({ accessToken: dist.access_token, videoId: dist.post_id })
        break
      default:
        continue
    }

    byPlatform.push(analytics)

    // Store latest analytics
    await supabase.from('social_analytics').upsert({
      report_id: reportId,
      platform: dist.platform,
      post_id: dist.post_id,
      views: analytics.views,
      likes: analytics.likes,
      comments: analytics.comments,
      shares: analytics.shares,
      estimated_revenue: analytics.estimatedRevenue,
      fetched_at: analytics.fetchedAt,
    }, { onConflict: 'report_id,platform' })
  }

  return {
    totalViews: byPlatform.reduce((s, a) => s + a.views, 0),
    totalEngagement: byPlatform.reduce((s, a) => s + a.likes + a.comments + a.shares, 0),
    totalRevenue: byPlatform.reduce((s, a) => s + a.estimatedRevenue, 0),
    byPlatform,
  }
}

function emptyAnalytics(platform: SocialPlatform, postId: string): SocialAnalytics {
  return { platform, postId, views: 0, likes: 0, comments: 0, shares: 0, watchTimeSeconds: 0, estimatedRevenue: 0, fetchedAt: new Date().toISOString() }
}
