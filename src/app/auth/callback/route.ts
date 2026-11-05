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
  const explicitNext = searchParams.get('next')

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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      if (explicitNext) return NextResponse.redirect(new URL(explicitNext, req.url))

      // This callback runs on every Google/Facebook sign-in, not just the
      // first one — confirmed directly (Jerry hit this signing back into
      // an existing account): with no "next" param, every single OAuth
      // login was unconditionally sent through the full 5-step onboarding
      // flow (username, reporter type, topics, revenue) again, forever,
      // because there was no check for whether that flow had already been
      // completed. reporter_type looked like a natural "has this person
      // onboarded before" signal (it's only set by finishing step 2, no
      // skip option on it) but isn't safe to use — confirmed directly that
      // real, long-established, active accounts can have it null (never
      // went through that specific step). Account age is the reliable
      // signal instead: a brand-new sign-up and a returning sign-in both
      // hit this same route, but only the former has created_at within
      // moments of right now.
      const createdAt = new Date(data.user.created_at).getTime()
      const isBrandNewSignup = Date.now() - createdAt < 60_000
      const dest = isBrandNewSignup ? '/auth/profile-setup' : '/feed'
      return NextResponse.redirect(new URL(dest, req.url))
    }
  }

  return NextResponse.redirect(new URL('/auth/login?error=auth_failed', req.url))
}
