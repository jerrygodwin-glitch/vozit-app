import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import CookieConsent from '@/components/CookieConsent'
import GoogleAdsenseLoader from '@/components/GoogleAdsenseLoader'
import AdSenseScript from '@/components/AdSenseScript'

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
        {/* AdSense's own JS only loads on real content pages (AdSenseScript
            checks the route via shouldLoadAds()) — login/register/upload/
            settings/embed are thin, mostly-chrome pages that previously
            carried this unconditionally, which is exactly what AdSense's
            "Google-served ads on screens without publisher-content" policy
            flags. Site-ownership verification doesn't depend on this script
            at all — the <meta name="google-adsense-account"> tag above
            covers that on every page regardless, so narrowing this doesn't
            touch the verification Jerry already has confirmed working.
            VozIt's actual ad integration is the separate VAST-tag mid-roll
            system in /api/ads/get-ad, set via AD_NETWORK_VAST_URL once
            that's ready, and real AdSense display-ad units (once added)
            load through GoogleAdsenseLoader below, which IS consent-gated. */}
        <AdSenseScript />
        <CookieConsent />
        <GoogleAdsenseLoader />
        <Analytics />
      </body>
    </html>
  )
}
