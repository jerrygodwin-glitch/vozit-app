// @ts-nocheck
// Auto-distribute published reports to VozIt's official social channels
// Triggered after a report passes moderation in the Mux webhook pipeline
// Uses VozIt's own platform tokens (stored as env vars)

import { postToYouTube, postToTikTok, postToInstagram, postToFacebook, postToX } from './social-distribution'
import type { DistributionResult } from './social-distribution'

// YouTube access tokens expire in ~1 hour — unlike the other platforms'
// effectively-permanent tokens, there's no single static value that keeps
// working. Instead this holds a refresh token (which doesn't expire under
// normal use) and exchanges it for a fresh access token right before each
// upload, via Google's own token endpoint.
async function getYouTubeAccessToken(): Promise<string> {
  const refreshToken = process.env.VOZIT_YOUTUBE_REFRESH_TOKEN
  const clientId = process.env.VOZIT_YOUTUBE_CLIENT_ID
  const clientSecret = process.env.VOZIT_YOUTUBE_CLIENT_SECRET
  if (!refreshToken || !clientId || !clientSecret) return ''

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.access_token || ''
  } catch {
    return ''
  }
}

// VozIt's official platform accounts — tokens from env vars
function getVozItAccounts() {
  return {
    youtube: {
      // Readiness is based on having the refresh-token credentials, not a
      // (nonexistent, for YouTube) static access token — the real token is
      // resolved just-in-time by getYouTubeAccessToken() right before
      // posting, since any value fetched here would likely be stale by the
      // time the upload actually runs.
      enabled: !!(process.env.VOZIT_YOUTUBE_REFRESH_TOKEN && process.env.VOZIT_YOUTUBE_CLIENT_ID && process.env.VOZIT_YOUTUBE_CLIENT_SECRET),
      accessToken: '',
    },
    tiktok: {
      enabled: !!process.env.VOZIT_TIKTOK_TOKEN,
      accessToken: process.env.VOZIT_TIKTOK_TOKEN || '',
    },
    instagram: {
      enabled: !!process.env.VOZIT_INSTAGRAM_TOKEN,
      accessToken: process.env.VOZIT_INSTAGRAM_TOKEN || '',
      igUserId: process.env.VOZIT_INSTAGRAM_USER_ID || '',
    },
    facebook: {
      enabled: !!process.env.VOZIT_FACEBOOK_TOKEN,
      accessToken: process.env.VOZIT_FACEBOOK_TOKEN || '',
      pageId: process.env.VOZIT_FACEBOOK_PAGE_ID || '',
    },
    x: {
      enabled: !!process.env.VOZIT_X_TOKEN,
      accessToken: process.env.VOZIT_X_TOKEN || '',
    },
  }
}

// Auto-post a published report to all of VozIt's channels
export async function autoDistributeToVozItChannels(params: {
  reportId: string
  title: string
  description: string
  playbackId: string
  watermarkedUrl?: string
  locationName?: string
  location?: { lat: number; lng: number }
  reporterUsername: string
  reporterTier: string
}): Promise<{
  results: DistributionResult[]
  platformsPosted: string[]
  platformsFailed: string[]
}> {
  const accounts = getVozItAccounts()
  const results: DistributionResult[] = []

  // Prefer the branded, watermarked copy once the worker has produced one —
  // otherwise this posts the raw, unbranded master to VozIt's own public
  // channels with zero VozIt/reporter credit visible.
  const videoUrl = params.watermarkedUrl || `https://stream.mux.com/${params.playbackId}/high.mp4`
  const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vozit.net'}/report/${params.reportId}`
  const tags = ['VozIt', 'citizenjournalism', 'IWasThere', 'eyewitness', params.locationName || ''].filter(Boolean)

  const description = [
    params.description,
    '',
    `📹 Reported by @${params.reporterUsername} via VozIt`,
    `🔗 Full report: ${reportUrl}`,
    '',
    '#VozIt #IWasThere #CitizenJournalism #Eyewitness',
    params.locationName ? `#${params.locationName.replace(/[^a-zA-Z0-9]/g, '')}` : '',
  ].filter(Boolean).join('\n')

  // YouTube — full video upload
  if (accounts.youtube.enabled) {
    const youtubeToken = await getYouTubeAccessToken()
    if (youtubeToken) {
      const r = await postToYouTube({
        accessToken: youtubeToken,
        title: `[EYEWITNESS] ${params.title}`,
        description,
        videoUrl,
        tags,
        location: params.location,
      })
      results.push(r)
    } else {
      results.push({
        platform: 'youtube',
        success: false,
        error: 'Could not refresh YouTube access token',
        distributedAt: new Date().toISOString(),
      })
    }
  }

  // TikTok — post as TikTok video
  if (accounts.tiktok.enabled) {
    const r = await postToTikTok({
      accessToken: accounts.tiktok.accessToken,
      title: `${params.title} #VozIt #IWasThere`,
      videoUrl,
    })
    results.push(r)
  }

  // Instagram — post as Reel
  if (accounts.instagram.enabled) {
    const r = await postToInstagram({
      accessToken: accounts.instagram.accessToken,
      igUserId: accounts.instagram.igUserId,
      caption: `${params.title}\n\n📹 @${params.reporterUsername} via VozIt\n\n#VozIt #IWasThere #CitizenJournalism`,
      videoUrl,
      location: params.location,
    })
    results.push(r)
  }

  // Facebook — post to VozIt page
  if (accounts.facebook.enabled) {
    const r = await postToFacebook({
      accessToken: accounts.facebook.accessToken,
      pageId: accounts.facebook.pageId,
      title: params.title,
      description,
      videoUrl,
    })
    results.push(r)
  }

  // X — tweet with video
  if (accounts.x.enabled) {
    const tweetText = params.title.length > 200
      ? params.title.slice(0, 197) + '...'
      : params.title
    const r = await postToX({
      accessToken: accounts.x.accessToken,
      text: `🔴 EYEWITNESS: ${tweetText}`,
      videoUrl,
      reportUrl,
    })
    results.push(r)
  }

  return {
    results,
    platformsPosted: results.filter(r => r.success).map(r => r.platform),
    platformsFailed: results.filter(r => !r.success).map(r => r.platform),
  }
}

// Store VozIt channel distribution results
export async function logVozItDistribution(
  supabase: any,
  reportId: string,
  results: DistributionResult[],
) {
  for (const result of results) {
    await supabase.from('social_distributions').insert({
      report_id: reportId,
      user_id: null, // VozIt's own channels, not a user's
      platform: result.platform,
      post_id: result.postId,
      post_url: result.postUrl,
      success: result.success,
      error: result.error,
      distributed_at: result.distributedAt,
      is_vozit_channel: true,
    })
  }
}
