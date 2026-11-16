'use client'
// Small client-side action for an otherwise server-rendered profile page.
// Reloads on success rather than managing client state, since this is a
// rare, low-frequency action — not worth the extra complexity of syncing
// local state with the server-rendered reports grid above it.
import { useState } from 'react'

export default function BlockReporterButton({ reporterId, reporterName, initiallyBlocked }: {
  reporterId: string
  reporterName: string
  initiallyBlocked: boolean
}) {
  const [loading, setLoading] = useState(false)

  async function toggleBlock() {
    if (initiallyBlocked) {
      if (!confirm(`Unblock ${reporterName}? You'll see their reports again.`)) return
    } else {
      if (!confirm(`Block ${reporterName}? You won't see their reports anymore, and this can be undone anytime.`)) return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/users/block', {
        method: initiallyBlocked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedUserId: reporterId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Something went wrong')
        setLoading(false)
        return
      }
      location.reload()
    } catch {
      alert('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleBlock}
      disabled={loading}
      style={{
        fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 14,
        border: initiallyBlocked ? 'none' : '1px solid #ddd',
        background: initiallyBlocked ? '#DC2626' : '#fff',
        color: initiallyBlocked ? '#fff' : '#666',
        cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
      }}
    >
      {initiallyBlocked ? 'Unblock' : 'Block'}
    </button>
  )
}
