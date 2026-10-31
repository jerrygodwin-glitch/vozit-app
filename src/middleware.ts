// @ts-nocheck
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getCorsHeaders, getEmbedCorsHeaders, getSecurityHeaders } from '@/lib/security'

const SUPABASE_URL = 'https://mfanqkbhegxppyitxtye.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYW5xa2JoZWd4cHB5aXR4dHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDc2NDYsImV4cCI6MjEwMzcyMzY0Nn0.83-3UqR1BH2uaVoTO7Gta0l3lxVlkh7qSZ0b20aszdw'

const PUBLIC = ['/auth', '/feed', '/api/mux-webhook', '/api/stripe', '/api/og', '/api/licensing', '/embed', '/search', '/assignments', '/licensing']

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Skip static assets entirely
  // robots.txt/ads.txt: confirmed directly — these never existed as real
  // files, so requests for them fell through to the auth check below like
  // any other unrecognized path and got redirected to /auth/login. Any
  // crawler checking robots.txt first (standard practice, and exactly
  // what Google's AdSense review does) would see a redirect to a login
  // page instead of real content — a very plausible cause of the site
  // being reported as "down or unavailable" despite working fine for
  // actual visitors. Real files now exist in /public, but listing these
  // paths explicitly here too means this class of bug can't recur for
  // this or similar root-level crawler files regardless of how static
  // file serving and middleware ordering interact.
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/brand/') ||
    path.startsWith('/icons/') ||
    path === '/manifest.json' ||
    path === '/robots.txt' ||
    path === '/ads.txt' ||
    path === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // Embed routes are meant to be loaded by any news site — the rest of the
  // app should only ever be called from VozIt's own origins.
  const isEmbed = path.startsWith('/embed') || path.startsWith('/api/embed')
  const origin = req.headers.get('origin')
  const corsHeaders = isEmbed ? getEmbedCorsHeaders() : getCorsHeaders(origin)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders })
  }

  const res = NextResponse.next()

  // Security headers (CSP, HSTS, etc.)
  const securityHeaders = getSecurityHeaders()
  for (const [k, v] of Object.entries(securityHeaders)) {
    // Embeds need to be frameable by any site — CSP's frame-ancestors
    // overrides X-Frame-Options in modern browsers, so skip both here
    // and let the embed-specific headers below allow framing instead.
    if (isEmbed && (k === 'X-Frame-Options' || k === 'Content-Security-Policy')) continue
    res.headers.set(k, v)
  }
  if (isEmbed) res.headers.set('X-Frame-Options', 'ALLOWALL')

  // CORS — restricted to VozIt's own origins, except embed routes
  if (path.startsWith('/api/')) {
    for (const [k, v] of Object.entries(corsHeaders)) res.headers.set(k, v)
  }

  // Public routes — no auth check needed
  const isPublic = PUBLIC.some(p => path.startsWith(p)) || path === '/' || path === '/settings' || path === '/payouts' || path === '/earnings' || path === '/upload'
  if (isPublic) {
    return res
  }

  // Protected routes — check auth
  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  } catch {
    // If auth check fails, allow through rather than blocking
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|icons/).*)'],
}
