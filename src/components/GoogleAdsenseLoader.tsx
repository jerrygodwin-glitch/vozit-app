'use client'
import { useEffect } from 'react'

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.split('; ').find(c => c.startsWith(name + '='))
    return match ? decodeURIComponent(match.split('=')[1]) : null
  } catch { return null }
}

function loadAdsense() {
  if (document.getElementById('vozit-adsense-script')) return
  const script = document.createElement('script')
  script.id = 'vozit-adsense-script'
  script.async = true
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1085926458838222'
  script.crossOrigin = 'anonymous'
  document.head.appendChild(script)
}

// Previously this script sat unconditionally in layout.tsx's <head>, loading
// on every page regardless of consent — real finding from the Cookie Policy
// pass (see src/app/policies/cookies/page.tsx). Now it only loads once the
// visitor has actually clicked "Accept all" in CookieConsent, either on a
// later page load (cookie already set) or immediately via the custom event
// CookieConsent fires the moment they click it on this one.
export default function GoogleAdsenseLoader() {
  useEffect(() => {
    if (readCookie('vozit_consent') === 'all') loadAdsense()
    function onConsentChange(e: Event) {
      const value = (e as CustomEvent).detail
      if (value === 'all') loadAdsense()
    }
    window.addEventListener('vozit-consent-changed', onConsentChange)
    return () => window.removeEventListener('vozit-consent-changed', onConsentChange)
  }, [])

  return null
}
