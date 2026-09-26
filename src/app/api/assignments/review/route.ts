// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { captureError } from '@/lib/monitoring'

// POST /api/assignments/review — the assignment's creator accepts or
// rejects a published, assignment-tagged report for payment. This never
// touches whether the report is published or visible — that's already
// decided by the normal publish flow and community voting. It only
// decides whether that specific report draws a fee from this org's pool.
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { report_id, decision, feedback } = await req.json()
    if (!report_id || !['approve', 'reject'].includes(decision)) {
      return NextResponse.json({ error: 'report_id and decision (approve|reject) required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: report } = await admin.from('reports').select('id, assignment_id, status, assignment_accepted, assignment_review_feedback').eq('id', report_id).single()
    if (!report || !report.assignment_id) return NextResponse.json({ error: 'Report not found or not tagged to an assignment' }, { status: 404 })
    if (report.status !== 'published') return NextResponse.json({ error: 'This report is not published yet' }, { status: 400 })
    if (report.assignment_accepted) return NextResponse.json({ error: 'This report was already accepted' }, { status: 400 })
    if (report.assignment_review_feedback) return NextResponse.json({ error: 'This report was already reviewed' }, { status: 400 })

    const { data: assignment } = await admin.from('assignments').select('id, created_by, assignment_fee_pool_usd').eq('id', report.assignment_id).single()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    if (assignment.created_by !== user.id) return NextResponse.json({ error: 'Only the assignment creator can review submissions' }, { status: 403 })
    if (Number(assignment.assignment_fee_pool_usd) <= 0) {
      return NextResponse.json({ error: 'This is an unfunded coverage request — there is nothing to accept or pay' }, { status: 400 })
    }

    if (decision === 'reject') {
      if (!feedback?.trim()) return NextResponse.json({ error: 'Please explain why this report was not accepted for payment' }, { status: 400 })
      const { data: updated, error } = await admin.from('reports')
        .update({ assignment_review_feedback: feedback.trim() })
        .eq('id', report_id).eq('assignment_accepted', false).is('assignment_review_feedback', null)
        .select().single()
      if (error || !updated) return NextResponse.json({ error: 'Could not update this report' }, { status: 409 })
      return NextResponse.json({ ok: true, status: 'rejected' })
    }

    // Approve — the pay_assignment_fee() DB trigger fires on this exact
    // update and handles the payout, pool debit, and contributor credit.
    const { data: updated, error } = await admin.from('reports')
      .update({ assignment_accepted: true })
      .eq('id', report_id).eq('assignment_accepted', false)
      .select().single()
    if (error || !updated) return NextResponse.json({ error: 'Could not update this report' }, { status: 409 })

    return NextResponse.json({ ok: true, status: 'accepted' })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/assignments/review', userId: user.id })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
