// @ts-nocheck
// Social Media Distribution & Monetization Engine
// Cross-posts VozIt reports to social platforms via their APIs
// Tracks views, engagement, and revenue attribution per platform

export type SocialPlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x'

export interface SocialAccount {
  platform: SocialPlatform
  accountId: string
  accessToken: string
  refreshToken?: string
  tokenExpiresAt?: string
  username?: string
  connected: boolean
}

export interface DistributionResult {
  platform: SocialPlatform
  success: boolean
  postId?: string
  postUrl?: string
  error?: string
  distributedAt: string
}

export interface SocialRevenue {
  platform: SocialPlatform
  reportId: string
  views: number
  engagement: number // likes + comments + shares
  estimatedRevenue: number
  currency: string
  periodStart: string
  periodEnd: string
}

// ── YOUTUBE ──────────────────────────────────────────────────────────
// Upload via YouTube Data API v3
export async function postToYouTube(params: {
  accessToken: string
  title: string
  description: string
  videoUrl: string // Mux download URL
  tags: string[]
  location?: { lat: number; lng: number }
}): Promise<DistributionResult> {
  try {
    // 1. Download video from Mux
    const videoRes = await fetch(params.videoUrl)
    if (!videoRes.ok) throw new Error('Failed to download video from Mux')
    const videoBlob = await videoRes.blob()

    // 2. Initialize resumable upload
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status,recordingDetails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/mp4',
          'X-Upload-Content-Length': String(videoBlob.size),
        },
        body: JSON.stringify({
          snippet: {
            title: `[VozIt] ${params.title}`,
            description: `${params.description}\n\n---\nReported via VozIt — Citizen Journalism\nhttps://vozit.app`,
            tags: ['VozIt', 'citizen journalism', 'eyewitness', ...params.tags],
            categoryId: '25', // News & Politics
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
            license: 'creativeCommon',
          },
          ...(params.location ? {
            recordingDetails: {
              location: {
                latitude: params.location.lat,
                longitude: params.location.lng,
              },
            },
          } : {}),
        }),
      }
    )

    if (!initRes.ok) throw new Error(`YouTube init failed: ${initRes.status}`)
    const uploadUrl = initRes.headers.get('Location')
    if (!uploadUrl) throw new Error('No upload URL returned')

    // 3. Upload video bytes
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: videoBlob,
    })

    const data = await uploadRes.json()
    return {
      platform: 'youtube',
      success: true,
      postId: data.id,
      postUrl: `https://youtube.com/watch?v=${data.id}`,
      distributedAt: new Date().toISOString(),
    }
  } catch (e: any) {
    return { platform: 'youtube', success: false, error: e.message, distributedAt: new Date().toISOString() }
  }
}

// ── TIKTOK ───────────────────────────────────────────────────────────
// Post via TikTok Content Posting API
export async function postToTikTok(params: {
  accessToken: string
  title: string
  videoUrl: string
}): Promise<DistributionResult> {
  try {
    // 1. Initialize upload
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: params.title.slice(0, 150),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
          brand_content_toggle: false,
          brand_organic_toggle: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: params.videoUrl,
        },
      }),
    })

    const data = await initRes.json()
    if (data.error?.code) throw new Error(data.error.message)

    return {
      platform: 'tiktok',
      success: true,
      postId: data.data?.publish_id,
      distributedAt: new Date().toISOString(),
    }
  } catch (e: any) {
    return { platform: 'tiktok', success: false, error: e.message, distributedAt: new Date().toISOString() }
  }
}

// ── INSTAGRAM ────────────────────────────────────────────────────────
// Post via Instagram Graph API (Reels for video)
export async function postToInstagram(params: {
  accessToken: string
  igUserId: string
  caption: string
  videoUrl: string
  location?: { lat: number; lng: number }
}): Promise<DistributionResult> {
  try {
    // 1. Create media container (Reels)
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${params.igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: params.videoUrl,
          caption: `${params.caption}\n\n📹 Reported via @vozit_app #citizenjournalism #IWasThere`,
          access_token: params.accessToken,
          share_to_feed: true,
        }),
      }
    )
    const container = await containerRes.json()
    if (container.error) throw new Error(container.error.message)

    // 2. Wait for processing then publish
    // In production, poll status endpoint until FINISHED
    await new Promise(resolve => setTimeout(resolve, 10000))

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${params.igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: params.accessToken,
        }),
      }
    )
    const published = await publishRes.json()

    return {
      platform: 'instagram',
      success: true,
      postId: published.id,
      postUrl: `https://instagram.com/reel/${published.id}`,
      distributedAt: new Date().toISOString(),
    }
  } catch (e: any) {
    return { platform: 'instagram', success: false, error: e.message, distributedAt: new Date().toISOString() }
  }
}

