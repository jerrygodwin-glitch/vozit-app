// @ts-nocheck
import { createBrowserClient as createBrowser } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mfanqkbhegxppyitxtye.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYW5xa2JoZWd4cHB5aXR4dHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDc2NDYsImV4cCI6MjEwMzcyMzY0Nn0.83-3UqR1BH2uaVoTO7Gta0l3lxVlkh7qSZ0b20aszdw'

// Was constructing a brand-new auth client (and brand-new GoTrueClient)
// on every call — 6 different call sites across the app, plus useAuth()
// itself calling this fresh on every render. Multiple independent client
// instances all managing the same session cookie race each other on
// token refresh; the loser of that race can end up invalidating the
// whole session, not just its own copy. Supabase documents this exact
// failure mode ("Multiple GoTrueClient instances detected... may
// produce undefined behavior"). Caching a single instance here means
// every caller shares the same client and the same in-flight refresh,
// instead of competing.
let browserClient: ReturnType<typeof createBrowser> | null = null
export const createBrowserClient = () => {
  if (!browserClient) browserClient = createBrowser(SUPABASE_URL, SUPABASE_ANON_KEY)
  return browserClient
}

// Also export a plain client for pages that don't use SSR
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const createAdminClient = () =>
  createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
