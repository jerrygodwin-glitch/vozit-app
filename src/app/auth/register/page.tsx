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
        <button onClick={() => oauth('google')} style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <img src="https://www.google.com/favicon.ico" alt="" style={{ width: 16, height: 16 }} /> Continue with Google
        </button>
        <button onClick={() => oauth('facebook')} style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ color: '#1877F2', fontWeight: 800 }}>f</span> Continue with Facebook
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#999', marginTop: 16 }}>
          Have an account? <a href="/auth/login" style={{ color: '#FE3D07', fontWeight: 600 }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
