'use client'
import { useState } from 'react'
import { LOGO } from '@/lib/ui'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function go() {
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) setMsg(data.error || 'Something went wrong. Please try again.')
      else setSent(true)
    } catch (e: any) { setMsg(e.message) }
    setLoading(false)
  }

  return (
    <div className="page" style={{ background: '#f0ebe4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card card-lg" style={{ maxWidth: 400, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={LOGO} alt="VozIt" style={{ height: 64, width: 64, borderRadius: 14, margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Reset your password</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>We'll email you a link to set a new one.</p>
        </div>

        {sent ? (
          <div style={{ background: '#ECFDF5', color: '#065F46', padding: 14, borderRadius: 12, fontSize: 13, textAlign: 'center' }}>
            If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox.
          </div>
        ) : (
          <>
            {msg && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 16 }}>{msg}</div>}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{ marginBottom: 24 }} />
            <button onClick={go} disabled={loading || !email} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: '#999', marginTop: 16 }}>
          <a href="/auth/login" style={{ color: '#FE3D07', fontWeight: 600 }}>Back to sign in</a>
        </p>
      </div>
    </div>
  )
}
