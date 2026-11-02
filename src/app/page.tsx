// @ts-nocheck
import { createServerClient } from '@/lib/supabase-server'
import { LandingClient } from './LandingClient'

// Was a client component fetching reports/assignments in a useEffect —
// confirmed directly: that meant the server-rendered HTML always showed
// empty-state placeholders regardless of real data, since useEffect never
// runs during SSR. Invisible to any crawler that doesn't execute
// JavaScript, which Google's AdSense review crawler cited as a reason
// the site was rejected ("empty content"). Fetching here instead means
// real content is part of the initial HTML, same pattern already used by
// src/app/report/[id]/page.tsx.
export default async function Page() {
  const supabase = createServerClient()

  const { data: reports } = await supabase
    .from('reports')
    .select('*, user:users(id, username, display_name, tier, credibility_score)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(0, 49)

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, title, urgency, assignment_fee_pool_usd')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3)

  return <LandingClient reports={reports || []} assignments={assignments || []} />
}
