'use client'
import { useState } from 'react'
import { Top, Nav } from '@/lib/ui'

export default function Licensing() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [tier, setTier] = useState('digital')
  const [licenseType, setLicenseType] = useState('standard')
  const [org, setOrg] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactName, setContactName] = useState('')
  const [exclusive, setExclusive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [licenseResult, setLicenseResult] = useState<any>(null)
  const [licenseError, setLicenseError] = useState('')

  function extractReportId(u: string) {
    const m = u.trim().match(/\/report\/([a-zA-Z0-9-]+)/)
    return m ? m[1] : u.trim() // allow pasting a bare id too
  }

  async function handleSearch() {
    if (!url.trim()) return
    setSearching(true); setSearchError(''); setResult(null); setShowForm(false); setLicenseResult(null)
    try {
      const reportId = extractReportId(url)
      const res = await fetch(`/api/licensing?report_id=${encodeURIComponent(reportId)}`)
      const d = await res.json()
      if (!res.ok) setSearchError(d.error || 'Report not found')
      else setResult(d)
    } catch (e: any) { setSearchError(e.message) }
    setSearching(false)
  }

  const tierOptions = result?.pricing ? Object.keys(result.pricing) : []
  const typeOptions = result?.pricing?.[tier]?.pricing ? Object.entries(result.pricing[tier].pricing as Record<string, number>) : []

  async function submitLicense() {
    if (!org.trim() || !contactEmail.trim()) return
    setSubmitting(true); setLicenseError(''); setLicenseResult(null)
    try {
      const res = await fetch('/api/licensing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: result.report.id, tier, license_type: licenseType,
          licensee_org: org, licensee_email: contactEmail, licensee_name: contactName || undefined,
          exclusive,
        }),
      })
      const d = await res.json()
      if (!res.ok) setLicenseError(d.error || 'Could not create license request')
      else setLicenseResult(d)
    } catch (e: any) { setLicenseError(e.message) }
    setSubmitting(false)
  }

  function copyEmbed() {
    if (result?.embedCode) navigator.clipboard.writeText(result.embedCode)
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
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={searching || !url.trim()} className="btn btn-primary" style={{ padding: '12px 24px', flexShrink: 0 }}>
              {searching ? 'Looking up...' : 'Look up'}
            </button>
          </div>

          {searchError && <div style={{ marginTop: 12, fontSize: 13, color: '#DC2626' }}>{searchError}</div>}

          {result && (
            <div style={{ marginTop: 16, padding: 16, background: '#f7f7f8', borderRadius: 12, display: 'flex', gap: 14 }}>
              <div style={{ width: 120, height: 80, background: result.report.thumbnail ? `url(${result.report.thumbnail}) center/cover` : 'linear-gradient(135deg,#1a2a3a,#2a3a4a)', borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 0, height: 0, borderLeft: '10px solid #fff', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 2 }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{result.report.title}</div>
                <div style={{ fontSize: 12, color: '#0a8fe8', marginTop: 2 }}>{result.report.location}{result.report.isBreaking && ' · 🔴 Breaking'}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: '#666' }}>
                  <span>By <b>@{result.report.reporter}</b></span>
                  {!result.report.exclusiveAvailable && <span style={{ color: '#DC2626' }}>Exclusive rights already licensed</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button onClick={() => setShowForm(s => !s)} className="btn btn-primary btn-sm">License this report</button>
                  <button onClick={copyEmbed} className="btn btn-outline">Get embed code</button>
                </div>
              </div>
            </div>
          )}

          {showForm && result && (
            <div style={{ marginTop: 16, padding: 16, borderRadius: 12, border: '1px solid #eee' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select value={tier} onChange={e => { setTier(e.target.value); setLicenseType('') }} style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' }}>
                  {tierOptions.map(t => <option key={t} value={t}>{result.pricing[t].name}</option>)}
                </select>
                <select value={licenseType} onChange={e => setLicenseType(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' }}>
                  <option value="">Select type...</option>
                  {typeOptions.map(([k, v]) => <option key={k} value={k}>{k.replace(/_/g, ' ')} — ${v}</option>)}
                </select>
              </div>
              <input value={org} onChange={e => setOrg(e.target.value)} placeholder="Organization name" style={{ marginBottom: 8, fontSize: 13 }} />
              <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Contact email" type="email" style={{ marginBottom: 8, fontSize: 13 }} />
              <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Contact name (optional)" style={{ marginBottom: 8, fontSize: 13 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', marginBottom: 12 }}>
                <input type="checkbox" checked={exclusive} onChange={e => setExclusive(e.target.checked)} disabled={!result.report.exclusiveAvailable} />
                Request exclusive rights {!result.report.exclusiveAvailable && '(unavailable — already exclusively licensed)'}
              </label>

              {licenseError && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{licenseError}</div>}
              {licenseResult ? (
                <div style={{ padding: 12, borderRadius: 8, background: '#ECFDF5', color: '#065F46', fontSize: 13 }}>
                  {licenseResult.license.status === 'active'
                    ? licenseResult.message
                    : <>Request created — ${licenseResult.license.price} ({licenseResult.payment.note}). We'll follow up at <strong>{contactEmail}</strong> via {licenseResult.payment.contact} to complete payment.</>}
                </div>
              ) : (
                <button onClick={submitLicense} disabled={submitting || !licenseType || !org.trim() || !contactEmail.trim()} className="btn btn-primary" style={{ width: '100%' }}>
                  {submitting ? 'Submitting...' : 'Request license'}
                </button>
              )}
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
