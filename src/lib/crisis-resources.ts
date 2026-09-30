// Crisis-resource panel data. Localized to the VIEWER, not the depicted
// event — matches how YouTube/TikTok do this (a person watching, wherever
// they are, gets a resource for their own country, since that's who the
// panel can actually help). Country comes from Vercel's own edge geolocation
// header (x-vercel-ip-country), no separate lookup needed.
//
// Deliberately a SHORT, hand-verified list, not an attempt at global
// coverage — a wrong or stale crisis-line number is worse than no number.
// Every country not listed here falls back to findahelpline.com, a vetted
// directory covering 175+ countries that's actively maintained for exactly
// this purpose, rather than VozIt trying to own that data itself.
//
// Verified at time of writing (2026-09): confirm again periodically, since
// hotline numbers do change (e.g. Ukraine's Lifeline shortcode was found
// temporarily out of service during research for this feature, which is
// exactly why it's not hardcoded here — see fallback below).

export interface CrisisResource {
  name: string
  contact: string   // what to dial/text, shown as the primary action
  note?: string      // secondary detail (e.g. a regional exception)
  url: string
}

const FALLBACK: CrisisResource = {
  name: 'Find a Helpline',
  contact: 'findahelpline.com',
  note: 'A vetted directory of crisis lines in 175+ countries.',
  url: 'https://findahelpline.com',
}

const BY_COUNTRY: Record<string, CrisisResource> = {
  US: { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', url: 'https://988lifeline.org' },
  GB: { name: 'Samaritans', contact: 'Call 116 123 (free)', url: 'https://www.samaritans.org' },
  CA: { name: '988 Suicide Crisis Helpline', contact: 'Call or text 988', note: 'In Quebec: 1-866-APPELLE (1-866-277-3553)', url: 'https://988.ca' },
  AU: { name: 'Lifeline Australia', contact: 'Call 13 11 14', url: 'https://www.lifeline.org.au' },
}

// countryCode: ISO 3166-1 alpha-2, as delivered in the x-vercel-ip-country
// request header (e.g. "US", "GB"). Falls back to the global directory for
// any code not in the curated list above, a missing header, or bad input.
export function getCrisisResource(countryCode?: string | null): CrisisResource {
  if (!countryCode) return FALLBACK
  return BY_COUNTRY[countryCode.toUpperCase()] || FALLBACK
}
