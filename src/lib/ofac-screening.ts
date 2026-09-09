// @ts-nocheck
// OFAC SDN (Specially Designated Nationals) Screening
// Required for all US-based companies before processing any payout
// Uses the OFAC Sanctions Search API + local sanctions list checks

// Countries under comprehensive US sanctions (no payouts allowed)
export const SANCTIONED_COUNTRIES = [
  'IR', // Iran
  'CU', // Cuba
  'SY', // Syria
  'KP', // North Korea
  'RU', // Russia (partial — Crimea, Donetsk, Luhansk fully blocked)
] as const

// Regions within countries that are sanctioned
export const SANCTIONED_REGIONS: Record<string, string[]> = {
  UA: ['Crimea', 'Donetsk', 'Luhansk', 'Kherson', 'Zaporizhzhia'], // Occupied Ukraine
  RU: ['*'], // All of Russia for financial services
}

// Countries requiring enhanced screening (not blocked, but SDN check mandatory)
export const ENHANCED_SCREENING_COUNTRIES = [
  'VE', // Venezuela — individual sanctions, not comprehensive
  'IQ', // Iraq — partial sanctions
  'YE', // Yemen — Houthi-controlled areas sanctioned
  'LB', // Lebanon — Hezbollah-linked individuals sanctioned
  'PS', // Palestine — certain entities sanctioned
  'MM', // Myanmar — military junta sanctioned
  'BY', // Belarus
  'SO', // Somalia
  'SD', // Sudan
  'SS', // South Sudan
  'LY', // Libya
  'CD', // DRC
  'CF', // Central African Republic
]

export type ScreeningResult = {
  cleared: boolean
  blocked: boolean
  reason?: string
  matchType?: 'country_blocked' | 'region_blocked' | 'sdn_match' | 'fuzzy_match'
  matchDetails?: string
  requiresManualReview?: boolean
  screenedAt: string
  screeningId: string
}

