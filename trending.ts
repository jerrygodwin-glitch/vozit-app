// @ts-nocheck
// Trending score algorithm
// Combines recency, vote velocity, credibility, and reporter tier
// Score decays over time (half-life ~6 hours)

const TIER_BOOST: Record<string, number> = {
  starter: 1.0,
  silver: 1.2,
  gold: 1.5,
  platinum: 2.0,
}

export function calculateTrendingScore(report: {
  upvotes: number
  downvotes: number
  credibility_pct: number
  created_at: string
  share_count?: number
  reporter_tier?: string
}): number {
  const now = Date.now()
  const created = new Date(report.created_at).getTime()
  const ageHours = (now - created) / (1000 * 60 * 60)

  // Net votes (weighted by credibility)
  const netVotes = report.upvotes - report.downvotes
  const credMultiplier = (report.credibility_pct || 80) / 100

  // Share bonus
  const shareBonus = Math.log2((report.share_count || 0) + 1) * 2

  // Reporter tier boost
  const tierBoost = TIER_BOOST[report.reporter_tier || 'starter'] || 1.0

  // Time decay (half-life of 6 hours)
  const decay = Math.pow(0.5, ageHours / 6)

  // Final score
  const rawScore = (netVotes * credMultiplier + shareBonus) * tierBoost
  const score = rawScore * decay

  return Math.round(score * 100) / 100
}

// Batch update trending scores for all active reports
export async function updateTrendingScores(supabase: any) {
  const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString()

  const { data: reports } = await supabase
    .from('reports')
    .select('id, upvotes, downvotes, credibility_pct, created_at, share_count, user:users(tier)')
    .gte('created_at', twentyFourHoursAgo)
    .eq('status', 'published')

  if (!reports?.length) return

  for (const r of reports) {
    const score = calculateTrendingScore({
      upvotes: r.upvotes || 0,
      downvotes: r.downvotes || 0,
      credibility_pct: r.credibility_pct || 80,
      created_at: r.created_at,
      share_count: r.share_count || 0,
      reporter_tier: r.user?.tier || 'starter',
    })

    await supabase.from('reports').update({ trending_score: score }).eq('id', r.id)
  }
}
