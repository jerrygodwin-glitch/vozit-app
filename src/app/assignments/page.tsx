'use client'
import { Nav, Top } from '@/lib/ui'
const A = [
  { t: 'Ukraine — frontline & civilian impact', u: 'critical', c: 34, rp: 127, b: 2400 },
  { t: 'Sudan — humanitarian crisis', u: 'critical', c: 12, rp: 48, b: 3000 },
  { t: 'Venezuela — protests', u: 'high', c: 19, rp: 67, b: 1200 },
  { t: 'Pacific — climate flooding', u: 'medium', c: 7, rp: 28, b: 800 },
  { t: 'Myanmar resistance', u: 'high', c: 8, rp: 31, b: 1800 },
]
const UC: any = { critical: { bg: '#FEF2F2', c: '#DC2626', l: 'Critical' }, high: { bg: '#FEF3E6', c: '#D97706', l: 'High' }, medium: { bg: '#FFF8E6', c: '#B8860B', l: 'Ongoing' } }

export default function Assignments() {
  return (
    <div className="page" style={{ background: '#fff' }}>
      <Top />
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Assignments</div>
        <div style={{ fontSize: 13, color: '#666' }}>Ongoing assignments with fees</div>
      </div>
      <div className="container" style={{ padding: '12px 16px' }}>
        {A.map(a => { const u = UC[a.u]; return (
          <div key={a.t} className="card" style={{ borderLeft: '3px solid ' + u.c, borderRadius: '0 12px 12px 0' }}>
            <span style={{ background: u.bg, color: u.c, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>{u.l}</span>
            <div style={{ fontSize: 15, fontWeight: 600, margin: '6px 0' }}>{a.t}</div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>{a.c} reporters · {a.rp} reports</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#065F46' }}>${a.b.toLocaleString()}</span>
              <button className="btn btn-primary btn-sm">Join</button>
            </div>
          </div>
        )})}
      </div>
      <Nav active="/assignments" />
    </div>
  )
}
