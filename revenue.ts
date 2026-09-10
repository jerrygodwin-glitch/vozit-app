// @ts-nocheck
import type { ReporterTier } from '@/types'

// Tier thresholds
const TIERS: Array<{
  tier: ReporterTier
  minReports: number
  minCredibility: number
  revenueShare: number
  color: string
}> = [
  { tier: 'starter',  minReports: 0,   minCredibility: 0,  revenueShare: 0.45, color: '#22C55E' },
  { tier: 'silver',   minReports: 26,  minCredibility: 80, revenueShare: 0.55, color: '#94A3B8' },
  { tier: 'gold',     minReports: 101, minCredibility: 90, revenueShare: 0.65, color: '#EAB308' },
  { tier: 'platinum', minReports: 500, minCredibility: 95, revenueShare: 0.70, color: '#8B5CF6' },
]

// Calculate what tier a reporter qualifies for
export function calculateTier(reportCount: number, credibilityScore: number): ReporterTier {
  let qualifiedTier: ReporterTier = 'starter'
  for (const t of TIERS) {
    if (reportCount >= t.minReports && credibilityScore >= t.minCredibility) {
      qualifiedTier = t.tier
    }
  }
  return qualifiedTier
}

// Get tier details
export function getTierDetails(tier: ReporterTier) {
  return TIERS.find(t => t.tier === tier) || TIERS[0]
}

// Get next tier requirements
export function getNextTier(currentTier: ReporterTier): {
  nextTier: ReporterTier | null
  reportsNeeded: number
  credibilityNeeded: number
} | null {
  const currentIdx = TIERS.findIndex(t => t.tier === currentTier)
  if (currentIdx >= TIERS.length - 1) return null
  const next = TIERS[currentIdx + 1]
  return {
    nextTier: next.tier,
    reportsNeeded: next.minReports,
    credibilityNeeded: next.minCredibility,
  }
}

// Get revenue share for a tier
export function getRevenueShare(tier: ReporterTier): number {
  return getTierDetails(tier).revenueShare
}

// Check if reporter should be promoted and update if so
export async function checkAndPromoteTier(supabase: any, userId: string): Promise<{
  promoted: boolean
  oldTier: ReporterTier
  newTier: ReporterTier
}> {
  const { data: user } = await supabase
    .from('users')
    .select('tier, report_count, credibility_score')
    .eq('id', userId)
    .single()

  if (!user) return { promoted: false, oldTier: 'starter', newTier: 'starter' }

  const oldTier = (user.tier || 'starter') as ReporterTier
  const newTier = calculateTier(user.report_count || 0, user.credibility_score || 0)

  if (newTier !== oldTier) {
    await supabase.from('users').update({ tier: newTier }).eq('id', userId)
    return { promoted: true, oldTier, newTier }
  }

  return { promoted: false, oldTier, newTier: oldTier }
}

// Calculate reporter earnings for a report
export function calculateEarnings(grossRevenue: number, tier: ReporterTier): number {
  const share = getRevenueShare(tier)
  return Math.round(grossRevenue * share * 100) / 100
}
