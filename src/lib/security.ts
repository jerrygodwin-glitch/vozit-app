// @ts-nocheck
// ══════════════════════════════════════════════════════════════
// VozIt Security Layer — Production Hardened
// ══════════════════════════════════════════════════════════════
//
// 1. Persistent rate limiting (Supabase-backed, not in-memory)
// 2. Webhook signature verification (Mux, Stripe)
// 3. CORS lockdown
// 4. Input sanitization / XSS prevention
// 5. Account lockout after failed logins
// 6. Admin audit logging
// 7. Admin IP allowlisting
// 8. CSRF token validation
// 9. Password strength enforcement
// 10. Username validation
// 11. Session management
// 12. Geo-risk tagging (conflict zones)
// 13. Jurisdiction takedown rules
// 14. Audio copyright fingerprinting
// 15. Security headers
// ══════════════════════════════════════════════════════════════



// ── 1. PERSISTENT RATE LIMITING (Supabase-backed) ────────────
// Falls back to in-memory if Supabase unavailable
const memoryStore = new Map<string, { count: number; resetAt: number }>()

export async function rateLimit(
  key: string, maxRequests: number, windowSeconds: number, supabase?: any
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now()

  // Try Supabase persistent store first
  if (supabase) {
    try {
      const windowStart = new Date(now - windowSeconds * 1000).toISOString()
      const { data, error } = await supabase.rpc('check_rate_limit', {
        limit_key: key,
        window_start: windowStart,
        max_requests: maxRequests,
      })
      // check_rate_limit() is a Postgres function returning TABLE(count BIGINT),
      // so supabase-js hands back an array of rows in `data`, not a top-level count.
      const count = !error && data?.[0]?.count != null ? Number(data[0].count) : null
      if (count !== null) {
        const allowed = count <= maxRequests
        return { allowed, remaining: Math.max(0, maxRequests - count), resetAt: now + windowSeconds * 1000 }
      }
    } catch { /* Fall through to memory */ }
  }

  // In-memory fallback
  const entry = memoryStore.get(key)
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowSeconds * 1000
    memoryStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }
  entry.count++
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

export const RATE_LIMITS = {
  upload:       { max: 10,  window: 3600 },
  vote:         { max: 100, window: 3600 },
  comment:      { max: 30,  window: 3600 },
  payout:       { max: 3,   window: 86400 },
  auth:         { max: 5,   window: 300 },     // 5 attempts per 5 min (tighter)
  register:     { max: 3,   window: 3600 },    // 3 registrations per hour per IP
  password_reset:{ max: 3,  window: 3600 },    // 3 reset emails per hour
  api_general:  { max: 300, window: 60 },
  licensing:    { max: 20,  window: 3600 },
}

// ── 2. WEBHOOK SIGNATURE VERIFICATION ────────────────────────

// Mux webhook signature verification
export async function verifyMuxSignature(
  body: string, signature: string | null, secret: string
): boolean {
  if (!signature || !secret) return false
  try {
    const parts = signature.split(',')
    const timestamp = parts.find(p => p.startsWith('t='))?.slice(2)
    const sig = parts.find(p => p.startsWith('v1='))?.slice(3)
    if (!timestamp || !sig) return false

    // Check timestamp is within 5 minutes
    const ts = parseInt(timestamp)
    if (Math.abs(Date.now() / 1000 - ts) > 300) return false

    // Verify HMAC
    const payload = `${timestamp}.${body}`
    const encoder = new TextEncoder()
    const key = await globalThis.crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sigBuf = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const expected = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
    return sig === expected
  } catch { return false }
}

// Stripe webhook signature verification
export async function verifyStripeSignature(
  body: string, signature: string | null, secret: string
): boolean {
  if (!signature || !secret) return false
  try {
    const parts = Object.fromEntries(
      signature.split(',').map(p => {
        const [k, v] = p.split('=')
        return [k, v]
      })
    )
    const timestamp = parts['t']
    const sig = parts['v1']
    if (!timestamp || !sig) return false

    if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false

    const payload = `${timestamp}.${body}`
    const enc = new TextEncoder()
    const k = await globalThis.crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const s = await globalThis.crypto.subtle.sign('HMAC', k, enc.encode(payload))
    const expected = Array.from(new Uint8Array(s)).map(b => b.toString(16).padStart(2, '0')).join('')
    return sig === expected
  } catch { return false }
}

// ── 3. CORS CONFIGURATION ────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'https://vozit.app',
  'https://vozitvercel-v2-voz-it.vercel.app',
  'http://localhost:3000',
].filter(Boolean)

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o))
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}

// Embed endpoints need broader CORS (news sites embed from any domain)
export function getEmbedCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'X-Frame-Options': 'ALLOWALL', // Override DENY for embeds
  }
}

// ── 4. INPUT SANITIZATION ────────────────────────────────────
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '')                    // Strip HTML tags
    .replace(/javascript:/gi, '')             // Strip JS protocol
    .replace(/on\w+\s*=/gi, '')              // Strip event handlers
    .replace(/data:text\/html/gi, '')         // Strip data URIs
    .replace(/&#/g, '')                       // Strip HTML entities
    .replace(/\x00/g, '')                    // Strip null bytes
    .trim()
}

