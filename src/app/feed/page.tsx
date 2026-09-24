// Cache the feed for 30s instead of hitting Supabase on every single view —
// this was previously force-dynamic AND used the cookie-bound server client,
// and reading cookies makes Next.js skip caching entirely regardless of any
// revalidate setting. The feed shows public, published reports only (no
// per-user data), so it uses the plain non-cookie client below instead,
// which is what actually makes the cache take effect.
export const revalidate = 30
import { supabase } from '@/lib/supabase'
import { Top, Nav } from '@/lib/ui'
import { FeedClient } from '@/components/feed/FeedClient'

const FEED_PAGE_SIZE = 30

export default async function Feed() {
  const { data } = await supabase
    .from('reports')
    .select('*, user:users(id, username, display_name, tier, credibility_score)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE)

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
      <FeedClient reports={collapsed} pageSize={FEED_PAGE_SIZE} />
      <Nav active="/feed" />
    </div>
  )
}
