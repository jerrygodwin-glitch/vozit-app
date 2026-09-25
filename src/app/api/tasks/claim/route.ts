// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { captureError } from '@/lib/monitoring'

// POST /api/tasks/claim — a reporter claims an open one-shot task.
// The "Update own task" RLS policy only lets the task's CREATOR update it,
// not whoever is claiming it — so this runs through the admin client,
// gated by this route's own checks instead of RLS. The claim itself is
// race-safe: the update only succeeds if the task is still 'open' at the
// moment it runs, so two reporters claiming the same task at once can't
// both win.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { task_id } = await req.json()
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

    const admin = createAdminClient()
    const { data: task } = await admin.from('tasks').select('id, deadline, status').eq('id', task_id).single()
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    if (new Date(task.deadline) < new Date()) return NextResponse.json({ error: 'This task has passed its deadline' }, { status: 400 })

    const { data: claimed, error } = await admin
      .from('tasks')
      .update({ claimed_by: user.id, status: 'claimed' })
      .eq('id', task_id)
      .eq('status', 'open')
      .select()
      .single()

    if (error || !claimed) {
      return NextResponse.json({ error: 'This task was just claimed by someone else' }, { status: 409 })
    }

    return NextResponse.json({ ok: true, task: claimed })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/tasks/claim', userId: user.id })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
