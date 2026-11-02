// @ts-nocheck
import { createServerClient } from '@/lib/supabase-server'
import { AssignmentsClient } from './AssignmentsClient'

// Was entirely client-fetched — confirmed directly (same issue found on
// the homepage): the raw server-rendered HTML always showed "No active
// assignments right now" regardless of real data, since the fetch never
// runs during SSR. The review queue / your-submissions / join-vote-fund
// parts are genuinely user-specific and can't be meaningfully
// pre-rendered for an anonymous crawler anyway, so only the public
// assignments list is fetched here — same query /api/assignments'
// GET handler runs — and handed down as a starting point; the client
// component still refreshes everything (including this list) on mount.
export default async function Page() {
  const supabase = createServerClient()

  const { data: assignments } = await supabase
    .from('assignments')
    .select('*, creator:users!created_by(id, username, display_name, avatar_url, tier), angles:assignment_angles(id, title, report_count), contributors:assignment_contributors(id, user_id, reports_filed, total_earned, user:users(id, username, display_name, avatar_url, tier, credibility_score)), votes:assignment_votes(user_id)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(30)

  return <AssignmentsClient initialAssignments={assignments || []} />
}
