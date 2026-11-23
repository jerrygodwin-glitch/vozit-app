// @ts-nocheck
import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { excludeExclusiveHoldFilter } from '@/lib/exclusive-hold'

const BASE = 'https://www.vozit.net'

// Plain policy pages with no dynamic content — each gets a fixed
// lastModified since there's no per-page "updated at" to query; update this
// list if a new one gets added under src/app/policies/.
const STATIC_PAGES = [
  '', 'feed', 'assignments', 'licensing', 'search', 'contact', 'submit-telegram',
  'policies', 'terms', 'privacy',
  'policies/moderation', 'policies/cookies', 'policies/dmca',
  'policies/licensing-agreement', 'policies/contributor-agreement',
  'policies/refunds', 'policies/accessibility', 'policies/law-enforcement',
  'policies/safety', 'policies/ofac',
]

// A single sitemap file is capped at 50,000 URLs by the spec Google/Next.js
// both follow — static pages + reports + reporters is comfortably under
// that today. If VozIt's report/reporter counts ever approach that, this
// needs to split into multiple sitemaps via generateSitemaps(), not just
// raise these limits further.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map(path => ({
    url: path ? `${BASE}/${path}` : BASE,
    lastModified: new Date(),
  }))

  const { data: reports } = await supabase
    .from('reports')
    .select('id, updated_at, created_at')
    .eq('status', 'published')
    .or(excludeExclusiveHoldFilter())
    .order('created_at', { ascending: false })
    .limit(5000)

  const reportEntries: MetadataRoute.Sitemap = (reports || []).map(r => ({
    url: `${BASE}/report/${r.id}`,
    lastModified: new Date(r.updated_at || r.created_at),
  }))

  const { data: reporters } = await supabase
    .from('users')
    .select('username, updated_at')
    .eq('is_banned', false)
    .not('username', 'is', null)
    .limit(5000)

  const reporterEntries: MetadataRoute.Sitemap = (reporters || []).map(u => ({
    url: `${BASE}/reporter/${u.username}`,
    lastModified: new Date(u.updated_at || Date.now()),
  }))

  return [...staticEntries, ...reportEntries, ...reporterEntries]
}
