// @ts-nocheck
import { createBrowserClient as createBrowser } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfanqkbhegxppyitxtye.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYW5xa2JoZWd4cHB5aXR4dHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDc2NDYsImV4cCI6MjEwMzcyMzY0Nn0.83-3UqR1BH2uaVoTO7Gta0l3lxVlkh7qSZ0b20aszdw'

export const createBrowserClient = () =>
  createBrowser(SUPABASE_URL, SUPABASE_ANON_KEY)

export const createAdminClient = () =>
  createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