export function sanitizeUsername(username: string): { valid: boolean; cleaned: string; error?: string } {
  const cleaned = username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30)
  if (cleaned.length < 3) return { valid: false, cleaned, error: 'Username must be at least 3 characters' }
  if (cleaned.length > 30) return { valid: false, cleaned, error: 'Username must be 30 characters or less' }
  if (/^\d+$/.test(cleaned)) return { valid: false, cleaned, error: 'Username cannot be all numbers' }

  // Reserved words
  const reserved = ['admin','moderator','mod','vozit','support','help','system',
    'root','api','www','mail','email','staff','team','official','verified']
  if (reserved.includes(cleaned)) return { valid: false, cleaned, error: 'This username is reserved' }

  // Basic profanity check (expand this list)
  const profanity = ['fuck','shit','ass','damn','bitch','dick','cock','pussy','nigger','faggot']
  if (profanity.some(w => cleaned.includes(w))) return { valid: false, cleaned, error: 'Username contains inappropriate language' }

  return { valid: true, cleaned }
}

// ── 5. PASSWORD STRENGTH ─────────────────────────────────────
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < 8) errors.push('At least 8 characters')
  if (password.length > 128) errors.push('128 characters maximum')
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('At least one number')
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character')

  // Check against common passwords
  const common = ['password','12345678','qwerty123','letmein','welcome','monkey',
    'dragon','master','abc12345','password1','iloveyou','trustno1']
  if (common.includes(password.toLowerCase())) errors.push('This password is too common')

  return { valid: errors.length === 0, errors }
}

// ── 6. ACCOUNT LOCKOUT ───────────────────────────────────────
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

export function checkAccountLockout(identifier: string): { locked: boolean; minutesRemaining: number } {
  const entry = loginAttempts.get(identifier)
  if (!entry) return { locked: false, minutesRemaining: 0 }
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(identifier)
    return { locked: false, minutesRemaining: 0 }
  }
  return { locked: true, minutesRemaining: Math.ceil((entry.lockedUntil - Date.now()) / 60000) }
}

export function recordFailedLogin(identifier: string): { locked: boolean; attemptsRemaining: number } {
  const entry = loginAttempts.get(identifier) || { count: 0, lockedUntil: 0 }
  entry.count++

  // Progressive lockout: 5 fails = 5 min, 10 fails = 30 min, 15+ = 2 hours
  if (entry.count >= 15) {
    entry.lockedUntil = Date.now() + 2 * 60 * 60 * 1000
  } else if (entry.count >= 10) {
    entry.lockedUntil = Date.now() + 30 * 60 * 1000
  } else if (entry.count >= 5) {
    entry.lockedUntil = Date.now() + 5 * 60 * 1000
  }

  loginAttempts.set(identifier, entry)
  return { locked: entry.lockedUntil > Date.now(), attemptsRemaining: Math.max(0, 5 - entry.count) }
}

export function clearLoginAttempts(identifier: string) {
  loginAttempts.delete(identifier)
}

// ── 7. ADMIN AUDIT LOGGING ───────────────────────────────────
export async function logAdminAction(supabase: any, params: {
  adminId: string
  action: string
  targetType: string
  targetId: string
  details?: any
  ipAddress?: string
}) {
  await supabase.from('admin_audit_log').insert({
    admin_id: params.adminId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    details: params.details || null,
    ip_address: params.ipAddress || null,
    created_at: new Date().toISOString(),
  }) // Non-blocking
}

// ── 8. ADMIN IP ALLOWLIST ────────────────────────────────────
export function isAdminIpAllowed(ip: string): boolean {
  const allowlist = (process.env.ADMIN_IP_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean)
  if (allowlist.length === 0) return true // No allowlist configured = allow all (dev mode)
  return allowlist.includes(ip)
}

