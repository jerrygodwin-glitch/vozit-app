'use client'
import { useState, useEffect } from 'react'
import { Nav, Top } from '@/lib/ui'
import { useAuth } from '@/hooks/useAuth'

const UC: any = { critical: { bg: '#FEF2F2', c: '#DC2626', l: 'Critical' }, high: { bg: '#FEF3E6', c: '#D97706', l: 'High' }, medium: { bg: '#FFF8E6', c: '#B8860B', l: 'Ongoing' } }

export default function Assignments() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/assignments')
      const d = await res.json()
      setAssignments(d.assignments || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function join(id: string) {
    setJoining(id); setMsg('')
    try {
      const res = await fetch('/api/assignments/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: id }),
      })
      const d = await res.json()
      if (!res.ok) setMsg(d.error || 'Could not join assignment')
      else await load()
    } catch (e: any) { setMsg(e.message) }
    setJoining(null)
  }

  return (
    <div className="page" style={{ background: '#fff' }}>
      <Top />
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Assignments</div>
        <div style={{ fontSize: 13, color: '#666' }}>Ongoing assignments with fees</div>
      </div>
      <div className="container" style={{ padding: '12px 16px' }}>
        {msg && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{msg}</div>}
        {loading ? <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Loading...</p> : assignments.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>No active assignments right now.</p>
        ) : assignments.map(a => {
          const u = UC[a.urgency] || UC.medium
          const alreadyJoined = (a.contributors || []).some((c: any) => c.user_id === user?.id)
          return (
            <div key={a.id} className="card" style={{ borderLeft: '3px solid ' + u.c, borderRadius: '0 12px 12px 0' }}>
              <span style={{ background: u.bg, color: u.c, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>{u.l}</span>
              <div style={{ fontSize: 15, fontWeight: 600, margin: '6px 0' }}>{a.title}</div>
              {a.description && <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{a.description}</div>}
              <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                {a.contributor_count || 0} reporters · {a.report_count || 0} reports
                {a.regions?.length > 0 && ` · ${a.regions.join(', ')}`}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#065F46' }}>${Number(a.assignment_fee_per_report_usd || 0).toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: '#999' }}> /report</span>
                </div>
                {alreadyJoined
                  ? <span style={{ fontSize: 12, fontWeight: 600, color: '#22C55E' }}>✓ Joined</span>
                  : <button onClick={() => join(a.id)} disabled={joining === a.id} className="btn btn-primary btn-sm">
                      {joining === a.id ? 'Joining...' : 'Join'}
                    </button>}
              </div>
            </div>
          )
        })}
      </div>
      <Nav active="/assignments" />
    </div>
  )
}
