// @ts-nocheck
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Same hardcoded URL/anon key used by every other server file in this app
// (src/lib/supabase-server.ts, src/middleware.ts) — this route previously
// read them from NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY env
// vars instead, which aren't set anywhere else in the project, so this
// exchange likely failed silently and sent every confirmation/reset link
// straight to the auth_failed redirect below.
const SUPABASE_URL = 'https://mfanqkbhegxppyitxtye.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYW5xa2JoZWd4cHB5aXR4dHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDc2NDYsImV4cCI6MjEwMzcyMzY0Nn0.83-3UqR1BH2uaVoTO7Gta0l3lxVlkh7qSZ0b20aszdw'

type CookieOptions = { name: string; value: string; options?: Record<string, unknown> }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/auth/profile-setup'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: CookieOptions[]) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options as any)
            }
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, req.url))
  }

  return NextResponse.redirect(new URL('/auth/login?error=auth_failed', req.url))
}
