'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Nav, Top } from '@/lib/ui'
import { useAuth } from '@/hooks/useAuth'

const UC: any = { critical: { bg: '#FEF2F2', c: '#DC2626', l: 'Critical' }, high: { bg: '#FEF3E6', c: '#D97706', l: 'High' }, medium: { bg: '#FFF8E6', c: '#B8860B', l: 'Ongoing' } }

function AssignmentsPage() {
  const { user } = useAuth()
  const params = useSearchParams()
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', urgency: 'medium', regions: '', assignment_fee_per_report_usd: '10', assignment_fee_pool_usd: '', safety_notes: '', allows_anonymous: false })
  const [posting, setPosting] = useState(false)
  const [postErr, setPostErr] = useState('')

  useEffect(() => {
    if (params.get('paid')) setMsg('✓ Payment received — your assignment will appear below shortly.')
    if (params.get('canceled')) setMsg('Payment canceled — no charge was made.')
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/assignments')
      const d = await res.json()
      setAssignments(d.assignments || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => {
    load()
    // The new assignment only appears after the webhook processes the
    // payment, which can land a beat after the redirect back.
    if (params.get('paid')) {
      const t1 = setTimeout(load, 2000)
      const t2 = setTimeout(load, 5000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [])

  async function postAssignment() {
    if (!form.title.trim() || !form.description.trim() || !form.assignment_fee_pool_usd) return
    setPosting(true); setPostErr('')
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, description: form.description, urgency: form.urgency,
          regions: form.regions.split(',').map(r => r.trim()).filter(Boolean),
          assignment_fee_per_report_usd: Number(form.assignment_fee_per_report_usd),
          assignment_fee_pool_usd: Number(form.assignment_fee_pool_usd),
          safety_notes: form.safety_notes, allows_anonymous: form.allows_anonymous,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setPostErr(d.error || 'Could not post assignment'); return }
      if (d.checkoutUrl) { window.location.href = d.checkoutUrl; return }
    } catch (e: any) { setPostErr(e.message) }
    setPosting(false)
  }

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
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Assignments</div>
          <div style={{ fontSize: 13, color: '#666' }}>Ongoing, multi-reporter campaigns with fees</div>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#FE3D07', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Post</button>
      </div>
      <div className="container" style={{ padding: '12px 16px' }}>
        {showForm && (
          <div className="card" style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
              Best for media organizations, non-profits, and anyone coordinating ongoing coverage across multiple reporters — for a one-off request to a single reporter, use Tasks instead.
              You'll pay the pool now via Stripe; it pays out per report as reporters file, until it runs out.
            </div>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Assignment title" style={{ marginBottom: 8, fontSize: 13 }} />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What coverage are you looking for? What should reporters know?" rows={3} style={{ width: '100%', marginBottom: 8, fontSize: 13, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', resize: 'vertical' }} />
            <input value={form.regions} onChange={e => setForm({ ...form, regions: e.target.value })} placeholder="Regions (comma-separated, e.g. Kharkiv, Kyiv)" style={{ marginBottom: 8, fontSize: 13 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })} style={{ flex: 1, fontSize: 13, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit' }}>
                <option value="medium">Ongoing</option>
                <option value="high">High urgency</option>
                <option value="critical">Critical</option>
              </select>
              <input value={form.assignment_fee_per_report_usd} onChange={e => setForm({ ...form, assignment_fee_per_report_usd: e.target.value })} placeholder="Fee per report (min $5)" type="number" min="5" style={{ flex: 1, fontSize: 13 }} />
            </div>
            <input value={form.assignment_fee_pool_usd} onChange={e => setForm({ ...form, assignment_fee_pool_usd: e.target.value })} placeholder="Initial pool budget (USD) — funds this many reports upfront" type="number" min="5" style={{ marginBottom: 8, fontSize: 13 }} />
            <textarea value={form.safety_notes} onChange={e => setForm({ ...form, safety_notes: e.target.value })} placeholder="Safety notes for reporters (optional)" rows={2} style={{ width: '100%', marginBottom: 8, fontSize: 13, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', resize: 'vertical' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', marginBottom: 8 }}>
              <input type="checkbox" checked={form.allows_anonymous} onChange={e => setForm({ ...form, allows_anonymous: e.target.checked })} />
              Allow anonymous submissions
            </label>
            {postErr && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{postErr}</div>}
            <button onClick={postAssignment} disabled={posting} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: posting ? 0.6 : 1 }}>
              {posting ? 'Redirecting to payment...' : 'Pay & post assignment'}
            </button>
          </div>
        )}
        {msg && <div style={{ fontSize: 12, color: msg.startsWith('✓') ? '#065F46' : '#DC2626', marginBottom: 10, padding: 10, borderRadius: 8, background: msg.startsWith('✓') ? '#ECFDF5' : '#FEF2F2' }}>{msg}</div>}
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

export default function Assignments() {
  return <Suspense><AssignmentsPage /></Suspense>
}
