// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

// GET /api/auth/me — get current user profile
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ...profile,
    email: user.email,
    email_confirmed: !!user.email_confirmed_at,
    auth_provider: user.app_metadata?.provider ?? 'email',
  })
}

// PATCH /api/auth/me — update own profile
export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const allowed = [
    'display_name', 'avatar_url', 'bio', 'country',
    'reporter_type', 'topics',
  ]

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  allowed.forEach(key => {
    if (body[key] !== undefined) updates[key] = body[key]
  })

  // Validate reporter_type
  if (updates.reporter_type && !['eyewitness', 'journalist', 'activist', 'hobbyist'].includes(updates.reporter_type)) {
    return NextResponse.json({ error: 'Invalid reporter type' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
export const dynamic = 'force-dynamic'