// ── FACEBOOK ─────────────────────────────────────────────────────────
// Post via Facebook Graph API (Page or Profile video)
export async function postToFacebook(params: {
  accessToken: string
  pageId: string
  title: string
  description: string
  videoUrl: string
}): Promise<DistributionResult> {
  try {
    const res = await fetch(
      `https://graph-video.facebook.com/v19.0/${params.pageId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: params.videoUrl,
          title: params.title,
          description: `${params.description}\n\n📹 Reported via VozIt — Citizen Journalism`,
          access_token: params.accessToken,
        }),
      }
    )
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    return {
      platform: 'facebook',
      success: true,
      postId: data.id,
      postUrl: `https://facebook.com/${data.id}`,
      distributedAt: new Date().toISOString(),
    }
  } catch (e: any) {
    return { platform: 'facebook', success: false, error: e.message, distributedAt: new Date().toISOString() }
  }
}

// ── X (TWITTER) ──────────────────────────────────────────────────────
// Post via X API v2 (media upload + tweet)
export async function postToX(params: {
  accessToken: string
  text: string
  videoUrl: string
  reportUrl: string
}): Promise<DistributionResult> {
  try {
    // 1. Upload media via X media upload endpoint
    const mediaRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${params.accessToken}` },
      body: new URLSearchParams({
        command: 'INIT',
        media_type: 'video/mp4',
        media_category: 'tweet_video',
      }),
    })
    const media = await mediaRes.json()

    // 2. Create tweet with media
    const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `${params.text}\n\n📹 via @VozItApp ${params.reportUrl}`,
        media: media.media_id_string ? { media_ids: [media.media_id_string] } : undefined,
      }),
    })
    const tweet = await tweetRes.json()

    return {
      platform: 'x',
      success: true,
      postId: tweet.data?.id,
      postUrl: `https://x.com/i/status/${tweet.data?.id}`,
      distributedAt: new Date().toISOString(),
    }
  } catch (e: any) {
    return { platform: 'x', success: false, error: e.message, distributedAt: new Date().toISOString() }
  }
}

// ── DISTRIBUTE TO ALL CONNECTED PLATFORMS ────────────────────────────
export async function distributeToAll(params: {
  reportId: string
  title: string
  description: string
  videoUrl: string // Mux high-quality download URL
  reportUrl: string
  tags: string[]
  location?: { lat: number; lng: number }
  accounts: SocialAccount[]
}): Promise<DistributionResult[]> {
  const results: DistributionResult[] = []

  for (const account of params.accounts) {
    if (!account.connected || !account.accessToken) continue

    let result: DistributionResult

    switch (account.platform) {
      case 'youtube':
        result = await postToYouTube({
          accessToken: account.accessToken,
          title: params.title,
          description: params.description,
          videoUrl: params.videoUrl,
          tags: params.tags,
          location: params.location,
        })
        break
      case 'tiktok':
        result = await postToTikTok({
          accessToken: account.accessToken,
          title: params.title,
          videoUrl: params.videoUrl,
        })
        break
      case 'instagram':
        result = await postToInstagram({
          accessToken: account.accessToken,
          igUserId: account.accountId,
          caption: params.title,
          videoUrl: params.videoUrl,
          location: params.location,
        })
        break
      case 'facebook':
        result = await postToFacebook({
          accessToken: account.accessToken,
          pageId: account.accountId,
          title: params.title,
          description: params.description,
          videoUrl: params.videoUrl,
        })
        break
      case 'x':
        result = await postToX({
          accessToken: account.accessToken,
          text: params.title,
          videoUrl: params.videoUrl,
          reportUrl: params.reportUrl,
        })
        break
      default:
        continue
    }

    results.push(result)
  }

  return results
}
