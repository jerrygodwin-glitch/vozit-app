'use client'
import { useState } from 'react'
import { Top, Nav } from '@/lib/ui'

export default function Licensing() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<any>(null)

  function handleSearch() {
    if (!url.trim()) return
    // Simulate finding a report from URL
    setResult({
      title: 'Shelling hits residential area in Saltivka',
      reporter: '@olena_k',
      tier: 'Platinum',
      loc: 'Kharkiv, Ukraine',
      dur: '1:07',
      cred: 98,
      date: 'Sep 10, 2026',
    })
  }

  const T = [
    { n: 'Embed', p: [{ l: 'Editorial', v: 'Free' }, { l: 'Commercial', v: '$6 CPM' }], dur: '1yr', rights: ['Embed player', 'Link back'], pop: false },
    { n: 'Digital', p: [{ l: 'Clip', v: '$75' }, { l: 'Standard', v: '$150' }, { l: 'Breaking', v: '$250' }], dur: '30d', rights: ['Download', 'Digital publish', 'Social'], pop: true },
    { n: 'Broadcast', p: [{ l: 'Local', v: '$500' }, { l: 'National', v: '$2,500' }, { l: 'Documentary', v: '$3,500' }, { l: 'Breaking excl.', v: '$7,500' }, { l: '24h excl.', v: '$10,000' }], dur: '90d', rights: ['Broadcast', 'Streaming', 'Archive'], pop: false },
    { n: 'Wire Service', p: [{ l: 'Standard', v: '$3,000' }, { l: 'Exclusive', v: '$10,000' }, { l: 'Breaking', v: '$15,000' }], dur: '30d', rights: ['Redistribute', 'Sublicense', 'Full editorial'], pop: false },
  ]

  return (
    <div className="page">
      <Top />
      <div className="container" style={{ maxWidth: 700 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>VozIt! Licensing</h1>
          <p style={{ fontSize: 15, color: '#666', marginTop: 4 }}>License citizen journalism footage for your newsroom</p>
          <p style={{ fontSize: 13, color: '#0a8fe8', marginTop: 4 }}>Revenue shared with the reporter</p>
        </div>

        {/* URL PASTE BAR */}
        <div className="card card-lg" style={{ marginBottom: 24, border: '2px solid #0a8fe8' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>License a specific report</div>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Paste the VozIt! video URL to see licensing options</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://vozit-app-v2-voz-it.vercel.app/report/..."
              style={{ flex: 1, fontSize: 14 }}
            />
            <button onClick={handleSearch} className="btn btn-primary" style={{ padding: '12px 24px', flexShrink: 0 }}>
              Look up
            </button>
          </div>

          {result && (
            <div style={{ marginTop: 16, padding: 16, background: '#f7f7f8', borderRadius: 12, display: 'flex', gap: 14 }}>
              <div style={{ width: 120, height: 80, background: 'linear-gradient(135deg,#1a2a3a,#2a3a4a)', borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 0, height: 0, borderLeft: '10px solid #fff', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 2 }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{result.title}</div>
                <div style={{ fontSize: 12, color: '#0a8fe8', marginTop: 2 }}>{result.loc} · {result.date}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: '#666' }}>
                  <span>By <b>{result.reporter}</b></span>
                  <span>{result.dur}</span>
                  <span>{result.cred}% credibility</span>
                  <span style={{ color: '#7C3AED', fontWeight: 600 }}>★ {result.tier}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button className="btn btn-primary btn-sm">License this report</button>
                  <button className="btn btn-outline">Get embed code</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LICENSING TIERS */}
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Licensing Tiers</h2>
        {T.map(t => (
          <div key={t.n} className="card card-lg" style={{ border: t.pop ? '2px solid #FE3D07' : '1px solid #eee', position: 'relative' }}>
            {t.pop && <span style={{ position: 'absolute', top: -10, left: 20, background: '#FE3D07', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 4 }}>Most popular</span>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{t.n}</div>
              <span style={{ fontSize: 11, color: '#666', background: '#f7f7f8', padding: '3px 8px', borderRadius: 4, height: 'fit-content' }}>{t.dur}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {t.p.map(p => (
                <div key={p.l} style={{ padding: '6px 12px', borderRadius: 12, background: '#f7f7f8', border: '1px solid #eee' }}>
                  <div style={{ fontSize: 11, color: '#666' }}>{p.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{p.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {t.rights.map(r => (
                <span key={r} style={{ fontSize: 11, color: '#065F46', background: '#ECFDF5', padding: '2px 8px', borderRadius: 4 }}>✓ {r}</span>
              ))}
            </div>
          </div>
        ))}

        {/* MEDIA ORG CTA */}
        <div className="card card-lg" style={{ textAlign: 'center', marginTop: 8, background: 'linear-gradient(135deg, #065F46, #0a8fe8)', color: '#fff', border: 'none' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Media organization?</div>
          <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>Set up a wire service account for volume licensing with priority access to breaking content.</p>
          <a href="mailto:licensing@vozit.com" className="btn" style={{ background: '#fff', color: '#065F46', fontSize: 14, fontWeight: 600, padding: '12px 28px' }}>Contact licensing team</a>
        </div>
      </div>
      <Nav active="/licensing" />
    </div>
  )
}
