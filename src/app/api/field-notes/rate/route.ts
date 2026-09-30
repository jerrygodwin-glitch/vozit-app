// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// POST /api/field-notes/rate — the actual filter. A note's visibility is
// decided by how the community rates it, not by a moderator reviewing
// every single one.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { field_note_id, helpful } = await req.json()
  if (!field_note_id || typeof helpful !== 'boolean') {
    return NextResponse.json({ error: 'field_note_id and helpful (true/false) required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('field_note_ratings')
    .select('id, helpful')
    .eq('field_note_id', field_note_id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    if (existing.helpful === helpful) return NextResponse.json({ ok: true, message: 'Already rated' })
    const { error } = await supabase.from('field_note_ratings').update({ helpful }).eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('field_note_ratings').insert({ field_note_id, user_id: user.id, helpful })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
export const dynamic = 'force-dynamic'
