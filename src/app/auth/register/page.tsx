'use client'
import { useState, useEffect } from 'react'
import Script from 'next/script'
import { LOGO } from '@/lib/ui'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export default function Register() {
  const [f, setF] = useState({ email: '', password: '', username: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    ;(window as any).onTurnstileVerify = (token: string) => setTurnstileToken(token)
    return () => { delete (window as any).onTurnstileVerify }
  }, [])

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
        <input value={f.username} onChange={e => setF({ ...f, username: e.target.value })} placeholder="Username" style={{ marginBottom: 16 }} />
        <input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="Email" style={{ marginBottom: 16 }} />
        <input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="Password (8+ chars, upper + lower + number + symbol)" style={{ marginBottom: 16 }} />
        {TURNSTILE_SITE_KEY && (
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-callback="onTurnstileVerify" style={{ marginBottom: 16 }} />
        )}
        <button onClick={go} disabled={loading || !f.email || !f.password || !f.username || (!!TURNSTILE_SITE_KEY && !turnstileToken)} className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
          {loading ? 'Creating...' : 'Create account'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#999', marginTop: 16 }}>
          Have an account? <a href="/auth/login" style={{ color: '#FE3D07', fontWeight: 600 }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
