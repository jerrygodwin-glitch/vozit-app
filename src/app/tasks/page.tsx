// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { NavBar, TopBar } from '@/components/ui/NavBar'

function timeLeft(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const hours = Math.floor(ms / 3600000)
  if (hours < 1) return `${Math.floor(ms / 60000)}m left`
  if (hours < 48) return `${hours}h left`
  return `${Math.floor(hours / 24)}d left`
}

export default function P() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', location_name: '', reward_usd: '', deadline: '' })
  const [posting, setPosting] = useState(false)
  const [postErr, setPostErr] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/tasks')
      const d = await res.json()
      setTasks(d.tasks || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function claim(taskId: string) {
    setClaiming(taskId); setMsg('')
    try {
      const res = await fetch('/api/tasks/claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      })
      const d = await res.json()
      if (!res.ok) setMsg(d.error || 'Could not claim task')
      else { setMsg('✓ Task claimed — go record and submit your report before the deadline.'); await load() }
    } catch (e: any) { setMsg(e.message) }
    setClaiming(null)
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
      setForm({ title: '', description: '', location_name: '', reward_usd: '', deadline: '' })
      setShowForm(false)
      await load()
    } catch (e: any) { setPostErr(e.message) }
    setPosting(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <TopBar />
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
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What do you need covered?" style={{ marginBottom: 8, fontSize: 13 }} />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details" rows={2} style={{ width: '100%', marginBottom: 8, fontSize: 13, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', resize: 'vertical' }} />
            <input value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} placeholder="Location" style={{ marginBottom: 8, fontSize: 13 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={form.reward_usd} onChange={e => setForm({ ...form, reward_usd: e.target.value })} placeholder="Reward (USD, min $5)" type="number" min="5" style={{ flex: 1, fontSize: 13 }} />
              <input value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} type="datetime-local" style={{ flex: 1, fontSize: 13, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit' }} />
            </div>
            {postErr && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{postErr}</div>}
            <button onClick={postTask} disabled={posting} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: posting ? 0.6 : 1 }}>
              {posting ? 'Posting...' : 'Post task'}
            </button>
          </div>
        )}

        {msg && <div style={{ fontSize: 12, color: msg.startsWith('✓') ? '#065F46' : '#DC2626', marginBottom: 12, padding: 10, borderRadius: 8, background: msg.startsWith('✓') ? '#ECFDF5' : '#FEF2F2' }}>{msg}</div>}

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
      <NavBar active="tasks" />
    </div>
  )
}