// Generate a unique screening ID for audit trail
function generateScreeningId(): string {
  return `OFAC_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Step 1: Country-level check (instant)
export function screenCountry(countryCode: string, region?: string): ScreeningResult {
  const id = generateScreeningId()
  const now = new Date().toISOString()
  const cc = countryCode.toUpperCase()

  // Check comprehensive sanctions
  if ((SANCTIONED_COUNTRIES as readonly string[]).includes(cc)) {
    return {
      cleared: false,
      blocked: true,
      reason: `${cc} is under comprehensive US sanctions. Payouts prohibited under OFAC regulations.`,
      matchType: 'country_blocked',
      screenedAt: now,
      screeningId: id,
    }
  }

  // Check sanctioned regions within countries
  const sanctionedRegions = SANCTIONED_REGIONS[cc]
  if (sanctionedRegions && region) {
    const regionBlocked = sanctionedRegions.includes('*') ||
      sanctionedRegions.some(sr => region.toLowerCase().includes(sr.toLowerCase()))
    if (regionBlocked) {
      return {
        cleared: false,
        blocked: true,
        reason: `${region} in ${cc} is under US sanctions. Payouts prohibited.`,
        matchType: 'region_blocked',
        screenedAt: now,
        screeningId: id,
      }
    }
  }

  // Enhanced screening required
  if (ENHANCED_SCREENING_COUNTRIES.includes(cc)) {
    return {
      cleared: false,
      blocked: false,
      reason: `${cc} requires enhanced SDN screening before payout.`,
      requiresManualReview: false, // Will proceed to SDN name check
      screenedAt: now,
      screeningId: id,
    }
  }

  // Country is clear
  return { cleared: true, blocked: false, screenedAt: now, screeningId: id }
}

// Step 2: SDN Name search via OFAC API
export async function screenSDN(
  fullName: string,
  countryCode?: string,
  dateOfBirth?: string,
): Promise<ScreeningResult> {
  const id = generateScreeningId()
  const now = new Date().toISOString()

  // OFAC Sanctions List Search API (free, no key required)
  // https://sanctionssearch.ofac.treas.gov/
  try {
    const params = new URLSearchParams({
      name: fullName,
      type: 'individual',
      score: '85', // Minimum match score (0-100)
    })
    if (countryCode) params.set('country', countryCode)

    const res = await fetch(
      `https://search.ofac-api.com/v3?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.OFAC_API_KEY ? { 'apiKey': process.env.OFAC_API_KEY } : {}),
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      }
    )

    if (!res.ok) {
      // If API is unavailable, flag for manual review (fail-safe)
      return {
        cleared: false,
        blocked: false,
        reason: 'OFAC API unavailable. Flagged for manual compliance review.',
        requiresManualReview: true,
        screenedAt: now,
        screeningId: id,
      }
    }

    const data = await res.json()
    const matches = data.matches || data.results || []

    if (matches.length === 0) {
      return { cleared: true, blocked: false, screenedAt: now, screeningId: id }
    }

    // Check match quality
    const strongMatches = matches.filter((m: any) => (m.score || m.matchScore || 0) >= 95)
    const fuzzyMatches = matches.filter((m: any) => {
      const score = m.score || m.matchScore || 0
      return score >= 85 && score < 95
    })

    if (strongMatches.length > 0) {
      const match = strongMatches[0]
      return {
        cleared: false,
        blocked: true,
        reason: 'Strong match found on OFAC SDN list.',
        matchType: 'sdn_match',
        matchDetails: `Matched: ${match.name || match.fullName} (Score: ${match.score || match.matchScore}%)`,
        screenedAt: now,
        screeningId: id,
      }
    }

    if (fuzzyMatches.length > 0) {
      return {
        cleared: false,
        blocked: false,
        reason: 'Possible match on OFAC SDN list. Manual review required.',
        matchType: 'fuzzy_match',
        matchDetails: `${fuzzyMatches.length} possible match(es) found.`,
        requiresManualReview: true,
        screenedAt: now,
        screeningId: id,
      }
    }

    return { cleared: true, blocked: false, screenedAt: now, screeningId: id }
  } catch (e: any) {
    // Network error — fail safe, require manual review
    return {
      cleared: false,
      blocked: false,
      reason: `OFAC screening error: ${e.message}. Flagged for manual review.`,
      requiresManualReview: true,
      screenedAt: now,
      screeningId: id,
    }
  }
}

// Step 3: Full screening pipeline (country + SDN)
export async function fullPayoutScreening(params: {
  fullName: string
  countryCode: string
  region?: string
  dateOfBirth?: string
  amount: number
}): Promise<ScreeningResult> {
  // 1. Country-level check
  const countryResult = screenCountry(params.countryCode, params.region)
  if (countryResult.blocked) return countryResult

  // 2. SDN name check (for all payouts, not just enhanced countries)
  const sdnResult = await screenSDN(params.fullName, params.countryCode, params.dateOfBirth)

  // 3. For enhanced screening countries, require both checks to clear
  if (ENHANCED_SCREENING_COUNTRIES.includes(params.countryCode.toUpperCase())) {
    if (!sdnResult.cleared) return sdnResult
    // Additional: flag large payouts from enhanced countries for review
    if (params.amount > 500) {
      return {
        ...sdnResult,
        requiresManualReview: true,
        reason: `Large payout ($${params.amount}) from enhanced screening country ${params.countryCode}. Manual review recommended.`,
      }
    }
  }

  return sdnResult
}

// Store screening result for audit trail
export async function logScreeningResult(
  supabase: any,
  userId: string,
  payoutId: string,
  result: ScreeningResult,
) {
  await supabase.from('ofac_screenings').insert({
    user_id: userId,
    payout_id: payoutId,
    screening_id: result.screeningId,
    cleared: result.cleared,
    blocked: result.blocked,
    match_type: result.matchType || null,
    match_details: result.matchDetails || null,
    requires_review: result.requiresManualReview || false,
    reason: result.reason || null,
    screened_at: result.screenedAt,
  }) // Non-blocking — payout decision already made
}
