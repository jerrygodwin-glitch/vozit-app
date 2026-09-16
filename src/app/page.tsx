'use client'
import { LOGO } from '@/lib/ui'

const G = 'https://www.google.com/s2/favicons?domain=DOMAIN&sz=128'
const TABS = [
  { l: 'Home', h: '/' },
  { l: 'Feed', h: '/feed' },
  { l: 'Contribute', h: '/upload' },
  { l: 'Assignments', h: '/assignments' },
  { l: 'Licensing', h: '/licensing' },
  { l: 'About', h: '#about' },
]
const REPORTS = [
  { id: '1', t: 'Shelling hits residential area in Saltivka', loc: 'Kharkiv, Ukraine', u: 'olena_k', tier: 'platinum', up: 847, cred: 98, dur: 67, time: '2h ago', region: 'Europe' },
  { id: '2', t: 'Protesters block main highway', loc: 'Caracas, Venezuela', u: 'maria_vzla', tier: 'gold', up: 412, cred: 93, dur: 45, time: '4h ago', region: 'Americas' },
  { id: '3', t: 'Flash flooding destroys bridge', loc: 'Bihar, India', u: 'ravi_reports', tier: 'silver', up: 234, cred: 89, dur: 52, time: '6h ago', region: 'Asia' },
  { id: '6', t: 'Aid convoy blocked at border crossing', loc: 'Rafah, Gaza', u: 'ahmad_gz', tier: 'gold', up: 1203, cred: 96, dur: 88, time: '1h ago', region: 'Middle East' },
  { id: '4', t: 'Police teargas at student march', loc: 'Nairobi, Kenya', u: 'chidi_nbo', tier: 'starter', up: 156, cred: 85, dur: 38, time: '8h ago', region: 'Africa' },
  { id: '5', t: 'Wildfire approaches residential zone', loc: 'Valparaiso, Chile', u: 'pablo_cl', tier: 'silver', up: 198, cred: 91, dur: 72, time: '12h ago', region: 'Americas' },
]
const TC: any = { starter: { c: '#22C55E', l: 'Starter' }, silver: { c: '#64748B', l: 'Silver' }, gold: { c: '#CA8A04', l: 'Gold' }, platinum: { c: '#7C3AED', l: 'Platinum' } }
const REGIONS = ['Americas', 'Europe', 'Middle East', 'Africa', 'Asia']

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* TOP BAR */}
      <header style={{ background: 'linear-gradient(to right, #70b8e0, #50b0e8 30%, #18a0e8 60%, #0a3ff1)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={LOGO} style={{ height: 52, width: 52, borderRadius: 10 }} alt="VozIt logo" />
          <div>
            <div style={{ color: '#fff', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>VozIt!</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/auth/login" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600, padding: '8px 20px' }}>Sign in</a>
          <a href="/auth/register" className="btn btn-sm" style={{ background: '#FE3D07', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, padding: '8px 20px' }}>New Account</a>
        </div>
      </header>

      {/* SPEECH BUBBLE LOGO */}
      <div style={{ background: 'linear-gradient(135deg, #f8f4ef, #e8e0d4)', padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', position: 'relative', background: '#FE3D07', borderRadius: 20, padding: '16px 32px', marginBottom: 8 }}>
          <span style={{ color: '#fff', fontSize: 28, fontWeight: 700, fontStyle: 'italic' }}>I was there...</span>
          <div style={{ position: 'absolute', bottom: -12, left: 40, width: 0, height: 0, borderLeft: '14px solid #FE3D07', borderBottom: '14px solid transparent' }} />
        </div>
        <p style={{ fontSize: 15, color: '#666', marginTop: 20, maxWidth: 500, margin: '10px auto 0' }}>
          Citizen journalism platform — report what you see, earn what you capture
        </p>
      </div>

      {/* NAV TABS */}
      <nav style={{ borderBottom: '2px solid #eee', background: '#fff', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', overflowX: 'auto', gap: 0 }}>
          {TABS.map(t => (
            <a key={t.l} href={t.h} style={{
              padding: '14px 20px', fontSize: 14, fontWeight: 600,
              color: t.l === 'Home' ? '#FE3D07' : '#666',
              borderBottom: t.l === 'Home' ? '3px solid #FE3D07' : '3px solid transparent',
              whiteSpace: 'nowrap', transition: 'color 0.15s',
            }}>{t.l}</a>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 24, padding: '20px 16px' }}>

        {/* LEFT: REPORTS BY REGION */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Latest Reports</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" style={{ background: '#FE3D07', color: '#fff', border: 'none', fontSize: 11 }}>by Location</button>
              <button className="btn btn-sm" style={{ background: '#fff', color: '#0a8fe8', border: '1px solid #eee', fontSize: 11 }}>by Category</button>
            </div>
          </div>

          {REGIONS.map(region => {
            const regionReports = REPORTS.filter(r => r.region === region)
            if (!regionReports.length) return null
            return (
              <div key={region} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px 0 14px', background: '#D63006', borderRadius: 6, height: 32, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{region}</span>
                  <a href="/upload" className="btn btn-sm" style={{ background: '#fff', color: '#0a8fe8', border: 'none', fontSize: 10, fontWeight: 700 }}>Contribute</a>
                </div>
                {regionReports.map(r => {
                  const t = TC[r.tier]
                  return (
                    <div key={r.id} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', marginBottom: 4 }}>
                      <div style={{ width: 140, minHeight: 90, background: 'linear-gradient(135deg,#1a2a3a,#2a3a4a)', position: 'relative', flexShrink: 0, borderRadius: '8px 0 0 8px' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 36, height: 36, borderRadius: 18, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 0, height: 0, borderLeft: '12px solid #fff', borderTop: '7px solid transparent', borderBottom: '7px solid transparent', marginLeft: 2 }} />
                        </div>
                        <span style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 10, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: 3 }}>0:{r.dur}</span>
                      </div>
                      <div style={{ flex: 1, padding: '8px 12px' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{r.t}</div>
                        <div style={{ fontSize: 12, color: '#0a8fe8', marginTop: 4 }}>{r.loc} · {r.time}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                          <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>▲ {r.up}</span>
                          <span style={{ fontSize: 12, color: '#666' }}>{r.cred}% credibility</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: t.c + '15', color: t.c, fontWeight: 600, marginLeft: 'auto' }}>★ {t.l}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>by <span style={{ fontWeight: 600 }}>@{r.u}</span></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {/* Search */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Search</div>
            <div style={{ position: 'relative' }}>
              <input placeholder="Search reports..." style={{ paddingLeft: 36, fontSize: 13 }} />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#999' }}>🔍</span>
            </div>
          </div>

          {/* How it works */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>How VozIt! Works</div>
            {[{ n: '1', t: 'Record', d: '90-second guided video with 5W prompts' }, { n: '2', t: 'Upload', d: 'AI analysis, moderation, watermark' }, { n: '3', t: 'Earn', d: '50-70% of ad revenue, licensing, assignment fees' }].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: '#FE3D07', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{s.n}</div>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{s.t}</div><div style={{ fontSize: 11, color: '#666' }}>{s.d}</div></div>
              </div>
            ))}
          </div>

          {/* Tier system */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Reporter Tiers</div>
            {[{ l: 'Starter', s: '50%', c: '#22C55E' }, { l: 'Silver', s: '55%', c: '#64748B' }, { l: 'Gold', s: '65%', c: '#CA8A04' }, { l: 'Platinum', s: '70%', c: '#7C3AED' }].map(t => (
              <div key={t.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.c }}>★ {t.l}</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{t.s}</span>
              </div>
            ))}
          </div>

          {/* Featured Assignments */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Featured Assignments</div>
              <a href="/assignments" style={{ fontSize: 11, color: '#0a8fe8' }}>more →</a>
            </div>
            {[{ t: 'Ukraine — frontline', b: 2400, u: 'Critical' }, { t: 'Sudan — humanitarian', b: 3000, u: 'Critical' }, { t: 'Venezuela — protests', b: 1200, u: 'High' }].map(a => (
              <div key={a.t} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.t}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>{a.u}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>${a.b.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Get the App */}
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Get the App</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="#" style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#000', color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'center' }}>App Store</a>
              <a href="#" style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#000', color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'center' }}>Google Play</a>
            </div>
          </div>

          {/* Social */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
            {['youtube.com', 'tiktok.com', 'instagram.com', 'facebook.com', 'x.com'].map(d => (
              <img key={d} src={G.replace('DOMAIN', d)} alt={d} style={{ width: 28, height: 28, borderRadius: 6, opacity: 0.7 }} />
            ))}
          </div>
        </div>
      </div>

      {/* ABOUT SECTION */}
      <div id="about" style={{ background: '#f7f7f8', padding: '48px 20px', marginTop: 32 }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>About VozIt!</h2>
          <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7, marginBottom: 20 }}>
            VozIt! is a citizen journalism platform that empowers eyewitnesses around the world to report breaking news, document human rights, and earn revenue from their footage. Every report goes through AI-powered 5W analysis, content moderation, and provenance verification before being published and distributed across social media platforms.
          </p>
          <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7 }}>
            Reporters earn 50-70% of all revenue generated from their content — including ad revenue, media licensing fees, and assignment fees. All payouts are screened for OFAC compliance with 8 payout providers covering 200+ countries.
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#1a1a1a', color: '#999', padding: '16px 20px', fontSize: 12 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={LOGO} style={{ height: 28, width: 28, borderRadius: 6 }} alt="VozIt" />
            <span style={{ color: '#fff', fontWeight: 700 }}>VozIt!</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Feed', 'Assignments', 'Licensing', 'About'].map(l => (
              <a key={l} href={l === 'About' ? '#about' : '/' + l.toLowerCase()} style={{ color: '#999', fontSize: 12 }}>{l}</a>
            ))}
          </div>
          <div style={{ color: '#666' }}>© 2024 VozIt! — Citizen Journalism</div>
        </div>
      </footer>
    </div>
  )
}
