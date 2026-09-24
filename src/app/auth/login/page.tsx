'use client'
import { useState } from 'react'
import { LOGO } from '@/lib/ui'
import { createBrowserClient } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  function oauth(provider: 'google' | 'facebook') {
    const sb = createBrowserClient()
    sb.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }

  async function go() {
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.requiresVerification) window.location.href = `/auth/verify?email=${encodeURIComponent(data.email || email)}`
        else setMsg(data.error || 'Something went wrong. Please try again.')
      } else window.location.href = '/feed'
    } catch (e: any) { setMsg(e.message) }
    setLoading(false)
  }

  return (
    <div className="page" style={{ background: '#f0ebe4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card card-lg" style={{ maxWidth: 400, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={LOGO} alt="VozIt" style={{ height: 64, width: 64, borderRadius: 14, margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4, fontStyle: 'italic' }}>I was there...</p>
        </div>
        {msg && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 16 }}>{msg}</div>}
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{ marginBottom: 16 }} />
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" style={{ marginBottom: 8 }} />
        <p style={{ textAlign: 'right', fontSize: 12, marginBottom: 16 }}>
          <a href="/auth/forgot-password" style={{ color: '#0a8fe8' }}>Forgot password?</a>
        </p>
        <button onClick={go} disabled={loading || !email || !pw} className="btn btn-primary" style={{ width: '100%' }}>
          {loading ? 'Signing in...' : 'Sign in'}
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
          No account? <a href="/auth/register" style={{ color: '#FE3D07', fontWeight: 600 }}>Sign up</a>
        </p>
      </div>
    </div>
  )
}
