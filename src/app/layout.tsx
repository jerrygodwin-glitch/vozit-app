import './globals.css'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import CookieConsent from '@/components/CookieConsent'
import GoogleAdsenseLoader from '@/components/GoogleAdsenseLoader'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-1085926458838222'

export const metadata = {
  title: 'VozIt! — I was there...',
  description: 'Citizen journalism platform — report what you see, earn what you capture',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#0a3ff1" />
        <meta name="google-adsense-account" content={ADSENSE_CLIENT_ID} />
      </head>
      <body>
        {children}
        {/* Google site-ownership verification for Ad Manager/AdSense signup —
            proves vozit.net belongs to this account. Stays unconditional/
            unconsented deliberately: Google's verification crawler never
            clicks a consent banner, so gating this specific tag on consent
            would likely break the verification Jerry already set up.
            next/script's afterInteractive strategy (Next.js's documented
            AdSense pattern) loads it once hydration is done, without
            blocking the initial HTML response a crawler reads. Doesn't by
            itself turn on any ads; VozIt's actual ad integration is the
            separate VAST-tag mid-roll system in /api/ads/get-ad, set via
            AD_NETWORK_VAST_URL once that's ready, and real AdSense
            display-ad units (once added) load through GoogleAdsenseLoader
            below, which IS consent-gated. */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <CookieConsent />
        <GoogleAdsenseLoader />
        <Analytics />
      </body>
    </html>
  )
}
