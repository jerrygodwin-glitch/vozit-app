'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Nav, Top } from '@/lib/ui'

const TC: Record<string, { c: string; bg: string; l: string }> = { starter: { c: '#22C55E', bg: '#ECFDF5', l: 'Starter' }, silver: { c: '#94A3B8', bg: '#F0F4F8', l: 'Silver' }, gold: { c: '#EAB308', bg: '#FFF8E6', l: 'Gold' }, platinum: { c: '#8B5CF6', bg: '#F5F0FF', l: 'Platinum' } }
const FILTERS = [
  { l: 'All', sort: 'recent' },
  { l: 'Latest', sort: 'recent' },
  { l: 'Trending', sort: 'trending' },
  { l: 'Credible', sort: 'credible' },
]

export default function Search() {
  const [q, setQ] = useState('')
  const [f, setF] = useState('All')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); setSearched(false); return }
    debounceRef.current = setTimeout(runSearch, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q, f])

  async function runSearch() {
    setLoading(true)
    try {
      const sort = FILTERS.find(x => x.l === f)?.sort || 'recent'
      const res = await fetch(`/api/reports?q=${encodeURIComponent(q.trim())}&sort=${sort}&limit=30`)
      const d = await res.json()
      setResults(d.reports || [])
    } catch { setResults([]) }
    setSearched(true)
    setLoading(false)
  }

  return (
    <div className="page"><Top />
      <div className="container">
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#999' }}>🔍</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search reports..." style={{ paddingLeft: 44 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {FILTERS.map(x => (
            <button key={x.l} onClick={() => setF(x.l)} className="btn" style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', borderColor: f === x.l ? '#FE3D07' : '#eee', background: f === x.l ? '#FEF3E6' : '#fff', color: f === x.l ? '#FE3D07' : '#666', fontSize: 13 }}>{x.l}</button>
          ))}
        </div>

        {!q.trim() ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 40 }}>🔍</div>
            <div style={{ color: '#666', fontSize: 15, marginTop: 12 }}>Search for eyewitness reports</div>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#999', fontSize: 13 }}>Searching...</div>
        ) : searched && results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 40 }}>🤷</div>
            <div style={{ color: '#666', fontSize: 15, marginTop: 12 }}>No reports match "{q}"</div>
          </div>
        ) : (
          results.map(r => {
            const t = TC[r.user?.tier || 'starter'] || TC.starter
            return (
              <Link key={r.id} href={`/report/${r.id}`} style={{ display: 'flex', gap: 10, textDecoration: 'none', borderBottom: '1px solid #f0f0f0', padding: '10px 0' }}>
                <div style={{ width: 90, height: 64, borderRadius: 8, background: r.thumbnail_url ? `url(${r.thumbnail_url}) center/cover` : 'linear-gradient(135deg,#5a6a7a,#3a4a5a)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: '#00AACC', marginTop: 3 }}>{r.location_name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>@{r.user?.username}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: t.bg, color: t.c }}>★ {t.l}</span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
      <Nav active="/search" />
    </div>
  )
}
