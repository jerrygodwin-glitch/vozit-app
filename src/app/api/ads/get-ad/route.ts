// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

// GET /api/ads/get-ad — returns a single ad creative to play at the mid-roll
// break. Pluggable by design: point AD_NETWORK_VAST_URL at any real
// VAST-compliant ad network (Google Ad Manager, PubMatic, Magnite,
// AdButler, Aniview, SpringServe all work this way) once one is set up.
// With nothing configured, this cleanly returns no ad rather than faking one.
export async function GET(req: NextRequest) {
  const vastUrl = process.env.AD_NETWORK_VAST_URL
  if (!vastUrl) return NextResponse.json({ ad: null })

  try {
    const res = await fetch(vastUrl, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return NextResponse.json({ ad: null })
    const xml = await res.text()

    // Minimal VAST parsing — extract the first linear <MediaFile> URL.
    // A missed bid or malformed response just means no ad plays; it never
    // blocks or delays the report's own video.
    const mediaFileMatch = xml.match(/<MediaFile[^>]*>\s*<!\[CDATA\[(.*?)\]\]>/s) || xml.match(/<MediaFile[^>]*>(.*?)<\/MediaFile>/s)
    const videoUrl = mediaFileMatch?.[1]?.trim()
    if (!videoUrl) return NextResponse.json({ ad: null })

    return NextResponse.json({ ad: { videoUrl, network: 'configured' } })
  } catch {
    return NextResponse.json({ ad: null })
  }
}
export const dynamic = 'force-dynamic'
