// @ts-nocheck
export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase-server'
import { ReportDetailClient } from './ReportDetailClient'
import type { Metadata } from 'next'

interface Props { params: { id: string } }

// Dynamic OG meta tags — this is what Facebook, X, TikTok see when someone shares a link
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerClient()
  const { data: report } = await supabase
    .from('reports')
    .select('*, user:users(username, display_name)')
    .eq('id', params.id)
    .single()

  if (!report) return { title: 'Report not found — VozIt' }

  const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/og?id=${params.id}`

  return {
    title: `${report.title} — VozIt`,
    description: `${report.what} in ${report.location_name}. Reported by @${report.user?.username}. WHO: ${report.who}. WHY: ${report.why}`,
    openGraph: {
      title: report.title,
      description: `${report.what} — reported by @${report.user?.username} from ${report.location_name}`,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/report/${params.id}`,
      siteName: 'VozIt',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: report.title }],
      type: 'article',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: report.title,
      description: `${report.what} — @${report.user?.username} from ${report.location_name}. "I was there."`,
      images: [ogImageUrl],
      creator: `@${report.user?.username}`,
      site: '@VozItApp',
    },
    // Additional meta for other platforms
    other: {
      'og:video': report.playback_id
        ? `https://stream.mux.com/${report.playback_id}.m3u8`
        : undefined,
      'og:video:type': 'application/x-mpegURL',
      'article:author': `@${report.user?.username}`,
      'article:published_time': report.created_at,
      'article:section': 'News',
      'article:tag': [report.who, report.what, report.location_name].join(','),
    } as Record<string, string | undefined>,
  }
}

export default async function ReportDetailPage({ params }: Props) {
  const supabase = createServerClient()

  const { data: report, error } = await supabase
    .from('reports')
    .select(`
      *,
      user:users(id, username, display_name, avatar_url, tier, credibility_score),
      assignment:assignments(id, title)
    `)
    .eq('id', params.id)
    .single()

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#1E5B8A' }}>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">Report not found</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>This report may have been removed or doesn't exist.</p>
        </div>
      </div>
    )
  }

  // Get related series reports
  let seriesReports: any[] = []
  if (report.series_id) {
    const { data } = await supabase
      .from('reports')
      .select('id, title, series_part, created_at')
      .eq('series_id', report.series_id)
      .eq('status', 'published')
      .order('series_part', { ascending: true })
    seriesReports = data ?? []
  }

  return <ReportDetailClient report={report} seriesReports={seriesReports} />
}
