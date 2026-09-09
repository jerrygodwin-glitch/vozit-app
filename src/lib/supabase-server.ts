// @ts-nocheck
import { createServerClient as createServer } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

type CookieOptions = { name: string; value: string; options?: Record<string, unknown> }

export const createServerClient = () =>
  createServer(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
          } catch {
            // Can be called from Server Components
          }
        },
      },
    }
  )

export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
