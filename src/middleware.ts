// @ts-nocheck
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSecurityHeaders, getCorsHeaders, getEmbedCorsHeaders, rateLimit, RATE_LIMITS, isAdminIpAllowed } from '@/lib/security'

const PUBLIC = ['/auth', '/api/mux-webhook', '/api/stripe', '/api/og', '/api/licensing', '/embed']
const WEBHOOK_ROUTES = ['/api/mux-webhook', '/api/stripe']
const ADMIN_ROUTES = ['/admin', '/api/admin']
const EMBED_ROUTES = ['/embed']

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const origin = req.headers.get('origin')
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || 'unknown'

  // Skip static assets
  if (path.startsWith('/_next') || path.startsWith('/favicon') || path === '/manifest.json' || path.startsWith('/brand/')) {
    return NextResponse.next()
  }

  // ── CORS preflight ─────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    const isEmbed = EMBED_ROUTES.some(r => path.startsWith(r))
    const headers = isEmbed ? getEmbedCorsHeaders() : getCorsHeaders(origin)
    return new NextResponse(null, { status: 204, headers })
  }

  const res = NextResponse.next()

  // ── Security headers ───────────────────────────────────────
  const secHeaders = getSecurityHeaders()
  const isEmbed = EMBED_ROUTES.some(r => path.startsWith(r))
  for (const [key, value] of Object.entries(secHeaders)) {
    // Allow framing for embed routes
    if (isEmbed && key === 'X-Frame-Options') {
      res.headers.set('X-Frame-Options', 'ALLOWALL')
    } else if (isEmbed && key === 'Content-Security-Policy') {
      res.headers.set(key, value.replace("frame-ancestors 'none'", "frame-ancestors *"))
    } else {
      res.headers.set(key, value)
    }
  }

  // ── CORS headers ───────────────────────────────────────────
  if (path.startsWith('/api/')) {
    const corsHeaders = isEmbed ? getEmbedCorsHeaders() : getCorsHeaders(origin)
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.headers.set(key, value)
    }
  }

  // ── Admin IP allowlist ─────────────────────────────────────
  if (ADMIN_ROUTES.some(r => path.startsWith(r))) {
    if (!isAdminIpAllowed(ip)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // ── Rate limiting on API routes ────────────────────────────
  if (path.startsWith('/api/')) {
    // Skip rate limiting for webhooks (they have signature verification)
    if (!WEBHOOK_ROUTES.some(r => path.startsWith(r))) {
      // Determine rate limit tier
      let limitConfig = RATE_LIMITS.api_general
      if (path.startsWith('/api/auth')) limitConfig = RATE_LIMITS.auth
      else if (path.startsWith('/api/reports') && req.method === 'POST') limitConfig = RATE_LIMITS.upload
      else if (path.startsWith('/api/votes')) limitConfig = RATE_LIMITS.vote
      else if (path.startsWith('/api/payouts') && req.method === 'POST') limitConfig = RATE_LIMITS.payout
      else if (path.startsWith('/api/licensing')) limitConfig = RATE_LIMITS.licensing

      const limitKey = `${path}:${ip}`
      const limit = await rateLimit(limitKey, limitConfig.max, limitConfig.window)

      res.headers.set('X-RateLimit-Limit', String(limitConfig.max))
      res.headers.set('X-RateLimit-Remaining', String(limit.remaining))
      res.headers.set('X-RateLimit-Reset', String(Math.ceil(limit.resetAt / 1000)))

      if (!limit.allowed) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) },
        })
      }
    }
  }

  // ── Auth check for protected routes ────────────────────────
  const isPublic = PUBLIC.some(p => path.startsWith(p)) || path === '/'
  if (!isPublic) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createServerClient(supabaseUrl, supabaseKey, {
          cookies: {
            getAll: () => req.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
            setAll: (cookies) => { cookies.forEach(c => res.cookies.set(c.name, c.value, c.options)) },
          },
        })
        const { data: { user } } = await supabase.auth.getUser()

        if (!user && !path.startsWith('/api/')) {
          const url = req.nextUrl.clone()
          url.pathname = '/auth/login'
          return NextResponse.redirect(url)
        }

        // Check email verification for non-API routes
        if (user && !user.email_confirmed_at && !path.startsWith('/api/') && !path.startsWith('/auth/')) {
          const url = req.nextUrl.clone()
          url.pathname = '/auth/verify'
          return NextResponse.redirect(url)
        }

        // Check if user is banned
        if (user && path.startsWith('/api/')) {
          const { data: profile } = await supabase
            .from('users')
            .select('is_banned')
            .eq('id', user.id)
            .single()
          if (profile?.is_banned) {
            return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
          }
        }
      } catch { /* Allow through if Supabase not configured */ }
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/).*)'],
}
