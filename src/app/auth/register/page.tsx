'use client'
import { useState } from 'react'
import { sb, LOGO } from '@/lib/ui'

export default function Register() {
  const [f, setF] = useState({ email: '', password: '', username: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function go() {
    setLoading(true); setMsg('')
    try {
      const { error } = await sb.auth.signUp({ email: f.email, password: f.password, options: { data: { username: f.username.toLowerCase(), display_name: f.username } } })
      if (error) setMsg(error.message)
      else setMsg('Success! Check your email to verify.')
    } catch (e: any) { setMsg(e.message) }
    setLoading(false)
  }

  return (
    <div className="page" style={{ background: '#f0ebe4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card card-lg" style={{ maxWidth: 400, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={LOGO} alt="VozIt" style={{ height: 64, width: 64, borderRadius: 14, margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Create Account</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4, fontStyle: 'italic' }}>I was there...</p>
        </div>
        {msg && <div style={{ background: msg.startsWith('Success') ? '#ECFDF5' : '#FEF2F2', color: msg.startsWith('Success') ? '#065F46' : '#DC2626', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 16 }}>{msg}</div>}
        <input value={f.username} onChange={e => setF({ ...f, username: e.target.value })} placeholder="Username" style={{ marginBottom: 16 }} />
        <input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="Email" style={{ marginBottom: 16 }} />
        <input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="Password (min 6 characters)" style={{ marginBottom: 24 }} />
        <button onClick={go} disabled={loading || !f.email || !f.password || !f.username} className="btn btn-primary" style={{ width: '100%' }}>
          {loading ? 'Creating...' : 'Create account'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#999', marginTop: 16 }}>
          Have an account? <a href="/auth/login" style={{ color: '#FE3D07', fontWeight: 600 }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
