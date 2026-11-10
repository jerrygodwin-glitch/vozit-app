// @ts-nocheck
// Social Media Distribution & Monetization Engine
// Cross-posts VozIt reports to social platforms via their APIs
// Tracks views, engagement, and revenue attribution per platform

import crypto from 'crypto'

export type SocialPlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x'

export interface SocialAccount {
  platform: SocialPlatform
  accountId: string
  // X-specific: its media-upload endpoint requires OAuth 1.0a signing
  // (see buildOAuth1Header below), not the single bearer-token model the
  // other platforms use — these are only populated/used for platform: 'x'.
  consumerKey?: string
  consumerSecret?: string
  accessTokenSecret?: string
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
  reportUrl: string
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
            // Previously linked to the generic vozit.net homepage — a
            // viewer who clicked through had to go hunting for the exact
            // report they just watched. Links straight to it instead.
            description: `${params.description}\n\n---\nFull report: ${params.reportUrl}\nReported via VozIt — Citizen Journalism`,
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
  reportUrl: string
}): Promise<DistributionResult> {
  try {
    // TikTok captions aren't clickable text (the real click-through paths
    // are the account's one bio link, or a link sticker placed on the
    // video — neither controlled from here), but including the URL still
    // gives viewers something to copy, and it's one more place the real
    // destination is visible.
    const caption = `${params.title}\n\n${params.reportUrl}`

    // Unaudited apps are restricted to private (SELF_ONLY) posts regardless
    // of what privacy_level is requested, and the exact set of allowed
    // levels can vary by account — querying creator_info first avoids
    // hardcoding a level TikTok will reject.
    const creatorRes = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
    })
    const creatorData = await creatorRes.json()
    if (creatorData.error?.code && creatorData.error.code !== 'ok') throw new Error(creatorData.error.message)
    const availableLevels: string[] = creatorData.data?.privacy_level_options || []
    const privacyLevel = availableLevels.includes('PUBLIC_TO_EVERYONE')
      ? 'PUBLIC_TO_EVERYONE'
      : (availableLevels[0] || 'SELF_ONLY')

    // The finished watermarked video lives on Supabase's storage domain,
    // not one VozIt has verified ownership of with TikTok, so "pull by
    // URL" isn't usable — uploading the bytes directly sidesteps domain
    // verification entirely (same approach as postToX below).
    const videoRes = await fetch(params.videoUrl)
    if (!videoRes.ok) throw new Error(`Could not download video: ${videoRes.status}`)
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
    const videoSize = videoBuffer.length

    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150),
          privacy_level: privacyLevel,
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
          brand_content_toggle: false,
          brand_organic_toggle: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoSize,
          chunk_size: videoSize,
          total_chunk_count: 1,
        },
      }),
    })
    const initData = await initRes.json()
    if (initData.error?.code && initData.error.code !== 'ok') throw new Error(initData.error.message)

    const publishId = initData.data?.publish_id
    const uploadUrl = initData.data?.upload_url
    if (!uploadUrl) throw new Error('TikTok did not return an upload URL')

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
      },
      body: videoBuffer,
    })
    if (!uploadRes.ok) throw new Error(`TikTok upload failed: ${uploadRes.status}`)

    return {
      platform: 'tiktok',
      success: true,
      postId: publishId,
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
  reportUrl: string
  location?: { lat: number; lng: number }
}): Promise<DistributionResult> {
  try {
    // 1. Create media container (Reels)
    // Instagram captions aren't clickable text either (same story as
    // TikTok — the real paths are the bio link or a link sticker on the
    // video), but the caption previously had no URL at all, not even as
    // a reference. Fixed.
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${params.igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: params.videoUrl,
          caption: `${params.caption}\n\n📹 Full report: ${params.reportUrl}\nReported via @vozit_app #citizenjournalism #IWasThere`,
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
  reportUrl: string
}): Promise<DistributionResult> {
  try {
    // Facebook post descriptions render URLs as real clickable links
    // (unlike Instagram/TikTok captions) — this previously had no link
    // at all, so it was the one platform where a link WOULD have worked
    // but simply wasn't included.
    const res = await fetch(
      `https://graph-video.facebook.com/v19.0/${params.pageId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: params.videoUrl,
          title: params.title,
          description: `${params.description}\n\n📹 Full report: ${params.reportUrl}\nReported via VozIt — Citizen Journalism`,
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

// ── X (TWITTER) — OAuth 1.0a request signing ──────────────────────────
// X's media-upload endpoint (still on the old v1.1 API) requires OAuth
// 1.0a request signing — a plain bearer token, which works fine for
// creating the tweet itself (v2 API), is rejected there. This builds the
// `Authorization: OAuth ...` header curl/Postman would generate, using
// only Node's built-in crypto (no OAuth library dependency).
function oauthPercentEncode(str: string): string {
  // OAuth 1.0a requires RFC 3986 percent-encoding, which reserves a few
  // characters (!*'()) that encodeURIComponent leaves untouched — those
  // need encoding by hand on top of it.
  return encodeURIComponent(str).replace(/[!*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

function buildOAuth1Header(
  method: string,
  url: string,
  extraParams: Record<string, string>,
  creds: { consumerKey: string; consumerSecret: string; accessToken: string; accessTokenSecret: string },
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  }
  // Only form-urlencoded / query-string params are part of an OAuth 1.0a
  // signature — a JSON or multipart body never is. Callers below only
  // pass extraParams that actually belong in the signature for that
  // specific request (query-string params for multipart APPEND calls,
  // form-body params for the INIT/FINALIZE/STATUS calls, nothing extra
  // for the JSON tweet-creation call).
  const allParams = { ...oauthParams, ...extraParams }
  const baseString = [
    method.toUpperCase(),
    oauthPercentEncode(url),
    oauthPercentEncode(
      Object.keys(allParams).sort().map((k) => `${oauthPercentEncode(k)}=${oauthPercentEncode(allParams[k])}`).join('&')
    ),
  ].join('&')
  const signingKey = `${oauthPercentEncode(creds.consumerSecret)}&${oauthPercentEncode(creds.accessTokenSecret)}`
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')

  const headerParams = { ...oauthParams, oauth_signature: signature }
  return 'OAuth ' + Object.keys(headerParams).sort()
    .map((k) => `${oauthPercentEncode(k)}="${oauthPercentEncode(headerParams[k])}"`).join(', ')
}

// ── X (TWITTER) ──────────────────────────────────────────────────────
// Post via X API: chunked media upload (v1.1) + tweet creation (v2)
export async function postToX(params: {
  consumerKey: string
  consumerSecret: string
  accessToken: string
  accessTokenSecret: string
  text: string
  videoUrl: string
  reportUrl: string
}): Promise<DistributionResult> {
  try {
    const creds = {
      consumerKey: params.consumerKey,
      consumerSecret: params.consumerSecret,
      accessToken: params.accessToken,
      accessTokenSecret: params.accessTokenSecret,
    }

    // X now bills per post ($0.20/post for anything containing a URL, vs
    // $0.015 without one, as of the 2026 pay-per-use pricing change) — this
    // tags the link so the actual traffic/value X sends back to the site
    // is measurable in analytics, rather than deciding whether X is worth
    // the per-post cost from a guess.
    const separator = params.reportUrl.includes('?') ? '&' : '?'
    const trackedReportUrl = `${params.reportUrl}${separator}utm_source=x&utm_medium=social&utm_campaign=auto_distribution`

    // 1. Download the video so it can actually be uploaded to X in
    // chunks. The previous version of this function only ever called
    // INIT and used whatever media id that returned straight in the
    // tweet — it never sent the video's bytes (APPEND) or confirmed the
    // upload was complete (FINALIZE), so no video was ever genuinely
    // attached to a tweet by this code.
    const videoRes = await fetch(params.videoUrl)
    if (!videoRes.ok) throw new Error(`Failed to download video for X upload: ${videoRes.status}`)
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
    const totalBytes = videoBuffer.length
    const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json'

    // 2. INIT — form-urlencoded body, so these params ARE part of the signature.
    const initParams = { command: 'INIT', media_type: 'video/mp4', media_category: 'tweet_video', total_bytes: String(totalBytes) }
    const initRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': buildOAuth1Header('POST', uploadUrl, initParams, creds),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(initParams),
    })
    const init = await initRes.json()
    if (!init.media_id_string) throw new Error(`X media INIT failed: ${init.errors?.[0]?.message || JSON.stringify(init)}`)
    const mediaId = init.media_id_string

    // 3. APPEND — the binary chunk goes in a multipart body, which (like
    // any non-form body) is never part of an OAuth 1.0a signature; command/
    // media_id/segment_index go on the query string instead, both so X can
    // read them and so they're still covered by the signature. 4MB is X's
    // documented max per chunk.
    const CHUNK_SIZE = 4 * 1024 * 1024
    let segmentIndex = 0
    for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
      const chunk = videoBuffer.subarray(offset, Math.min(offset + CHUNK_SIZE, totalBytes))
      const appendParams = { command: 'APPEND', media_id: mediaId, segment_index: String(segmentIndex) }
      const appendUrl = `${uploadUrl}?${new URLSearchParams(appendParams).toString()}`
      const form = new FormData()
      form.append('media', new Blob([chunk]))
      const appendRes = await fetch(appendUrl, {
        method: 'POST',
        headers: { 'Authorization': buildOAuth1Header('POST', uploadUrl, appendParams, creds) },
        body: form,
      })
      if (!appendRes.ok) throw new Error(`X media APPEND (segment ${segmentIndex}) failed: ${appendRes.status}`)
      segmentIndex++
    }

    // 4. FINALIZE
    const finalizeParams = { command: 'FINALIZE', media_id: mediaId }
    const finalizeRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': buildOAuth1Header('POST', uploadUrl, finalizeParams, creds),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(finalizeParams),
    })
    const finalize = await finalizeRes.json()

    // 5. Poll STATUS until X finishes processing the video server-side —
    // expected for anything beyond a trivially short clip, not an error case.
    let processingInfo = finalize.processing_info
    while (processingInfo && (processingInfo.state === 'pending' || processingInfo.state === 'in_progress')) {
      await new Promise((resolve) => setTimeout(resolve, (processingInfo.check_after_secs || 3) * 1000))
      const statusParams = { command: 'STATUS', media_id: mediaId }
      const statusUrl = `${uploadUrl}?${new URLSearchParams(statusParams).toString()}`
      const statusRes = await fetch(statusUrl, {
        method: 'GET',
        headers: { 'Authorization': buildOAuth1Header('GET', uploadUrl, statusParams, creds) },
      })
      const status = await statusRes.json()
      processingInfo = status.processing_info
      if (processingInfo?.state === 'failed') {
        throw new Error(`X video processing failed: ${processingInfo.error?.message || 'unknown error'}`)
      }
      if (!processingInfo || processingInfo.state === 'succeeded') break
    }

    // 6. Create the tweet (v2 API). A JSON body is never part of an OAuth
    // 1.0a signature, so no extra params go into the signature here.
    const tweetUrl = 'https://api.twitter.com/2/tweets'
    const tweetRes = await fetch(tweetUrl, {
      method: 'POST',
      headers: {
        'Authorization': buildOAuth1Header('POST', tweetUrl, {}, creds),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `${params.text}\n\n📹 via @VozItApp ${trackedReportUrl}`,
        media: { media_ids: [mediaId] },
      }),
    })
    const tweet = await tweetRes.json()
    if (!tweet.data?.id) throw new Error(`X tweet creation failed: ${tweet.errors?.[0]?.message || tweet.detail || JSON.stringify(tweet)}`)

    return {
      platform: 'x',
      success: true,
      postId: tweet.data.id,
      postUrl: `https://x.com/i/status/${tweet.data.id}`,
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
          reportUrl: params.reportUrl,
          tags: params.tags,
          location: params.location,
        })
        break
      case 'tiktok':
        result = await postToTikTok({
          accessToken: account.accessToken,
          title: params.title,
          videoUrl: params.videoUrl,
          reportUrl: params.reportUrl,
        })
        break
      case 'instagram':
        result = await postToInstagram({
          accessToken: account.accessToken,
          igUserId: account.accountId,
          caption: params.title,
          videoUrl: params.videoUrl,
          reportUrl: params.reportUrl,
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
          reportUrl: params.reportUrl,
        })
        break
      case 'x':
        result = await postToX({
          consumerKey: account.consumerKey || '',
          consumerSecret: account.consumerSecret || '',
          accessToken: account.accessToken,
          accessTokenSecret: account.accessTokenSecret || '',
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
