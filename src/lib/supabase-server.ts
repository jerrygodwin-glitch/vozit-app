// @ts-nocheck
import { createServerClient as createServer } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SUPABASE_URL = 'https://mfanqkbhegxppyitxtye.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYW5xa2JoZWd4cHB5aXR4dHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDc2NDYsImV4cCI6MjEwMzcyMzY0Nn0.83-3UqR1BH2uaVoTO7Gta0l3lxVlkh7qSZ0b20aszdw'

type CookieOptions = { name: string; value: string; options?: Record<string, unknown> }

export const createServerClient = () =>
  createServer(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      async getAll() {
        const cookieStore = await cookies()
        return cookieStore.getAll()
      },
      async setAll(cookiesToSet: CookieOptions[]) {
        try {
          const cookieStore = await cookies()
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as any)
          }
        } catch {}
      },
    },
  })

export const createAdminClient = () =>
  createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
    auth: { autoRefreshToken: false, persistSession: false }
  })

// Resolves the current user from either an Authorization: Bearer <token> header
// (the mobile app — no cookies available) or the website's cookie-based session.
// Always use this in API routes instead of createServerClient() directly, so the
// same endpoint works for both the website and the mobile app. The returned
// `supabase` client carries the resolved user's own credentials either way, so
// RLS-scoped queries behave identically regardless of which path was used.
export async function getAuthedUser(req: { headers: { get(name: string): string | null } }) {
  const authHeader = req.headers.get('authorization')
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null

  if (bearerToken) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user } } = await supabase.auth.getUser(bearerToken)
    return { user, supabase }
  }

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}
