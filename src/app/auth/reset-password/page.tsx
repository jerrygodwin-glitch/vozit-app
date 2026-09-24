'use client'
import { useState } from 'react'
import { LOGO } from '@/lib/ui'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function go() {
    setMsg('')
    if (password !== confirm) { setMsg('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail = data.details?.length ? `: ${data.details.join(', ')}` : ''
        setMsg((data.error || 'Something went wrong. Please try again.') + detail)
      } else {
        setDone(true)
        setTimeout(() => { window.location.href = '/auth/login' }, 2000)
      }
    } catch (e: any) { setMsg(e.message) }
    setLoading(false)
  }

  return (
    <div className="page" style={{ background: '#f0ebe4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card card-lg" style={{ maxWidth: 400, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={LOGO} alt="VozIt" style={{ height: 64, width: 64, borderRadius: 14, margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Set a new password</h1>
        </div>

        {done ? (
          <div style={{ background: '#ECFDF5', color: '#065F46', padding: 14, borderRadius: 12, fontSize: 13, textAlign: 'center' }}>
            Password updated. Redirecting to sign in...
          </div>
        ) : (
          <>
            {msg && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 16 }}>{msg}</div>}
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (8+ chars, upper + lower + number + symbol)" style={{ marginBottom: 16 }} />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" style={{ marginBottom: 24 }} />
            <button onClick={go} disabled={loading || !password || !confirm} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
