// @ts-nocheck
// Applies the same 1/2/3/4 strike escalation the human admin queue uses
// (src/app/api/admin/moderation/route.ts 'remove' action) — shared so an
// automated Hive decision and a moderator's manual decision never drift
// into two different escalation ladders. If you change the thresholds
// here, change them there too (or vice versa).
export async function applyStrike(admin: any, params: {
  userId: string
  reportId?: string | null
  reason: string
}): Promise<{ strikeCount: number; isSuspended: boolean; actionLabel: string }> {
  const { data: target } = await admin
    .from('users')
    .select('strike_count, is_suspended')
    .eq('id', params.userId)
    .single()

  const strikeCount = (target?.strike_count ?? 0) + 1
  let isSuspended = target?.is_suspended ?? false
  let actionLabel = ''

  if (strikeCount >= 4) {
    isSuspended = true
    actionLabel = 'Removed + PERMANENT BAN (strike 4)'
    // Forfeit all pending earnings platform-wide — same as a human-issued remove_ban.
    await admin.from('payout_records').update({ status: 'failed' })
      .eq('user_id', params.userId).in('status', ['pending', 'cleared'])
    await admin.from('users').update({ pending_payout: 0 }).eq('id', params.userId)
  } else if (strikeCount === 3) {
    isSuspended = true
    actionLabel = 'Removed + 30-day suspension (strike 3)'
  } else if (strikeCount === 2) {
    actionLabel = 'Removed + 7-day restriction (strike 2)'
  } else {
    actionLabel = 'Removed + warning (strike 1)'
  }

  await admin.from('users').update({
    strike_count: strikeCount,
    is_suspended: isSuspended,
    updated_at: new Date().toISOString(),
  }).eq('id', params.userId)

  // moderator_id is null here — this is the automated-decision marker,
  // distinguishing a Hive auto-strike from a human's decision in the same log.
  await admin.from('moderation_log').insert({
    moderator_id: null,
    report_id: params.reportId ?? null,
    target_user_id: params.userId,
    action: 'auto_strike',
    reason: params.reason,
    notes: 'Automated: high-confidence Hive AI moderation match, no human review',
    result: actionLabel,
    strike_count_after: strikeCount,
  })

  return { strikeCount, isSuspended, actionLabel }
}
