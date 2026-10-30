'use client'
import { useState, useEffect, useRef } from 'react'
import Script from 'next/script'
import { LOGO } from '@/lib/ui'
import { createBrowserClient } from '@/lib/supabase'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

function passwordChecks(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  }
}

export default function Register() {
  const [f, setF] = useState({ email: '', password: '', username: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Live username availability
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameNote, setUsernameNote] = useState('')
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current)
    if (!f.username.trim()) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')
    checkTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(f.username)}`)
        const d = await res.json()
        if (!d.available && d.reason) { setUsernameStatus('invalid'); setUsernameNote(d.reason) }
        else if (d.available) { setUsernameStatus('available'); setUsernameNote('') }
        else { setUsernameStatus('taken'); setUsernameNote('') }
      } catch { setUsernameStatus('idle') }
    }, 400)
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current) }
  }, [f.username])

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    ;(window as any).onTurnstileVerify = (token: string) => setTurnstileToken(token)
    return () => { delete (window as any).onTurnstileVerify }
  }, [])

  const pwChecks = passwordChecks(f.password)
  const pwValid = Object.values(pwChecks).every(Boolean)
  const pwScore = Object.values(pwChecks).filter(Boolean).length

  async function go() {
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: f.email,
          password: f.password,
          username: f.username,
          display_name: f.username,
          turnstile_token: turnstileToken || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail = data.details?.length ? `: ${data.details.join(', ')}` : ''
        setMsg((data.error || 'Something went wrong. Please try again.') + detail)
      } else {
        setMsg('Success! Check your email to verify.')
      }
    } catch (e: any) { setMsg(e.message) }
    setLoading(false)
  }

  const canSubmit = !loading && !!f.email && pwValid && usernameStatus === 'available' && (!TURNSTILE_SITE_KEY || !!turnstileToken)

  function oauth(provider: 'google' | 'facebook') {
    const sb = createBrowserClient()
    sb.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }

  return (
    <div className="page" style={{ background: '#f0ebe4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {TURNSTILE_SITE_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />}
      <div className="card card-lg" style={{ maxWidth: 400, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={LOGO} alt="VozIt" style={{ height: 64, width: 64, borderRadius: 14, margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Create Account</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4, fontStyle: 'italic' }}>I was there...</p>
        </div>
        {msg && <div style={{ background: msg.startsWith('Success') ? '#ECFDF5' : '#FEF2F2', color: msg.startsWith('Success') ? '#065F46' : '#DC2626', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 16 }}>{msg}</div>}

        <input value={f.username} onChange={e => setF({ ...f, username: e.target.value })} placeholder="Username" style={{ marginBottom: 4 }} />
        <div style={{ minHeight: 18, marginBottom: 12, fontSize: 11 }}>
          {usernameStatus === 'checking' && <span style={{ color: '#999' }}>Checking availability...</span>}
          {usernameStatus === 'available' && <span style={{ color: '#22C55E' }}>✓ Available — this is how you'll appear on your video watermarks</span>}
          {usernameStatus === 'taken' && <span style={{ color: '#DC2626' }}>✗ Already taken</span>}
          {usernameStatus === 'invalid' && <span style={{ color: '#DC2626' }}>{usernameNote}</span>}
        </div>

        <input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="Email" style={{ marginBottom: 16 }} />

        <div style={{ position: 'relative', marginBottom: 4 }}>
          <input type={showPw ? 'text' : 'password'} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="Password" style={{ width: '100%', paddingRight: 60 }} />
          <span onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#0a8fe8', cursor: 'pointer' }}>{showPw ? 'Hide' : 'Show'}</span>
        </div>
        {f.password && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < pwScore ? (pwScore <= 2 ? '#DC2626' : pwScore <= 4 ? '#CA8A04' : '#22C55E') : '#eee' }} />
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#999', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ color: pwChecks.length ? '#22C55E' : '#999' }}>{pwChecks.length ? '✓' : '·'} 8+ chars</span>
              <span style={{ color: pwChecks.upper ? '#22C55E' : '#999' }}>{pwChecks.upper ? '✓' : '·'} uppercase</span>
              <span style={{ color: pwChecks.lower ? '#22C55E' : '#999' }}>{pwChecks.lower ? '✓' : '·'} lowercase</span>
              <span style={{ color: pwChecks.number ? '#22C55E' : '#999' }}>{pwChecks.number ? '✓' : '·'} number</span>
              <span style={{ color: pwChecks.symbol ? '#22C55E' : '#999' }}>{pwChecks.symbol ? '✓' : '·'} symbol</span>
            </div>
          </div>
        )}

        {TURNSTILE_SITE_KEY && (
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-callback="onTurnstileVerify" style={{ marginTop: 8, marginBottom: 16 }} />
        )}
        <button onClick={go} disabled={!canSubmit} className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
          {loading ? 'Creating...' : 'Create account'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
          <span style={{ fontSize: 11, color: '#999' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
        </div>
        {/* Was an external https://www.google.com/favicon.ico — blocked
            silently by the CSP's img-src allowlist (google.com was never
            on it), which showed as a broken-image icon. Inline SVG of the
            actual Google "G" mark instead of their site favicon — correct
            logo, no network request, nothing for CSP to block. */}
        <button onClick={() => oauth('google')} style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>
        <button onClick={() => oauth('facebook')} style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Continue with Facebook
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#999', marginTop: 16 }}>
          Have an account? <a href="/auth/login" style={{ color: '#FE3D07', fontWeight: 600 }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
