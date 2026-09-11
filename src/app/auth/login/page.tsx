'use client'
import { useState } from 'react'
import { sb, LOGO } from '@/lib/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function go() {
    setLoading(true); setMsg('')
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password: pw })
      if (error) setMsg(error.message)
      else window.location.href = '/feed'
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
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" style={{ marginBottom: 24 }} />
        <button onClick={go} disabled={loading || !email || !pw} className="btn btn-primary" style={{ width: '100%' }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#999', marginTop: 16 }}>
          No account? <a href="/auth/register" style={{ color: '#FE3D07', fontWeight: 600 }}>Sign up</a>
        </p>
      </div>
    </div>
  )
}
