// @ts-nocheck
'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Nav, Top } from '@/lib/ui'

function timeLeft(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const hours = Math.floor(ms / 3600000)
  if (hours < 1) return `${Math.floor(ms / 60000)}m left`
  if (hours < 48) return `${hours}h left`
  return `${Math.floor(hours / 24)}d left`
}

function extractReportId(u: string) {
  const m = u.trim().match(/\/report\/([a-zA-Z0-9-]+)/)
  return m ? m[1] : u.trim()
}

function Tasks() {
  const params = useSearchParams()
  const [tasks, setTasks] = useState<any[]>([])
  const [claimedTasks, setClaimedTasks] = useState<any[]>([])
  const [reviewTasks, setReviewTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', location_name: '', reward_usd: '', deadline: '' })
  const [posting, setPosting] = useState(false)
  const [postErr, setPostErr] = useState('')
  const [submitInput, setSubmitInput] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [rejectInput, setRejectInput] = useState<Record<string, string>>({})
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)

  useEffect(() => {
    if (params.get('paid')) setMsg('✓ Payment received — your task will appear below shortly.')
    if (params.get('canceled')) setMsg('Payment canceled — no charge was made.')
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [openRes, claimedRes, reviewRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/tasks?mine=claimed'),
        fetch('/api/tasks?mine=review'),
      ])
      const openData = await openRes.json()
      const claimedData = await claimedRes.json()
      const reviewData = await reviewRes.json()
      setTasks(openData.tasks || [])
      setClaimedTasks(claimedData.tasks || [])
      setReviewTasks(reviewData.tasks || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => {
    load()
    // The new task only appears after the webhook processes the payment,
    // which can land a beat after the redirect back — retry a couple of
    // times rather than making the reporter manually refresh.
    if (params.get('paid')) {
      const t1 = setTimeout(load, 2000)
      const t2 = setTimeout(load, 5000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [])

  async function claim(taskId: string) {
    setClaiming(taskId); setMsg('')
    try {
      const res = await fetch('/api/tasks/claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      })
      const d = await res.json()
      if (!res.ok) setMsg(d.error || 'Could not claim task')
      else { setMsg('✓ Task claimed — attach your report below once it\'s published.'); await load() }
    } catch (e: any) { setMsg(e.message) }
    setClaiming(null)
  }

  async function submit(taskId: string) {
    const input = submitInput[taskId]
    if (!input?.trim()) return
    setSubmitting(taskId); setMsg('')
    try {
      const res = await fetch('/api/tasks/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, report_id: extractReportId(input) }),
      })
      const d = await res.json()
      if (!res.ok) setMsg(d.error || 'Could not submit')
      else { setMsg('✓ Submitted — the task creator will review it before the reward is paid.'); await load() }
    } catch (e: any) { setMsg(e.message) }
    setSubmitting(null)
  }

  async function review(taskId: string, decision: 'approve' | 'reject') {
    if (decision === 'reject' && !rejectInput[taskId]?.trim()) { setRejecting(taskId); return }
    setReviewing(taskId); setMsg('')
    try {
      const res = await fetch('/api/tasks/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, decision, feedback: rejectInput[taskId] }),
      })
      const d = await res.json()
      if (!res.ok) setMsg(d.error || 'Could not submit review')
      else {
        setMsg(decision === 'approve' ? '✓ Approved — reward credited to the reporter.' : '✓ Sent back to the reporter with your feedback.')
        setRejecting(null)
        await load()
      }
    } catch (e: any) { setMsg(e.message) }
    setReviewing(null)
  }

  async function postTask() {
    if (!form.title.trim() || !form.description.trim() || !form.location_name.trim() || !form.reward_usd || !form.deadline) return
    setPosting(true); setPostErr('')
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, description: form.description, location_name: form.location_name,
          reward_usd: Number(form.reward_usd), deadline: new Date(form.deadline).toISOString(),
        }),
      })
      const d = await res.json()
      if (!res.ok) { setPostErr(d.error || 'Could not post task'); return }
      if (d.checkoutUrl) { window.location.href = d.checkoutUrl; return }
    } catch (e: any) { setPostErr(e.message) }
    setPosting(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <Top />
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Tasks</div>
          <div style={{ fontSize: 12, color: '#888' }}>One-off coverage requests — claim and earn the reward</div>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#FE3D07', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Post</button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '12px 16px 60px' }}>
        {showForm && (
          <div className="card" style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>You'll pay the reward now via Stripe — it's held until a reporter completes the task.</div>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What do you need covered?" style={{ marginBottom: 8, fontSize: 13 }} />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details" rows={2} style={{ width: '100%', marginBottom: 8, fontSize: 13, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', resize: 'vertical' }} />
            <input value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} placeholder="Location" style={{ marginBottom: 8, fontSize: 13 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={form.reward_usd} onChange={e => setForm({ ...form, reward_usd: e.target.value })} placeholder="Reward (USD, min $5)" type="number" min="5" style={{ flex: 1, fontSize: 13 }} />
              <input value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} type="datetime-local" style={{ flex: 1, fontSize: 13, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit' }} />
            </div>
            {postErr && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{postErr}</div>}
            <button onClick={postTask} disabled={posting} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: posting ? 0.6 : 1 }}>
              {posting ? 'Redirecting to payment...' : `Pay & post task`}
            </button>
          </div>
        )}

        {msg && <div style={{ fontSize: 12, color: msg.startsWith('✓') ? '#065F46' : '#DC2626', marginBottom: 12, padding: 10, borderRadius: 8, background: msg.startsWith('✓') ? '#ECFDF5' : '#FEF2F2' }}>{msg}</div>}

        {reviewTasks.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Submissions to review</div>
            {reviewTasks.map(task => (
              <div key={task.id} className="card" style={{ padding: 14, marginBottom: 8, border: '1px solid #BFDBFE', background: '#EFF6FF' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{task.title} — ${Number(task.reward_usd).toFixed(0)}</div>
                <div style={{ fontSize: 11, color: '#1e40af', marginBottom: 8 }}>Submitted by @{task.claimer?.username || 'reporter'}</div>
                <a href={`/report/${task.report_id}`} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#0a8fe8', display: 'block', marginBottom: 10 }}>▶ View submitted report</a>
                {rejecting === task.id ? (
                  <div>
                    <textarea value={rejectInput[task.id] || ''} onChange={e => setRejectInput({ ...rejectInput, [task.id]: e.target.value })} placeholder="Explain why this isn't being accepted..." rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 12, fontFamily: 'inherit', marginBottom: 8, resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => review(task.id, 'reject')} disabled={reviewing === task.id} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Send back with feedback</button>
                      <button onClick={() => setRejecting(null)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => review(task.id, 'approve')} disabled={reviewing === task.id} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{reviewing === task.id ? '...' : '✓ Approve & pay'}</button>
                    <button onClick={() => setRejecting(task.id)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #DC2626', background: '#fff', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Not accepted</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {claimedTasks.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: '16px 0 8px' }}>Your claimed tasks</div>
            {claimedTasks.map(task => (
              <div key={task.id} className="card" style={{ padding: 14, marginBottom: 8, border: '1px solid #FED7AA', background: '#FEF3E6' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{task.title} — ${Number(task.reward_usd).toFixed(0)}</div>
                <div style={{ fontSize: 11, color: '#92400E', marginBottom: 8 }}>{timeLeft(task.deadline)}</div>
                {task.status === 'submitted' ? (
                  <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>⏳ Submitted — awaiting the creator's review</div>
                ) : (
                  <>
                    {task.review_feedback && (
                      <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 8, padding: 8, borderRadius: 6, background: '#FEF2F2' }}>⚠️ Not accepted: {task.review_feedback}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={submitInput[task.id] || ''} onChange={e => setSubmitInput({ ...submitInput, [task.id]: e.target.value })} placeholder="Paste your published report's URL" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 12, fontFamily: 'inherit' }} />
                      <button onClick={() => submit(task.id)} disabled={submitting === task.id} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {submitting === task.id ? '...' : task.review_feedback ? 'Resubmit' : 'Submit'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </>
        )}

        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: '16px 0 8px' }}>Open tasks</div>
        {loading ? (
          <p style={{ color: '#999', textAlign: 'center', padding: 40, fontSize: 13 }}>Loading...</p>
        ) : tasks.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: 40, fontSize: 13 }}>No open tasks right now.</p>
        ) : tasks.map(task => (
          <div key={task.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', flex: 1 }}>{task.title}</div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#065F46', marginLeft: 8 }}>${Number(task.reward_usd).toFixed(0)}</span>
            </div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{task.description}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: '#999' }}>📍 {task.location_name} · {timeLeft(task.deadline)} · by @{task.creator?.username || 'vozit'}</div>
              <button onClick={() => claim(task.id)} disabled={claiming === task.id} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#FE3D07', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: claiming === task.id ? 0.6 : 1 }}>
                {claiming === task.id ? '...' : 'Claim'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <Nav active="/tasks" />
    </div>
  )
}

export default function P() {
  return <Suspense><Tasks /></Suspense>
}
