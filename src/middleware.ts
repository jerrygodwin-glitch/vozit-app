// @ts-nocheck
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = 'https://mfanqkbhegxppyitxtye.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYW5xa2JoZWd4cHB5aXR4dHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDc2NDYsImV4cCI6MjEwMzcyMzY0Nn0.83-3UqR1BH2uaVoTO7Gta0l3lxVlkh7qSZ0b20aszdw'

const PUBLIC = ['/auth', '/feed', '/api/mux-webhook', '/api/stripe', '/api/og', '/api/licensing', '/embed', '/search', '/assignments', '/licensing']

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/brand/') ||
    path.startsWith('/icons/') ||
    path === '/manifest.json'
  ) {
    return NextResponse.next()
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const res = NextResponse.next()

  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', path.startsWith('/embed') ? 'ALLOWALL' : 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (path.startsWith('/api/')) {
    res.headers.set('Access-Control-Allow-Origin', '*')
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  }

  const isPublic = PUBLIC.some(p => path.startsWith(p)) || path === '/' || path === '/settings' || path === '/payouts' || path === '/earnings' || path === '/upload'
  if (isPublic) {
    return res
  }

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
  } catch {}

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|icons/).*)'],
}
