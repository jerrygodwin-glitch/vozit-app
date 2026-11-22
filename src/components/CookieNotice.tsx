'use client'
import { useEffect, useState } from 'react'

// A disclosure banner, not a consent gate — VozIt's login cookie is required
// for the site to function at all, so there's nothing to let someone opt out
// of here the way an ad-tracking consent banner would. This exists to meet
// the "tell people cookies are in use, with a link to the details" bar
// cookie law generally sets for cookies like these, not to block anything.
export default function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem('vozit_cookie_notice_seen')) setVisible(true)
    } catch { setVisible(true) }
  }, [])

  function dismiss() {
    setVisible(false)
    try { localStorage.setItem('vozit_cookie_notice_seen', '1') } catch {}
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 100,
      background: '#1a1a1a', color: '#eee', padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
      flexWrap: 'wrap', fontSize: 13,
    }}>
      <span style={{ maxWidth: 560 }}>
        VozIt uses cookies to keep you signed in and to support advertising. See our{' '}
        <a href="/policies/cookies" style={{ color: '#6fb8ff' }}>Cookie Policy</a> for details.
      </span>
      <button onClick={dismiss} className="btn btn-sm" style={{ background: '#fff', color: '#1a1a1a', flex: 'none' }}>
        Got it
      </button>
    </div>
  )
}
