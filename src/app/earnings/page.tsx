'use client'
import { useState, useEffect, useMemo } from 'react'
import { Top } from '@/lib/ui'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SOURCE_LABELS: Record<string, { l: string; c: string }> = {
  ad_revenue: { l: 'Ad revenue', c: '#0a8fe8' },
  licensing: { l: 'Licensing', c: '#7C3AED' },
  tip: { l: 'Tips', c: '#CA8A04' },
  assignment_fee: { l: 'Assignment fees', c: '#22C55E' },
  other: { l: 'Other', c: '#888' },
}

type FilterType = 'month' | 'year' | 'all' | 'custom'

export default function Earnings() {
  const now = new Date()
  const [filterType, setFilterType] = useState<FilterType>('month')
  const [month, setMonth] = useState(now.getMonth()) // 0-11
  const [year, setYear] = useState(now.getFullYear())
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const range = useMemo(() => {
    if (filterType === 'month') {
      const from = new Date(year, month, 1)
      const to = new Date(year, month + 1, 1)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    if (filterType === 'year') {
      return { from: new Date(year, 0, 1).toISOString(), to: new Date(year + 1, 0, 1).toISOString() }
    }
    if (filterType === 'custom') {
      return { from: customFrom ? new Date(customFrom).toISOString() : undefined, to: customTo ? new Date(new Date(customTo).getTime() + 86400000).toISOString() : undefined }
    }
    return { from: undefined, to: undefined } // all time
  }, [filterType, month, year, customFrom, customTo])

  useEffect(() => {
    if (filterType === 'custom' && (!customFrom || !customTo)) return
    setLoading(true)
    const params = new URLSearchParams()
    if (range.from) params.set('from', range.from)
    if (range.to) params.set('to', range.to)
    fetch(`/api/earnings?${params.toString()}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range.from, range.to, filterType])

  function shiftMonth(delta: number) {
    let m = month + delta, y = year
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setMonth(m); setYear(y)
  }

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i)
  const periodLabel = filterType === 'month' ? `${MONTH_NAMES[month]} ${year}`
    : filterType === 'year' ? `${year}`
    : filterType === 'all' ? 'All time'
    : 'Custom range'

  return (
    <div className="page"><Top />
      <div className="container">
        <a href="/settings" style={{ fontSize: 13, color: '#0a8fe8', marginBottom: 16, display: 'block' }}>← Settings</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Earnings</h1>

        {/* Filter type */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {(['month', 'year', 'all', 'custom'] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilterType(f)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (filterType === f ? '#065F46' : '#ddd'),
              background: filterType === f ? '#065F46' : '#fff', color: filterType === f ? '#fff' : '#666',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{f === 'month' ? 'This Month' : f === 'year' ? 'This Year' : f === 'all' ? 'All Time' : 'Custom'}</button>
          ))}
        </div>

        {/* Sub-picker */}
        {filterType === 'month' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <button onClick={() => shiftMonth(-1)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#666' }}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 130, textAlign: 'center' }}>{MONTH_NAMES[month]} {year}</span>
            <button onClick={() => shiftMonth(1)} disabled={year === now.getFullYear() && month === now.getMonth()} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: (year === now.getFullYear() && month === now.getMonth()) ? '#ddd' : '#666' }}>›</button>
          </div>
        )}
        {filterType === 'year' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
        {filterType === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' }} />
            <span style={{ color: '#999', fontSize: 12 }}>to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' }} />
          </div>
        )}

        <div style={{ background: 'linear-gradient(135deg,#065F46,#0a8fe8)', borderRadius: 12, padding: 24, marginBottom: 16, color: '#fff' }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Total — {periodLabel}</div>
          <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>{loading ? '...' : `$${(data?.total ?? 0).toFixed(2)}`}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {Object.entries(SOURCE_LABELS).filter(([k]) => k !== 'other' || (data?.bySource?.other ?? 0) > 0).map(([key, s]) => (
            <div key={key} className="card">
              <div style={{ fontSize: 11, color: '#666' }}>{s.l}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.c, marginTop: 6 }}>{loading ? '...' : `$${(data?.bySource?.[key] ?? 0).toFixed(2)}`}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Detail</div>
        {loading ? (
          <p style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading...</p>
        ) : !data?.entries?.length ? (
          <p style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: 20 }}>No earnings in this period.</p>
        ) : data.entries.map((e: any) => (
          <div key={`${e.origin}_${e.id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{SOURCE_LABELS[e.source]?.l || e.source}</div>
              <div style={{ fontSize: 11, color: '#999' }}>{new Date(e.created_at).toLocaleDateString()}</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: SOURCE_LABELS[e.source]?.c || '#666' }}>${e.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
