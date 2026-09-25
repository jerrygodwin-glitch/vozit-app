// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { captureError } from '@/lib/monitoring'

// POST /api/tasks/submit — a reporter attaches their published report to a
// task they claimed. Fully automated by design (per how this was scoped):
// there's no manual review step here — submitting immediately marks the
// task completed and pays the reward. The tradeoff is real: nothing here
// checks that the footage actually satisfies the request beyond it being a
// real, published (already-moderated) report. If abuse becomes an issue,
// the natural fix is a review step between 'submitted' and 'completed'
// rather than paying out the instant a report is attached.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { task_id, report_id } = await req.json()
    if (!task_id || !report_id) return NextResponse.json({ error: 'task_id and report_id required' }, { status: 400 })

    const admin = createAdminClient()

    const { data: task } = await admin.from('tasks').select('id, claimed_by, status, reward_usd').eq('id', task_id).single()
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    if (task.claimed_by !== user.id) return NextResponse.json({ error: 'You have not claimed this task' }, { status: 403 })
    if (task.status !== 'claimed') return NextResponse.json({ error: `This task is ${task.status}, not claimed` }, { status: 400 })

    const { data: report } = await admin.from('reports').select('id, user_id, status').eq('id', report_id).single()
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    if (report.user_id !== user.id) return NextResponse.json({ error: 'That report is not yours' }, { status: 403 })
    if (report.status !== 'published') return NextResponse.json({ error: 'That report has not published yet' }, { status: 400 })

    // Claim-then-complete in one conditional update — if this task somehow
    // got completed between the check above and here, this update matches
    // zero rows instead of paying out twice.
    const { data: completed, error } = await admin
      .from('tasks')
      .update({ status: 'completed', report_id })
      .eq('id', task_id)
      .eq('status', 'claimed')
      .select()
      .single()

    if (error || !completed) return NextResponse.json({ error: 'This task is no longer available to submit' }, { status: 409 })

    await admin.from('payout_records').insert({
      user_id: user.id,
      amount_usd: task.reward_usd,
      source: 'task_reward',
      report_id,
      task_id,
      clears_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return NextResponse.json({ ok: true, reward: task.reward_usd })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/tasks/submit', userId: user.id })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
