// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { captureError } from '@/lib/monitoring'

// POST /api/tasks/submit — a reporter attaches their published report to a
// task they claimed. Moves the task to 'submitted' for the creator to
// review (see /api/tasks/review) — payment only fires once they approve it.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { task_id, report_id } = await req.json()
    if (!task_id || !report_id) return NextResponse.json({ error: 'task_id and report_id required' }, { status: 400 })

    const admin = createAdminClient()

    const { data: task } = await admin.from('tasks').select('id, claimed_by, status').eq('id', task_id).single()
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    if (task.claimed_by !== user.id) return NextResponse.json({ error: 'You have not claimed this task' }, { status: 403 })
    if (task.status !== 'claimed') return NextResponse.json({ error: `This task is ${task.status}, not claimed` }, { status: 400 })

    const { data: report } = await admin.from('reports').select('id, user_id, status').eq('id', report_id).single()
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    if (report.user_id !== user.id) return NextResponse.json({ error: 'That report is not yours' }, { status: 403 })
    if (report.status !== 'published') return NextResponse.json({ error: 'That report has not published yet' }, { status: 400 })

    // Conditional update — if this task somehow changed state between the
    // check above and here, this matches zero rows instead of clobbering it.
    const { data: submitted, error } = await admin
      .from('tasks')
      .update({ status: 'submitted', report_id, review_feedback: null })
      .eq('id', task_id)
      .eq('status', 'claimed')
      .select()
      .single()

    if (error || !submitted) return NextResponse.json({ error: 'This task is no longer available to submit' }, { status: 409 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/tasks/submit', userId: user.id })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
