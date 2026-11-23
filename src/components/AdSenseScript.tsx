'use client'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { shouldLoadAds } from '@/lib/ads'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-1085926458838222'

// Site-ownership verification (the <meta name="google-adsense-account"> tag
// in the root layout's <head>) stays on every page regardless — that's a
// separate, harmless proof-of-ownership tag, not an ad-serving script. This
// component only controls whether the actual AdSense JS loads at all, so
// auth/upload/settings/embed pages never carry it in the first place.
export default function AdSenseScript() {
  const pathname = usePathname()
  if (!shouldLoadAds(pathname)) return null
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}
