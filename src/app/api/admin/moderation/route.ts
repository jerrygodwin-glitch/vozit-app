// @ts-nocheck
import { logAdminAction, isAdminIpAllowed } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

// Verify the user is a moderator
async function requireMod(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!isAdminIpAllowed(ip)) {
    return { error: 'Admin access is not permitted from this network.', status: 403 }
  }

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['moderator', 'admin'].includes(profile.role ?? '')) {
    return { error: 'Not a moderator', status: 403 }
  }

  return { user, admin, ip }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/admin/moderation — get moderation queue + stats
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = await requireMod(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') ?? 'queue'   // queue | audit | stats | history
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20

  // ── Queue: flagged reports awaiting review ──
  if (view === 'queue') {
    const { data: flagged, count } = await admin
      .from('reports')
      .select(`
        *, user:users(id, username, display_name, avatar_url, tier, credibility_score, strike_count, report_count, is_suspended),
        assignment:assignments(id, title)
      `, { count: 'exact' })
      .eq('status', 'flagged')
      .order('created_at', { ascending: true })  // oldest first
      .range((page - 1) * limit, page * limit - 1)

    return NextResponse.json({
      view: 'queue',
      reports: flagged ?? [],
      total: count ?? 0,
      page,
      perPage: limit,
    })
  }

  // ── Audit: random sample of published reports ──
  if (view === 'audit') {
    const { data: sample } = await admin
      .from('reports')
      .select(`
        *, user:users(id, username, display_name, avatar_url, tier, credibility_score, strike_count)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(10)

    // Shuffle for randomness (simple Fisher-Yates on small set)
    const shuffled = [...(sample ?? [])]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return NextResponse.json({
      view: 'audit',
      reports: shuffled.slice(0, 5),
    })
  }

  // ── Stats: moderation overview ──
  if (view === 'stats') {
    const [
      { count: totalReports },
      { count: flaggedCount },
      { count: removedCount },
      { count: suspendedUsers },
      { count: bannedUsers },
    ] = await Promise.all([
      admin.from('reports').select('*', { count: 'exact', head: true }),
      admin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'flagged'),
      admin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'removed'),
      admin.from('users').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
      admin.from('users').select('*', { count: 'exact', head: true }).gte('strike_count', 4),
    ])

    // Recent moderation actions
    const { data: recentActions } = await admin
      .from('moderation_log')
      .select('*, moderator:users!moderator_id(username), report:reports(title)')
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      view: 'stats',
      stats: {
        totalReports: totalReports ?? 0,
        flaggedInQueue: flaggedCount ?? 0,
        totalRemoved: removedCount ?? 0,
        suspendedUsers: suspendedUsers ?? 0,
        bannedUsers: bannedUsers ?? 0,
      },
      recentActions: recentActions ?? [],
    })
  }

  // ── History: past moderation actions ──
  if (view === 'history') {
    const { data: actions, count } = await admin
      .from('moderation_log')
      .select(`
        *,
        moderator:users!moderator_id(id, username, display_name),
        report:reports(id, title, user_id),
        reporter:users!target_user_id(id, username, display_name, strike_count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    return NextResponse.json({
      view: 'history',
      actions: actions ?? [],
      total: count ?? 0,
      page,
    })
  }

  return NextResponse.json({ error: 'Invalid view' }, { status: 400 })
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/admin/moderation — take action on a report
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const auth = await requireMod(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { user, admin, ip } = auth

  const { report_id, action, reason, notes } = await req.json()

  if (!report_id || !action) {
    return NextResponse.json({ error: 'report_id and action required' }, { status: 400 })
  }

  const validActions = ['restore', 'remove', 'remove_warn', 'remove_ban', 'keep_flagged']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Use: ' + validActions.join(', ') }, { status: 400 })
  }

  // Fetch the report and reporter
  const { data: report } = await admin
    .from('reports')
    .select('id, user_id, title, status')
    .eq('id', report_id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const { data: reporter } = await admin
    .from('users')
    .select('id, username, strike_count, is_suspended, pending_payout')
    .eq('id', report.user_id)
    .single()

  if (!reporter) return NextResponse.json({ error: 'Reporter not found' }, { status: 404 })

  let newReportStatus = report.status
  let newStrikeCount = reporter.strike_count
  let isSuspended = reporter.is_suspended
  let actionLabel = ''

  // ── RESTORE: put back to published ──
  if (action === 'restore') {
    newReportStatus = 'published'
    actionLabel = 'Restored to feed'
  }

  // ── KEEP FLAGGED: leave in flagged state ──
  if (action === 'keep_flagged') {
    newReportStatus = 'flagged'
    actionLabel = 'Kept flagged'
  }

  // ── REMOVE + WARNING (strike 1) ──
  if (action === 'remove_warn') {
    newReportStatus = 'removed'
    newStrikeCount = reporter.strike_count + 1
    actionLabel = 'Removed + warning (strike ' + newStrikeCount + ')'
  }

  // ── REMOVE (standard — adds strike, escalates) ──
  if (action === 'remove') {
    newReportStatus = 'removed'
    newStrikeCount = reporter.strike_count + 1

    // Escalate based on strike count
    if (newStrikeCount >= 4) {
      isSuspended = true
      actionLabel = 'Removed + PERMANENT BAN (strike 4)'
    } else if (newStrikeCount === 3) {
      isSuspended = true
      actionLabel = 'Removed + 30-day suspension (strike 3)'
    } else if (newStrikeCount === 2) {
      actionLabel = 'Removed + 7-day restriction (strike 2)'
    } else {
      actionLabel = 'Removed + warning (strike 1)'
    }
  }

  // ── REMOVE + INSTANT BAN (for AI content) ──
  if (action === 'remove_ban') {
    newReportStatus = 'removed'
    newStrikeCount = 4
    isSuspended = true
    actionLabel = 'Removed + PERMANENT BAN (AI content)'

    // Forfeit all pending earnings
    await admin
      .from('payout_records')
      .update({ status: 'failed' })
      .eq('user_id', report.user_id)
      .in('status', ['pending', 'cleared'])

    await admin
      .from('users')
      .update({ pending_payout: 0 })
      .eq('id', report.user_id)
  }

  // Apply report status change
  await admin
    .from('reports')
    .update({
      status: newReportStatus,
      removal_reason: reason ?? action,
      updated_at: new Date().toISOString(),
    })
    .eq('id', report_id)

  // Apply user strike/suspension
  await admin
    .from('users')
    .update({
      strike_count: newStrikeCount,
      is_suspended: isSuspended,
      updated_at: new Date().toISOString(),
    })
    .eq('id', report.user_id)

  // Log the action
  await admin
    .from('moderation_log')
    .insert({
      moderator_id: user.id,
      report_id,
      target_user_id: report.user_id,
      action,
      reason: reason ?? null,
      notes: notes ?? null,
      result: actionLabel,
      strike_count_after: newStrikeCount,
    })

  // Admin audit trail — separate from moderation_log, covers all admin actions platform-wide
  await logAdminAction(admin, {
    adminId: user.id,
    action,
    targetType: 'report',
    targetId: report_id,
    details: { reason: reason ?? null, notes: notes ?? null, result: actionLabel, target_user_id: report.user_id },
    ipAddress: ip,
  })

  return NextResponse.json({
    ok: true,
    action: actionLabel,
    report_status: newReportStatus,
    reporter: {
      username: reporter.username,
      strike_count: newStrikeCount,
      is_suspended: isSuspended,
    },
  })
}
export const dynamic = 'force-dynamic'
