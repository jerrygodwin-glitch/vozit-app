// @ts-nocheck
// Push-notification sending — backend plumbing built ahead of the actual
// iOS/Android apps existing, so the trigger points (assignment events,
// payout completion, moderation strikes) don't need revisiting once a
// real Apple Developer APNs key and Firebase service account exist.
//
// Every send function below no-ops (logs once, returns) if its platform's
// env vars aren't set — same gating pattern already used elsewhere in this
// codebase (e.g. processVideoWatermark checking for WATERMARK_WORKER_URL)
// for an integration that's wired up but not yet actually configured.
//
// Built on Node's own crypto/http2 rather than a push-notification
// library, matching this codebase's existing preference (see the X
// OAuth 1.0a signing in social-distribution.ts) for no new dependency
// when the underlying protocol — a signed JWT, an HTTP/2 POST, an OAuth
// token exchange — is something Node already does natively.
import crypto from 'crypto'
import http2 from 'http2'

function base64url(input: Buffer | string): string {
  return (Buffer.isBuffer(input) ? input : Buffer.from(input))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ── APNS (iOS) ───────────────────────────────────────────────────────
// Provider JWTs are valid up to 1 hour — Apple asks providers not to
// mint a fresh one per request, so this caches and reuses until near
// expiry.
let cachedApnsJwt: { token: string; expiresAt: number } | null = null

function getApnsJwt(): string | null {
  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  const rawKey = process.env.APNS_PRIVATE_KEY
  if (!keyId || !teamId || !rawKey) return null

  const now = Math.floor(Date.now() / 1000)
  if (cachedApnsJwt && cachedApnsJwt.expiresAt > now + 60) return cachedApnsJwt.token

  const privateKey = rawKey.replace(/\\n/g, '\n')
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }))
  const claims = base64url(JSON.stringify({ iss: teamId, iat: now }))
  const signingInput = `${header}.${claims}`
  // JWT's ES256 wants the raw (r||s) signature format, not the DER
  // encoding Node's crypto.sign produces by default.
  const signature = crypto.sign('sha256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' })
  const token = `${signingInput}.${base64url(signature)}`

  cachedApnsJwt = { token, expiresAt: now + 3000 } // reissue after 50 minutes
  return token
}

async function sendApnsNotification(deviceToken: string, title: string, body: string, data?: Record<string, any>): Promise<{ ok: boolean; shouldRemoveToken?: boolean; error?: string }> {
  const jwt = getApnsJwt()
  const bundleId = process.env.APNS_BUNDLE_ID
  if (!jwt || !bundleId) return { ok: false, error: 'APNs not configured' }

  const host = process.env.APNS_PRODUCTION === 'false' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com'
  const payload = JSON.stringify({ aps: { alert: { title, body }, sound: 'default' }, ...data })

  return new Promise((resolve) => {
    const client = http2.connect(host)
    client.on('error', (err) => resolve({ ok: false, error: err.message }))

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    })

    let status = 0
    let responseBody = ''
    req.on('response', (headers) => { status = Number(headers[':status']) || 0 })
    req.on('data', (chunk) => { responseBody += chunk })
    req.on('end', () => {
      client.close()
      // Apple returns 410 for a device token that's been uninstalled or
      // is permanently invalid — safe to delete rather than retry.
      if (status === 410) return resolve({ ok: false, shouldRemoveToken: true, error: 'Unregistered' })
      if (status !== 200) return resolve({ ok: false, error: `APNs status ${status}: ${responseBody}` })
      resolve({ ok: true })
    })
    req.on('error', (err) => { client.close(); resolve({ ok: false, error: err.message }) })
    req.end(payload)
  })
}

// ── FCM (Android) ────────────────────────────────────────────────────
// FCM's HTTP v1 API needs a Google OAuth2 access token, obtained by
// signing a short-lived JWT with the Firebase service account's private
// key and exchanging it at Google's token endpoint — the same
// service-account JWT-bearer flow Google Cloud uses everywhere, distinct
// from the user-consent refresh-token flow already built for YouTube.
let cachedFcmToken: { token: string; expiresAt: number } | null = null

async function getFcmAccessToken(): Promise<string | null> {
  const clientEmail = process.env.FCM_CLIENT_EMAIL
  const rawKey = process.env.FCM_PRIVATE_KEY
  if (!clientEmail || !rawKey) return null

  const now = Math.floor(Date.now() / 1000)
  if (cachedFcmToken && cachedFcmToken.expiresAt > now + 60) return cachedFcmToken.token

  const privateKey = rawKey.replace(/\\n/g, '\n')
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const signingInput = `${header}.${claims}`
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(privateKey)
  const assertion = `${signingInput}.${base64url(signature)}`

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.access_token) return null
    cachedFcmToken = { token: data.access_token, expiresAt: now + (data.expires_in || 3600) }
    return data.access_token
  } catch {
    return null
  }
}

async function sendFcmNotification(deviceToken: string, title: string, body: string, data?: Record<string, any>): Promise<{ ok: boolean; shouldRemoveToken?: boolean; error?: string }> {
  const projectId = process.env.FCM_PROJECT_ID
  const accessToken = await getFcmAccessToken()
  if (!projectId || !accessToken) return { ok: false, error: 'FCM not configured' }

  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title, body },
          data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
        },
      }),
    })
    if (res.ok) return { ok: true }
    const errBody = await res.json().catch(() => ({}))
    const errStatus = errBody?.error?.status
    // UNREGISTERED — the app was uninstalled or the token rotated; safe
    // to delete rather than keep retrying a dead token.
    if (errStatus === 'UNREGISTERED' || errStatus === 'NOT_FOUND') return { ok: false, shouldRemoveToken: true, error: errStatus }
    return { ok: false, error: `FCM status ${res.status}: ${JSON.stringify(errBody)}` }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

// ── Main entry point ─────────────────────────────────────────────────
// Call this from any server-side event that should notify a user
// (assignment update, payout completed, moderation strike, etc.). Takes
// the admin client since the caller already has one at the point a
// server-side event finalizes, and this needs to read another user's
// device tokens — not something a session-scoped client's RLS allows.
// Never throws — a push failure should never break the calling flow.
export async function sendPushNotification(
  admin: any,
  userId: string,
  notification: { title: string; body: string; data?: Record<string, any> },
): Promise<void> {
  try {
    const { data: tokens } = await admin.from('device_tokens').select('id, platform, token').eq('user_id', userId)
    if (!tokens || tokens.length === 0) return

    for (const t of tokens) {
      const result = t.platform === 'ios'
        ? await sendApnsNotification(t.token, notification.title, notification.body, notification.data)
        : await sendFcmNotification(t.token, notification.title, notification.body, notification.data)

      if (!result.ok) {
        if (result.shouldRemoveToken) {
          await admin.from('device_tokens').delete().eq('id', t.id)
        } else if (result.error !== 'APNs not configured' && result.error !== 'FCM not configured') {
          console.error('[push-notifications] send failed', t.platform, result.error)
        }
      }
    }
  } catch (e: any) {
    console.error('[push-notifications] unexpected error', e.message)
  }
}