// ── 9. CSRF TOKEN ────────────────────────────────────────────
export function generateCsrfToken(): string {
  const arr = new Uint8Array(32); globalThis.crypto.getRandomValues(arr); return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function verifyCsrfToken(token: string | null, sessionToken: string | null): boolean {
  if (!token || !sessionToken) return false
  if (token.length !== sessionToken.length) return false
  let result = 0
  for (let i = 0; i < token.length; i++) { result |= token.charCodeAt(i) ^ sessionToken.charCodeAt(i) }
  return result === 0
}

// ── 10. SESSION MANAGEMENT ───────────────────────────────────
export function getSessionConfig() {
  return {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
}

// ── 11. GEO-RISK TAGGING ─────────────────────────────────────
export type RiskLevel = 'critical' | 'high' | 'elevated' | 'moderate' | 'low'

export interface GeoRiskZone {
  name: string
  countries: string[]
  regions?: string[]
  risk: RiskLevel
  description: string
  verificationRequired: boolean
}

export const GEO_RISK_ZONES: GeoRiskZone[] = [
  { name: 'Ukraine conflict', countries: ['UA'], regions: ['Donetsk','Luhansk','Kherson','Zaporizhzhia','Crimea','Kharkiv'], risk: 'critical', description: 'Active war zone.', verificationRequired: true },
  { name: 'Sudan civil war', countries: ['SD'], regions: ['Khartoum','Darfur','Blue Nile'], risk: 'critical', description: 'Active armed conflict.', verificationRequired: true },
  { name: 'Myanmar civil war', countries: ['MM'], risk: 'critical', description: 'Military junta vs resistance.', verificationRequired: true },
  { name: 'Gaza/West Bank', countries: ['PS','IL'], regions: ['Gaza','West Bank','Rafah','Khan Yunis'], risk: 'critical', description: 'Active conflict zone.', verificationRequired: true },
  { name: 'Syria', countries: ['SY'], risk: 'critical', description: 'Post-conflict instability.', verificationRequired: true },
  { name: 'Yemen', countries: ['YE'], risk: 'high', description: 'Ongoing conflict.', verificationRequired: true },
  { name: 'Sahel region', countries: ['ML','BF','NE','TD','NG'], risk: 'high', description: 'Insurgency and military coups.', verificationRequired: true },
  { name: 'Venezuela', countries: ['VE'], risk: 'elevated', description: 'Political instability.', verificationRequired: false },
  { name: 'Iran', countries: ['IR'], risk: 'elevated', description: 'Restricted press environment.', verificationRequired: false },
  { name: 'Cuba', countries: ['CU'], risk: 'elevated', description: 'Independent journalism criminalized.', verificationRequired: false },
  { name: 'DRC Eastern Congo', countries: ['CD'], regions: ['North Kivu','South Kivu','Ituri'], risk: 'high', description: 'Armed group activity.', verificationRequired: true },
]

export function assessGeoRisk(countryCode: string, locationName?: string): {
  riskLevel: RiskLevel; zones: GeoRiskZone[]; requiresVerification: boolean
} {
  const cc = countryCode.toUpperCase()
  const matched = GEO_RISK_ZONES.filter(z => {
    if (!z.countries.includes(cc)) return false
    if (z.regions && locationName) return z.regions.some(r => locationName.toLowerCase().includes(r.toLowerCase()))
    return true
  })
  if (matched.length === 0) return { riskLevel: 'low', zones: [], requiresVerification: false }
  const order: RiskLevel[] = ['low','moderate','elevated','high','critical']
  const highest = matched.reduce<RiskLevel>((max, z) => order.indexOf(z.risk) > order.indexOf(max) ? z.risk : max, 'low')
  return { riskLevel: highest, zones: matched, requiresVerification: matched.some(z => z.verificationRequired) }
}

// ── 12. JURISDICTION TAKEDOWN RULES ──────────────────────────
export interface TakedownRule {
  jurisdiction: string; law: string; applies: (r: any) => boolean; action: string; deadline_hours: number
}

export const TAKEDOWN_RULES: TakedownRule[] = [
  { jurisdiction: 'EU', law: 'Digital Services Act (DSA)', applies: r => r.flags?.includes('illegal_content'), action: 'remove', deadline_hours: 24 },
  { jurisdiction: 'EU', law: 'GDPR Right to Erasure', applies: r => r.flags?.includes('privacy_complaint'), action: 'remove', deadline_hours: 72 },
  { jurisdiction: 'DE', law: 'NetzDG', applies: r => r.flags?.includes('hate_speech') && r.geo_region === 'DE', action: 'geo_block', deadline_hours: 24 },
  { jurisdiction: 'US', law: 'DMCA', applies: r => r.flags?.includes('copyright_claim'), action: 'remove', deadline_hours: 72 },
  { jurisdiction: 'GLOBAL', law: 'Child Safety', applies: r => r.flags?.includes('minor') || r.flags?.includes('minor_suggestive'), action: 'remove', deadline_hours: 1 },
]

export function evaluateTakedownRules(report: any): TakedownRule[] {
  return TAKEDOWN_RULES.filter(rule => rule.applies(report))
}

// ── 13. AUDIO COPYRIGHT FINGERPRINTING ───────────────────────
export async function checkAudioCopyright(audioUrl: string): Promise<{
  hasCopyrightedAudio: boolean; matches: Array<{ title: string; artist: string; confidence: number }>
}> {
  if (!process.env.ACRCLOUD_API_KEY) return { hasCopyrightedAudio: false, matches: [] }
  try {
    const res = await fetch('https://identify-us-west-2.acrcloud.com/v1/identify', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.ACRCLOUD_API_KEY}` },
      body: JSON.stringify({ url: audioUrl, data_type: 'audio' }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return { hasCopyrightedAudio: false, matches: [] }
    const data = await res.json()
    const music = data.metadata?.music || []
    return { hasCopyrightedAudio: music.length > 0, matches: music.map((m: any) => ({ title: m.title, artist: m.artists?.[0]?.name || 'Unknown', confidence: m.score / 100 })) }
  } catch { return { hasCopyrightedAudio: false, matches: [] } }
}

// ── 14. SECURITY HEADERS ─────────────────────────────────────
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https://image.mux.com https://*.supabase.co blob:",
      "media-src 'self' https://stream.mux.com blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mux.com https://api.thehive.ai",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  }
}
