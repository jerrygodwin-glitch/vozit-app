export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase-server'
import { Top, Nav } from '@/lib/ui'
import { FeedClient } from '@/components/feed/FeedClient'

export default async function Feed() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('reports')
    .select('*, user:users(id, username, display_name, tier, credibility_score)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(100)

  const reports = data || []

  // An unfolding story can have several update reports sharing a series_id.
  // Collapse those to their latest update (with a count) so the feed shows
  // one card per story instead of every update separately.
  const latestByStory = new Map<string, any>()
  const singles: any[] = []
  for (const r of reports) {
    if (!r.series_id) { singles.push(r); continue }
    const existing = latestByStory.get(r.series_id)
    if (!existing || (r.series_part || 1) > (existing.series_part || 1)) {
      latestByStory.set(r.series_id, r)
    }
  }
  const updateCounts = new Map<string, number>()
  for (const r of reports) {
    if (!r.series_id) continue
    updateCounts.set(r.series_id, (updateCounts.get(r.series_id) || 0) + 1)
  }
  const collapsed = [
    ...singles,
    ...[...latestByStory.values()].map(r => ({ ...r, update_count: updateCounts.get(r.series_id) })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="page" style={{ background: '#fff' }}>
      <Top />
      <FeedClient reports={collapsed} />
      <Nav active="/feed" />
    </div>
  )
}
