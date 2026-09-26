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
  const [reviewQueue, setReviewQueue] = useState<any[]>([])
  const [mySubmissions, setMySubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [voting, setVoting] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', urgency: 'medium', regions: '', assignment_fee_per_report_usd: '10', assignment_fee_pool_usd: '0', safety_notes: '', allows_anonymous: false })
  const [posting, setPosting] = useState(false)
  const [postErr, setPostErr] = useState('')
  const [fundingId, setFundingId] = useState<string | null>(null)
  const [fundAmount, setFundAmount] = useState<Record<string, string>>({})
  const [fundingBusy, setFundingBusy] = useState(false)
  const [rejectInput, setRejectInput] = useState<Record<string, string>>({})
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)

  useEffect(() => {
    if (params.get('paid')) setMsg('✓ Payment received — your assignment will appear below shortly.')
    if (params.get('funded')) setMsg('✓ Funding received — the pool will update shortly.')
    if (params.get('canceled')) setMsg('Payment canceled — no charge was made.')
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [aRes, rRes, sRes] = await Promise.all([
        fetch('/api/assignments'),
        fetch('/api/assignments?mine=review'),
        fetch('/api/assignments?mine=submissions'),
      ])
      const [aData, rData, sData] = await Promise.all([aRes.json(), rRes.json(), sRes.json()])
      setAssignments(aData.assignments || [])
      setReviewQueue(rData.reports || [])
      setMySubmissions(sData.reports || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => {
    load()
    // A new assignment, or new funding, only shows up after the webhook
    // processes the payment, which can land a beat after the redirect back.
    if (params.get('paid') || params.get('funded')) {
      const t1 = setTimeout(load, 2000)
      const t2 = setTimeout(load, 5000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [])

  async function postAssignment() {
    if (!form.title.trim() || !form.description.trim() || form.assignment_fee_pool_usd === '') return
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
      // $0 coverage requests are created immediately, no checkout redirect
      setShowForm(false)
      setForm({ title: '', description: '', urgency: 'medium', regions: '', assignment_fee_per_report_usd: '10', assignment_fee_pool_usd: '0', safety_notes: '', allows_anonymous: false })
      setMsg('✓ Coverage request posted.')
      await load()
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

  async function toggleVote(id: string) {
    setVoting(id)
    try {
      const res = await fetch('/api/assignments/vote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: id }),
      })
      const d = await res.json()
      if (res.ok) {
        setAssignments(prev => prev.map(a => {
          if (a.id !== id) return a
          const votes = a.votes || []
          const already = votes.some((v: any) => v.user_id === user?.id)
          return {
            ...a,
            interest_count: (a.interest_count || 0) + (d.voted ? 1 : -1),
            votes: d.voted ? [...votes, { user_id: user?.id }] : votes.filter((v: any) => v.user_id !== user?.id),
          }
        }))
      }
    } catch {}
    setVoting(null)
  }

  async function fund(id: string) {
    const amount = Number(fundAmount[id])
    if (!amount || amount < 5) { setMsg('Enter at least $5 to fund this assignment'); return }
    setFundingBusy(true); setMsg('')
    try {
      const res = await fetch('/api/assignments/fund', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: id, amount_usd: amount }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg(d.error || 'Could not start funding'); return }
      if (d.checkoutUrl) { window.location.href = d.checkoutUrl; return }
    } catch (e: any) { setMsg(e.message) }
    setFundingBusy(false)
  }

  async function review(reportId: string, decision: 'approve' | 'reject') {
    if (decision === 'reject' && !rejectInput[reportId]?.trim()) { setRejecting(reportId); return }
    setReviewing(reportId); setMsg('')
    try {
      const res = await fetch('/api/assignments/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, decision, feedback: rejectInput[reportId] }),
      })
      const d = await res.json()
      if (!res.ok) setMsg(d.error || 'Could not submit review')
      else {
        setMsg(decision === 'approve' ? '✓ Accepted — fee credited to the reporter.' : '✓ Sent feedback — this report was not accepted for payment.')
        setRejecting(null)
        await load()
      }
    } catch (e: any) { setMsg(e.message) }
    setReviewing(null)
  }

  return (
    <div className="page" style={{ background: '#fff' }}>
      <Top />
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Assignments</div>
          <div style={{ fontSize: 13, color: '#666' }}>Ongoing, multi-reporter campaigns — funded or community-requested</div>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#FE3D07', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Post</button>
      </div>
      <div className="container" style={{ padding: '12px 16px' }}>
        {showForm && (
          <div className="card" style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
              Best for media organizations, non-profits, and anyone coordinating ongoing coverage across multiple reporters — for a one-off request to a single reporter, use Tasks instead.
              Leave the pool at $0 to post an unfunded coverage request — reporters can still respond and earn their normal revenue, and anyone (including you, later) can add real funding to it.
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
            <input value={form.assignment_fee_pool_usd} onChange={e => setForm({ ...form, assignment_fee_pool_usd: e.target.value })} placeholder="Initial pool budget (USD) — $0 for an unfunded coverage request" type="number" min="0" style={{ marginBottom: 8, fontSize: 13 }} />
            <textarea value={form.safety_notes} onChange={e => setForm({ ...form, safety_notes: e.target.value })} placeholder="Safety notes for reporters (optional)" rows={2} style={{ width: '100%', marginBottom: 8, fontSize: 13, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', resize: 'vertical' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', marginBottom: 8 }}>
              <input type="checkbox" checked={form.allows_anonymous} onChange={e => setForm({ ...form, allows_anonymous: e.target.checked })} />
              Allow anonymous submissions
            </label>
            {postErr && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{postErr}</div>}
            <button onClick={postAssignment} disabled={posting} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: posting ? 0.6 : 1 }}>
              {posting ? 'Posting...' : Number(form.assignment_fee_pool_usd) > 0 ? 'Pay & post assignment' : 'Post coverage request'}
            </button>
          </div>
        )}
        {msg && <div style={{ fontSize: 12, color: msg.startsWith('✓') ? '#065F46' : '#DC2626', marginBottom: 10, padding: 10, borderRadius: 8, background: msg.startsWith('✓') ? '#ECFDF5' : '#FEF2F2' }}>{msg}</div>}

        {reviewQueue.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Submissions to review</div>
            {reviewQueue.map((r: any) => (
              <div key={r.id} className="card" style={{ padding: 14, marginBottom: 8, border: '1px solid #BFDBFE', background: '#EFF6FF' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{r.title} — ${Number(r.assignment?.assignment_fee_per_report_usd || 0).toFixed(0)}</div>
                <div style={{ fontSize: 11, color: '#1e40af', marginBottom: 8 }}>By @{r.user?.username || 'reporter'} for "{r.assignment?.title}"</div>
                <a href={`/report/${r.id}`} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#0a8fe8', display: 'block', marginBottom: 10 }}>▶ View published report</a>
                {rejecting === r.id ? (
                  <div>
                    <textarea value={rejectInput[r.id] || ''} onChange={e => setRejectInput({ ...rejectInput, [r.id]: e.target.value })} placeholder="Explain why this isn't being accepted for payment..." rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 12, fontFamily: 'inherit', marginBottom: 8, resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => review(r.id, 'reject')} disabled={reviewing === r.id} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Send feedback</button>
                      <button onClick={() => setRejecting(null)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => review(r.id, 'approve')} disabled={reviewing === r.id} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{reviewing === r.id ? '...' : '✓ Accept & pay'}</button>
                    <button onClick={() => setRejecting(r.id)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #DC2626', background: '#fff', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Not accepted</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {mySubmissions.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: '16px 0 8px' }}>Your assignment submissions</div>
            {mySubmissions.map((r: any) => (
              <div key={r.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>For "{r.assignment?.title}"</div>
                {r.assignment_fee_paid ? (
                  <div style={{ fontSize: 12, color: '#065F46', fontWeight: 600 }}>✓ Accepted — ${Number(r.assignment?.assignment_fee_per_report_usd || 0).toFixed(0)} credited</div>
                ) : r.assignment_review_feedback ? (
                  <div style={{ fontSize: 12, color: '#DC2626', padding: 8, borderRadius: 6, background: '#FEF2F2' }}>⚠️ Not accepted for payment: {r.assignment_review_feedback}</div>
                ) : Number(r.assignment?.assignment_fee_pool_usd) > 0 ? (
                  <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>⏳ Awaiting review</div>
                ) : (
                  <div style={{ fontSize: 12, color: '#666' }}>Unfunded coverage request — no fee attached, earns your normal revenue</div>
                )}
              </div>
            ))}
          </>
        )}

        {(reviewQueue.length > 0 || mySubmissions.length > 0) && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: '16px 0 8px' }}>All assignments</div>
        )}

        {loading ? <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Loading...</p> : assignments.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>No active assignments right now.</p>
        ) : assignments.map(a => {
          const u = UC[a.urgency] || UC.medium
          const alreadyJoined = (a.contributors || []).some((c: any) => c.user_id === user?.id)
          const alreadyVoted = (a.votes || []).some((v: any) => v.user_id === user?.id)
          const funded = Number(a.assignment_fee_pool_usd) > 0
          return (
            <div key={a.id} className="card" style={{ borderLeft: '3px solid ' + u.c, borderRadius: '0 12px 12px 0' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ background: u.bg, color: u.c, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>{u.l}</span>
                {!funded && <span style={{ background: '#F3F4F6', color: '#666', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>Coverage request</span>}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, margin: '6px 0' }}>{a.title}</div>
              {a.description && <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{a.description}</div>}
              <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                {a.contributor_count || 0} reporters · {a.report_count || 0} reports
                {a.regions?.length > 0 && ` · ${a.regions.join(', ')}`}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  {funded ? (
                    <>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#065F46' }}>${Number(a.assignment_fee_per_report_usd || 0).toLocaleString()}</span>
                      <span style={{ fontSize: 11, color: '#999' }}> /report</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: '#999' }}>No funded reward yet</span>
                  )}
                </div>
                {alreadyJoined
                  ? <span style={{ fontSize: 12, fontWeight: 600, color: '#22C55E' }}>✓ Joined</span>
                  : <button onClick={() => join(a.id)} disabled={joining === a.id} className="btn btn-primary btn-sm">
                      {joining === a.id ? 'Joining...' : 'Join'}
                    </button>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                <button onClick={() => toggleVote(a.id)} disabled={voting === a.id} style={{ padding: '6px 10px', borderRadius: 8, border: alreadyVoted ? 'none' : '1px solid #ddd', background: alreadyVoted ? '#FE3D07' : '#fff', color: alreadyVoted ? '#fff' : '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🔥 {a.interest_count || 0} interested
                </button>
                {fundingId === a.id ? (
                  <>
                    <input value={fundAmount[a.id] || ''} onChange={e => setFundAmount({ ...fundAmount, [a.id]: e.target.value })} placeholder="USD" type="number" min="5" style={{ width: 80, padding: '6px 8px', borderRadius: 8, border: '1px solid #ddd', fontSize: 12, fontFamily: 'inherit' }} />
                    <button onClick={() => fund(a.id)} disabled={fundingBusy} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{fundingBusy ? '...' : 'Fund'}</button>
                    <button onClick={() => setFundingId(null)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                  </>
                ) : (
                  <button onClick={() => setFundingId(a.id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {funded ? '+ Add funding' : '+ Fund this request'}
                  </button>
                )}
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
