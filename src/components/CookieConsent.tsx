'use client'
import { useEffect, useState } from 'react'

const COOKIE_NAME = 'vozit_consent'
const ONE_YEAR = 60 * 60 * 24 * 365

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.split('; ').find(c => c.startsWith(name + '='))
    return match ? decodeURIComponent(match.split('=')[1]) : null
  } catch { return null }
}

function writeCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${ONE_YEAR}; path=/; samesite=lax`
  } catch {}
}

// Real consent gate, not just a disclosure — Google's AdSense script (loaded
// by GoogleAdsenseLoader, see layout.tsx) only ever loads after "Accept all"
// here. There's genuinely nothing to opt out of for VozIt's login cookie
// itself (the site can't function signed-in without it), so this banner's
// actual job is gating the one thing that IS optional: advertising cookies.
export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [isEu, setIsEu] = useState(false)

  useEffect(() => {
    if (!readCookie(COOKIE_NAME)) setVisible(true)
    setIsEu(readCookie('vozit_region') === 'eu')
  }, [])

  function choose(value: 'all' | 'essential') {
    writeCookie(COOKIE_NAME, value)
    setVisible(false)
    window.dispatchEvent(new CustomEvent('vozit-consent-changed', { detail: value }))
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 100,
      background: '#fff', boxShadow: '0 -2px 16px rgba(0,0,0,0.12)',
      padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 16, flexWrap: 'wrap', fontFamily: 'Inter, sans-serif',
    }}>
      <span style={{ maxWidth: 560, fontSize: 13, color: '#333', lineHeight: 1.5 }}>
        VozIt uses cookies to keep you signed in and to support advertising that
        funds reporter payouts.{' '}
        <a href="/policies/cookies" style={{ color: '#0a8fe8' }}>Learn more</a>.
      </span>
      <div style={{ display: 'flex', gap: 10, flex: 'none', flexDirection: isEu ? 'row-reverse' : 'row' }}>
        <button
          onClick={() => choose('essential')}
          style={{
            padding: '9px 16px', borderRadius: 12, border: '1px solid #ddd',
            background: '#fff', color: '#333', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Essential only
        </button>
        <button
          onClick={() => choose('all')}
          style={{
            padding: '9px 16px', borderRadius: 12, border: 'none',
            background: '#22C55E', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Accept all
        </button>
      </div>
    </div>
  )
}
