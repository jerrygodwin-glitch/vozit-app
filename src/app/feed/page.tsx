'use client'
import { Nav, Top } from '@/lib/ui'
const R = [
  { id: '1', t: 'Shelling hits residential area in Saltivka', loc: 'Kharkiv, Ukraine', u: 'olena_k', tier: 'platinum', up: 847, down: 12, cred: 98, dur: 67, time: '2h ago' },
  { id: '2', t: 'Protesters block main highway', loc: 'Caracas, Venezuela', u: 'maria_vzla', tier: 'gold', up: 412, down: 28, cred: 93, dur: 45, time: '4h ago' },
  { id: '3', t: 'Flash flooding destroys bridge', loc: 'Bihar, India', u: 'ravi_reports', tier: 'silver', up: 234, down: 8, cred: 89, dur: 52, time: '6h ago' },
  { id: '4', t: 'Police teargas at student march', loc: 'Nairobi, Kenya', u: 'chidi_nbo', tier: 'starter', up: 156, down: 15, cred: 85, dur: 38, time: '8h ago' },
  { id: '5', t: 'Wildfire approaches residential zone', loc: 'Valparaiso, Chile', u: 'pablo_cl', tier: 'silver', up: 198, down: 5, cred: 91, dur: 72, time: '12h ago' },
  { id: '6', t: 'Aid convoy blocked at border', loc: 'Rafah, Gaza', u: 'ahmad_gz', tier: 'gold', up: 1203, down: 34, cred: 96, dur: 88, time: '1h ago' },
]
const TC: any = { starter: { c: '#22C55E', l: 'Starter' }, silver: { c: '#64748B', l: 'Silver' }, gold: { c: '#CA8A04', l: 'Gold' }, platinum: { c: '#7C3AED', l: 'Platinum' } }
const RG = ['Americas', 'Europe', 'Middle East', 'Africa', 'Asia', 'Global']

export default function Feed() {
  return (
    <div className="page" style={{ background: '#fff' }}>
      <Top />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #eee', background: '#f7f7f8' }}>
        <span style={{ background: '#D63006', color: '#fff', padding: '5px 16px', borderRadius: 5, fontSize: 13, fontWeight: 600 }}>Reports</span>
        <div style={{ fontSize: 11, display: 'flex', gap: 10 }}>
          <span style={{ color: '#0a8fe8', fontWeight: 700 }}>by Location</span>
          <span style={{ color: '#0a8fe8' }}>by Category</span>
        </div>
      </div>
      {RG.map((region, ri) => (
        <div key={region}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 0 12px', margin: '6px 10px 4px', background: '#D63006', borderRadius: 6, height: 30 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{region}</span>
            <button className="btn btn-sm" style={{ background: '#fff', color: '#0a8fe8', border: 'none', fontSize: 10, fontWeight: 700 }}>Contribute</button>
          </div>
          {R.slice(ri % R.length, (ri % R.length) + 2).map(r => {
            const t = TC[r.tier]
            return (
              <div key={r.id + region} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: 130, minHeight: 82, background: 'linear-gradient(135deg,#1a2a3a,#2a3a4a)', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 32, height: 32, borderRadius: 16, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 0, height: 0, borderLeft: '10px solid #fff', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 2 }} />
                  </div>
                  <span style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 9, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)', padding: '1px 4px', borderRadius: 3 }}>0:{r.dur}</span>
                </div>
                <div style={{ flex: 1, padding: '6px 10px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{r.t}</div>
                  <div style={{ fontSize: 11, color: '#0a8fe8', marginTop: 3 }}>{r.loc} · {r.time}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600, padding: '2px 6px', minWidth: 44, minHeight: 28, display: 'inline-flex', alignItems: 'center' }}>▲ {r.up}</span>
                    <span style={{ fontSize: 11, color: '#DC2626', padding: '2px 6px', minWidth: 44, minHeight: 28, display: 'inline-flex', alignItems: 'center' }}>▼ {r.down}</span>
                    <span style={{ fontSize: 11, color: '#666' }}>{r.cred}%</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: t.c + '15', color: t.c, fontWeight: 600, marginLeft: 'auto' }}>★ {t.l}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>@{r.u}</div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
      <Nav active="/feed" />
    </div>
  )
}
