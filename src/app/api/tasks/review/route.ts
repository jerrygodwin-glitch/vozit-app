// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { captureError } from '@/lib/monitoring'

// POST /api/tasks/review — the task's creator approves or rejects a
// submission. Approve pays the reward (real earnings, 7-day hold). Reject
// sends it back to the reporter as 'claimed' (they keep their claim and
// can fix + resubmit before the deadline) along with the creator's
// feedback on why it wasn't accepted.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { task_id, decision, feedback } = await req.json()
    if (!task_id || !['approve', 'reject'].includes(decision)) {
      return NextResponse.json({ error: 'task_id and decision (approve|reject) required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: task } = await admin.from('tasks').select('id, created_by, claimed_by, status, reward_usd, report_id').eq('id', task_id).single()
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    if (task.created_by !== user.id) return NextResponse.json({ error: 'Only the task creator can review submissions' }, { status: 403 })
    if (task.status !== 'submitted') return NextResponse.json({ error: `This task is ${task.status}, not awaiting review` }, { status: 400 })

    if (decision === 'reject') {
      if (!feedback?.trim()) return NextResponse.json({ error: 'Please explain why this submission was not accepted' }, { status: 400 })

      const { data: updated, error } = await admin
        .from('tasks')
        .update({ status: 'claimed', review_feedback: feedback.trim(), reviewed_at: new Date().toISOString(), report_id: null })
        .eq('id', task_id)
        .eq('status', 'submitted')
        .select()
        .single()
      if (error || !updated) return NextResponse.json({ error: 'Could not update this task' }, { status: 409 })

      return NextResponse.json({ ok: true, status: 'claimed' })
    }

    // Approve — conditional update guards against double-processing
    // (e.g. a double-click), same pattern used for claim/submit.
    const { data: completed, error } = await admin
      .from('tasks')
      .update({ status: 'completed', reviewed_at: new Date().toISOString() })
      .eq('id', task_id)
      .eq('status', 'submitted')
      .select()
      .single()
    if (error || !completed) return NextResponse.json({ error: 'Could not update this task' }, { status: 409 })

    await admin.from('payout_records').insert({
      user_id: task.claimed_by,
      amount_usd: task.reward_usd,
      source: 'task_reward',
      report_id: task.report_id,
      task_id,
      clears_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return NextResponse.json({ ok: true, status: 'completed' })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/tasks/review', userId: user.id })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
