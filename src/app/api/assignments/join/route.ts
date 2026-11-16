// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { captureError } from '@/lib/monitoring'
import { sendPushNotification } from '@/lib/push-notifications'

// POST /api/assignments/join — a reporter joins an assignment. The
// assignment_contributors table has a "Self join" RLS policy (auth.uid() =
// user_id), so this can safely run on the regular user-scoped client.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { assignment_id } = await req.json()
    if (!assignment_id) return NextResponse.json({ error: 'assignment_id required' }, { status: 400 })

    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, status, created_by, title')
      .eq('id', assignment_id)
      .single()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    if (assignment.status !== 'active') return NextResponse.json({ error: 'This assignment is no longer active' }, { status: 400 })

    const { error } = await supabase.from('assignment_contributors').insert({
      assignment_id, user_id: user.id,
    })

    // Unique (assignment_id, user_id) violation just means they already
    // joined — treat that as success rather than an error.
    if (error && error.code !== '23505') throw error

    // Notify whoever created the assignment, not the joiner — reading
    // another user's device tokens needs the admin client, same reasoning
    // as the RLS-bypass note on getVozItAccounts()-style cross-user writes.
    if (!error && assignment.created_by && assignment.created_by !== user.id) {
      await sendPushNotification(createAdminClient(), assignment.created_by, {
        title: 'New contributor on your assignment',
        body: `Someone joined "${assignment.title}".`,
        data: { type: 'assignment_joined', assignmentId: assignment_id },
      })
    }

    return NextResponse.json({ ok: true, alreadyJoined: error?.code === '23505' })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/assignments/join', userId: user.id })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
