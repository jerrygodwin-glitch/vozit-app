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
