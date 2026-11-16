'use client'
import { useEffect, useState } from 'react'
import { Top } from '@/lib/ui'

const TC: Record<string, string> = { starter: '#22C55E', silver: '#64748B', gold: '#CA8A04', platinum: '#7C3AED' }

export default function BlockedAccounts() {
  const [blocked, setBlocked] = useState<any[] | null>(null)
  const [unblocking, setUnblocking] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/users/block').then(res => res.json()).then(d => setBlocked(d.blocked || [])).catch(() => setBlocked([]))
  }, [])

  async function unblock(blockedUserId: string) {
    setUnblocking(blockedUserId)
    try {
      const res = await fetch('/api/users/block', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedUserId }),
      })
      if (res.ok) setBlocked(prev => (prev || []).filter(b => b.blocked_id !== blockedUserId))
    } finally {
      setUnblocking(null)
    }
  }

  return (
    <div className="page"><Top />
      <div className="container">
        <a href="/settings" style={{ fontSize: 13, color: '#0a8fe8', marginBottom: 16, display: 'block' }}>← Settings</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Blocked accounts</h1>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>Blocked reporters' content is hidden from your feed and their profile. Unblock anytime.</p>
        {blocked === null ? (
          <div className="card" style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>Loading...</div>
        ) : blocked.length === 0 ? (
          <div className="card" style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>You haven't blocked anyone.</div>
        ) : blocked.map(b => (
          <div key={b.blocked_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: `linear-gradient(135deg,${TC[b.blocked?.tier] || TC.starter},${TC[b.blocked?.tier] || TC.starter}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700 }}>
              {(b.blocked?.display_name || b.blocked?.username || '?').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{b.blocked?.display_name || b.blocked?.username}</div>
              <div style={{ fontSize: 13, color: '#666' }}>@{b.blocked?.username}</div>
            </div>
            <button
              onClick={() => unblock(b.blocked_id)}
              disabled={unblocking === b.blocked_id}
              style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 14, border: '1px solid #ddd', background: '#fff', color: '#666', cursor: 'pointer', opacity: unblocking === b.blocked_id ? 0.6 : 1 }}
            >
              Unblock
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
