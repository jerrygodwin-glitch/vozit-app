'use client'
import { useState } from 'react'
import { Nav, Top } from '@/lib/ui'

export default function Search() {
  const [q, setQ] = useState('')
  const [f, setF] = useState('All')
  return (
    <div className="page"><Top />
      <div className="container">
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#999' }}>🔍</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search reports..." style={{ paddingLeft: 44 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {['All', 'Latest', 'Trending', 'Credible'].map(x => (
            <button key={x} onClick={() => setF(x)} className="btn" style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', borderColor: f === x ? '#FE3D07' : '#eee', background: f === x ? '#FEF3E6' : '#fff', color: f === x ? '#FE3D07' : '#666', fontSize: 13 }}>{x}</button>
          ))}
        </div>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40 }}>🔍</div>
          <div style={{ color: '#666', fontSize: 15, marginTop: 12 }}>Search for eyewitness reports</div>
        </div>
      </div>
      <Nav active="/search" />
    </div>
  )
}
