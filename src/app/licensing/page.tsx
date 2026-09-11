'use client'
import { Top } from '@/lib/ui'
export default function Licensing() {
  const T = [
    { n: 'Embed', p: [{ l: 'Editorial', v: 'Free' }, { l: 'Commercial', v: '$6 CPM' }], dur: '1yr', rights: ['Embed player', 'Link back'], pop: false },
    { n: 'Digital', p: [{ l: 'Clip', v: '$75' }, { l: 'Standard', v: '$150' }, { l: 'Breaking', v: '$250' }], dur: '30d', rights: ['Download', 'Digital publish', 'Social'], pop: true },
    { n: 'Broadcast', p: [{ l: 'Local', v: '$500' }, { l: 'National', v: '$2,500' }, { l: 'Documentary', v: '$3,500' }, { l: 'Breaking excl.', v: '$7,500' }, { l: '24h excl.', v: '$10,000' }], dur: '90d', rights: ['Broadcast', 'Streaming', 'Archive'], pop: false },
    { n: 'Wire Service', p: [{ l: 'Standard', v: '$3,000' }, { l: 'Exclusive', v: '$10,000' }, { l: 'Breaking', v: '$15,000' }], dur: '30d', rights: ['Redistribute', 'Sublicense', 'Full editorial'], pop: false },
  ]
  return (
    <div className="page"><Top />
      <div className="container" style={{ maxWidth: 640 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>VozIt! Licensing</h1>
          <p style={{ fontSize: 15, color: '#666', marginTop: 4 }}>License citizen journalism footage</p>
          <p style={{ fontSize: 13, color: '#0a8fe8', marginTop: 4 }}>Revenue shared with the reporter</p>
        </div>
        {T.map(t => (
          <div key={t.n} className="card card-lg" style={{ border: t.pop ? '2px solid #FE3D07' : '1px solid #eee', position: 'relative' }}>
            {t.pop && <span style={{ position: 'absolute', top: -10, left: 20, background: '#FE3D07', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 4 }}>Most popular</span>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{t.n}</div>
              <span style={{ fontSize: 11, color: '#666', background: '#f7f7f8', padding: '3px 8px', borderRadius: 4, height: 'fit-content' }}>{t.dur}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {t.p.map(p => (<div key={p.l} style={{ padding: '6px 12px', borderRadius: 12, background: '#f7f7f8', border: '1px solid #eee' }}><div style={{ fontSize: 11, color: '#666' }}>{p.l}</div><div style={{ fontSize: 20, fontWeight: 700 }}>{p.v}</div></div>))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {t.rights.map(r => (<span key={r} style={{ fontSize: 11, color: '#065F46', background: '#ECFDF5', padding: '2px 8px', borderRadius: 4 }}>✓ {r}</span>))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
