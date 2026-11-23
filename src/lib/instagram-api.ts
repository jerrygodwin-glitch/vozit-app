// @ts-nocheck
// Instagram Graph API helpers — token exchange and container-status
// polling. The actual publish flow (create a Reels container, then
// publish it) already lives in src/lib/social-distribution.ts's
// postToInstagram() and calls the Graph API directly against a known
// Instagram Business Account ID — it never depended on Meta's "Link
// Instagram to Page" UI feature, which is a separate, still-broken thing
// that only affects Business Suite's own account-picker screen, not
// direct Graph API calls made with a valid access token.

const GRAPH_API_VERSION = 'v21.0'

// Exchanges either a short-lived (1hr) token for a long-lived (60-day) one,
// or a still-valid long-lived token for a fresh 60-day one — Meta uses the
// exact same endpoint/grant type for both; the only difference is which
// token you feed in and how soon before expiry you do it.
export async function exchangeForLongLivedToken(
  currentToken: string
): Promise<{ token: string; expiresInSeconds: number } | { error: string }> {
  const appId = process.env.VOZIT_META_APP_ID
  const appSecret = process.env.VOZIT_META_APP_SECRET
  if (!appId || !appSecret) return { error: 'VOZIT_META_APP_ID / VOZIT_META_APP_SECRET not configured' }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(currentToken)}`
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok || data.error) return { error: data.error?.message || `Token exchange failed (${res.status})` }
    if (!data.access_token) return { error: 'Meta response had no access_token' }
    return { token: data.access_token, expiresInSeconds: data.expires_in || 5184000 } // Meta's own default (60 days) if it omits expires_in
  } catch (e: any) {
    return { error: e.message }
  }
}

// Polls a media container's processing status. Instagram needs real time to
// transcode a Reel before it can be published — a fixed sleep either wastes
// time on short videos or isn't long enough for longer ones; this instead
// checks the container's own reported state.
export async function pollContainerStatus(
  containerId: string, accessToken: string,
  opts: { intervalMs?: number; maxAttempts?: number } = {}
): Promise<{ ready: boolean; error?: string }> {
  const intervalMs = opts.intervalMs || 5000
  const maxAttempts = opts.maxAttempts || 24 // up to 2 minutes total

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${containerId}?fields=status_code&access_token=${accessToken}`)
      const data = await res.json()
      if (data.error) return { ready: false, error: data.error.message }
      if (data.status_code === 'FINISHED') return { ready: true }
      if (data.status_code === 'ERROR') return { ready: false, error: 'Instagram reported the container failed processing' }
      // IN_PROGRESS / EXPIRED(not yet reached) / PUBLISHED — keep polling
    } catch (e: any) {
      return { ready: false, error: e.message }
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  return { ready: false, error: `Container never reached FINISHED after ${(intervalMs * maxAttempts) / 1000}s` }
}
