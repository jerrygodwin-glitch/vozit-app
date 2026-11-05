'use client'
import { useState } from 'react'
import { LOGO } from '@/lib/ui'
import { useAuth } from '@/hooks/useAuth'

// Real platform marks (simple-icons, verified official SVGs + published
// hex colors) in place of Google's favicon service — that was blocked by
// this site's own CSP img-src (same root cause as the broken Google/
// Facebook sign-in logos fixed earlier), so every one of these rendered
// as a broken-image icon. Not yet links to anything — VozIt's own
// accounts on these platforms don't exist yet.
const SOCIAL_ICONS: { label: string; color: string; path: string }[] = [
  { label: 'YouTube', color: '#FF0000', path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
  { label: 'TikTok', color: '#000000', path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
  { label: 'Instagram', color: '#FF0069', path: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077' },
  { label: 'Facebook', color: '#0866FF', path: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z' },
  { label: 'X', color: '#000000', path: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z' },
]
const TABS = [
  { l: 'Home', h: '/' },
  { l: 'Feed', h: '/feed' },
  { l: 'Dashboard', h: '/settings' },
  { l: 'Contribute', h: '/upload' },
  { l: 'Assignments', h: '/assignments' },
  { l: 'Tasks', h: '/tasks' },
  { l: 'Licensing', h: '/licensing' },
  { l: 'About', h: '#about' },
]
const TC: any = { starter: { c: '#22C55E', l: 'Starter' }, silver: { c: '#64748B', l: 'Silver' }, gold: { c: '#CA8A04', l: 'Gold' }, platinum: { c: '#7C3AED', l: 'Platinum' } }
const REGIONS = ['Americas', 'Europe', 'Middle East', 'Africa', 'Asia']
// Same keyword-matching approach as FeedClient — location text is normally
// "City, State, Country", which never spells out the continent itself.
const REGION_KEYWORDS: Record<string, string[]> = {
  Americas: ['america', 'united states', 'usa', 'u.s.', 'canada', 'mexico', 'brazil', 'argentina', 'colombia', 'chile', 'peru', 'venezuela', 'ecuador', 'cuba', 'jamaica', 'guatemala', 'belize', 'el salvador', 'honduras', 'nicaragua', 'costa rica', 'panama', 'haiti', 'dominican republic', 'puerto rico', 'bahamas', 'trinidad', 'barbados', 'saint lucia', 'grenada', 'antigua', 'dominica', 'bolivia', 'paraguay', 'uruguay', 'guyana', 'suriname'],
  Europe: ['europe', 'ukraine', 'russia', 'germany', 'france', 'united kingdom', 'uk', 'italy', 'spain', 'poland', 'portugal', 'netherlands', 'belgium', 'sweden', 'norway', 'greece', 'romania'],
  'Middle East': ['middle east', 'israel', 'palestine', 'iran', 'iraq', 'syria', 'saudi arabia', 'yemen', 'lebanon', 'jordan', 'turkey', 'qatar', 'kuwait', 'uae', 'united arab emirates'],
  Asia: ['asia', 'china', 'japan', 'india', 'korea', 'vietnam', 'philippines', 'indonesia', 'pakistan', 'afghanistan', 'thailand', 'malaysia', 'bangladesh'],
  Africa: ['africa', 'nigeria', 'egypt', 'kenya', 'south africa', 'ethiopia', 'sudan', 'congo', 'somalia', 'ghana', 'morocco', 'uganda'],
}
const CATEGORIES = ['Justice', 'Politics', 'Economy', 'Environment', 'Conflict/Crisis', 'Entertainment', 'Sports']
// Reports store category as the lowercase code chosen on upload (see
// CATEGORIES in /api/reports) — map each code to its display label here.
const CATEGORY_LABELS: Record<string, string> = { justice: 'Justice', politics: 'Politics', economy: 'Economy', environment: 'Environment', crisis: 'Conflict/Crisis', entertainment: 'Entertainment', sports: 'Sports', other: 'Other' }

function timeAgo(iso: string) {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// Reports/assignments now arrive as props from the server-rendered page
// (see page.tsx) instead of being fetched here in a useEffect. Confirmed
// directly: the old client-only fetch meant the server-rendered HTML
// always showed empty-state placeholders ("No open assignments right
// now") regardless of real data, since useEffect never runs during SSR —
// invisible to any crawler that doesn't execute JavaScript, including
// Google AdSense's review crawler, which cited this as a contributing
// reason the site was rejected. Real content is now part of the initial
// HTML; groupBy stays client-side state since it's genuinely interactive.
export function LandingClient({ reports, assignments }: { reports: any[]; assignments: any[] }) {
  const [groupBy, setGroupBy] = useState<'location' | 'category'>('location')
  const { user, loading: authLoading } = useAuth()

  const groups = groupBy === 'location' ? REGIONS : CATEGORIES
  const matchName = (l: string) => (l || '').toLowerCase()
  const reportsForGroup = (group: string) => groupBy === 'location'
    ? reports.filter(r => REGION_KEYWORDS[group]?.some(k => matchName(r.location_name).includes(k)))
    : reports.filter(r => CATEGORY_LABELS[r.category] === group)
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
          {authLoading ? null : user ? (
            <a href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '4px 14px 4px 4px' }}>
              <span style={{ width: 24, height: 24, borderRadius: 12, background: TC[user.tier || 'starter']?.c || TC.starter.c, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{(user.display_name || user.username || '?').slice(0, 2).toUpperCase()}</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>@{user.username}</span>
            </a>
          ) : (
            <>
              <a href="/auth/login" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600, padding: '8px 20px' }}>Sign in</a>
              <a href="/auth/register" className="btn btn-sm" style={{ background: '#FE3D07', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, padding: '8px 20px' }}>New Account</a>
            </>
          )}
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
              <button onClick={() => setGroupBy('location')} className="btn btn-sm" style={groupBy === 'location' ? { background: '#FE3D07', color: '#fff', border: 'none', fontSize: 11 } : { background: '#fff', color: '#0a8fe8', border: '1px solid #eee', fontSize: 11 }}>by Location</button>
              <button onClick={() => setGroupBy('category')} className="btn btn-sm" style={groupBy === 'category' ? { background: '#FE3D07', color: '#fff', border: 'none', fontSize: 11 } : { background: '#fff', color: '#0a8fe8', border: '1px solid #eee', fontSize: 11 }}>by Category</button>
            </div>
          </div>

          {!reports.length && groupBy === 'category' && (
            <div style={{ padding: '24px 12px', fontSize: 13, color: '#999', textAlign: 'center', background: '#fafafa', borderRadius: 8 }}>
              No reports yet — be the first to <a href="/upload" style={{ color: '#0a8fe8', fontWeight: 600 }}>report what you see</a>.
            </div>
          )}
          {groups.map(group => {
            const groupReports = reportsForGroup(group)
            // Category sections just hide when empty (categories aren't a
            // fixed "coverage map" the way regions are) — but an empty
            // region reads as VozIt having no presence there at all, so it
            // gets a "Coming Soon" placeholder instead of disappearing.
            if (!groupReports.length && groupBy !== 'location') return null
            return (
              <div key={group} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px 0 14px', background: '#D63006', borderRadius: 6, height: 32, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{group}</span>
                  <a href="/upload" className="btn btn-sm" style={{ background: '#fff', color: '#0a8fe8', border: 'none', fontSize: 10, fontWeight: 700 }}>Contribute</a>
                </div>
                {!groupReports.length && (
                  <div style={{ padding: '20px 14px', fontSize: 13, color: '#aaa', textAlign: 'center', background: '#fafafa', borderRadius: '0 0 8px 8px', fontWeight: 600, letterSpacing: 0.3 }}>
                    Coming Soon
                  </div>
                )}
                {groupReports.map(r => {
                  const t = TC[r.user?.tier || 'starter'] || TC.starter
                  return (
                    <a key={r.id} href={'/report/' + r.id} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', marginBottom: 4, textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ width: 140, minHeight: 90, background: 'linear-gradient(135deg,#1a2a3a,#2a3a4a)', position: 'relative', flexShrink: 0, borderRadius: '8px 0 0 8px', overflow: 'hidden' }}>
                        {r.thumbnail_url && <img src={r.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 36, height: 36, borderRadius: 18, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 0, height: 0, borderLeft: '12px solid #fff', borderTop: '7px solid transparent', borderBottom: '7px solid transparent', marginLeft: 2 }} />
                        </div>
                        <span style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 10, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: 3 }}>0:{String(r.duration_seconds || 0).padStart(2, '0')}</span>
                      </div>
                      <div style={{ flex: 1, padding: '8px 12px' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: '#0a8fe8', marginTop: 4 }}>{r.location_name} · {timeAgo(r.created_at)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                          <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>▲ {r.upvotes || 0}</span>
                          <span style={{ fontSize: 12, color: '#666' }}>{r.credibility_pct}% credibility</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: t.c + '15', color: t.c, fontWeight: 600, marginLeft: 'auto' }}>★ {t.l}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>by <span style={{ fontWeight: 600 }}>@{r.user?.username}</span></div>
                      </div>
                    </a>
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
            {[{ n: '1', t: 'Record', d: '90-second guided video with 5W prompts' }, { n: '2', t: 'Upload', d: 'AI analysis, moderation, watermark' }, { n: '3', t: 'Earn', d: '40-55% of ad revenue, licensing, assignment fees' }].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: '#FE3D07', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{s.n}</div>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{s.t}</div><div style={{ fontSize: 11, color: '#666' }}>{s.d}</div></div>
              </div>
            ))}
          </div>

          {/* Tier system */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Reporter Tiers</div>
            {[{ l: 'Starter', s: '40%', c: '#22C55E' }, { l: 'Silver', s: '45%', c: '#64748B' }, { l: 'Gold', s: '50%', c: '#CA8A04' }, { l: 'Platinum', s: '55%', c: '#7C3AED' }].map(t => (
              <div key={t.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.c }}>★ {t.l}</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{t.s}</span>
              </div>
            ))}
          </div>

          {/* Featured Assignments — real data from /api/assignments (active,
              most recent 3), not the old hardcoded Ukraine/Sudan/Venezuela
              placeholders. No individual assignment detail page exists yet,
              so each card links to the full /assignments list, same as
              "more →". */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Featured Assignments</div>
              <a href="/assignments" style={{ fontSize: 11, color: '#0a8fe8' }}>more →</a>
            </div>
            {assignments.length === 0 && <div style={{ fontSize: 12, color: '#999', padding: '8px 0' }}>No open assignments right now.</div>}
            {assignments.map(a => (
              <a key={a.id} href="/assignments" style={{ display: 'block', padding: '8px 0', borderBottom: '1px solid #f5f5f5', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: a.urgency === 'critical' || a.urgency === 'high' ? '#DC2626' : '#999', fontWeight: 600, textTransform: 'capitalize' }}>{a.urgency}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: a.assignment_fee_pool_usd > 0 ? '#065F46' : '#999' }}>
                    {a.assignment_fee_pool_usd > 0 ? `$${Number(a.assignment_fee_pool_usd).toLocaleString()}` : 'Coverage request'}
                  </span>
                </div>
              </a>
            ))}
          </div>

          {/* "Get the App" card removed — the mobile app doesn't exist yet,
              so these buttons were dead href="#" links advertising
              something that isn't real, not just a broken link. Bring
              this back once there's an actual App Store/Google Play
              listing to point to. */}

          {/* Social — icons only for now, not yet links (see SOCIAL_ICONS comment) */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
            {SOCIAL_ICONS.map(s => (
              <span key={s.label} title={s.label} style={{ width: 28, height: 28, borderRadius: 6, background: '#f7f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={s.color}><path d={s.path} /></svg>
              </span>
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
            Reporters earn 40-55% of all revenue generated from their content — including ad revenue, media licensing fees, and assignment fees. All payouts are screened for OFAC compliance with 8 payout providers covering 200+ countries.
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
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[{ l: 'Feed', h: '/feed' }, { l: 'Assignments', h: '/assignments' }, { l: 'Licensing', h: '/licensing' }, { l: 'About', h: '#about' }, { l: 'Privacy', h: '/privacy' }, { l: 'Terms', h: '/terms' }].map(t => (
              <a key={t.l} href={t.h} style={{ color: '#999', fontSize: 12 }}>{t.l}</a>
            ))}
          </div>
          <div style={{ color: '#666' }}>© {new Date().getFullYear()} VozIt! — Citizen Journalism</div>
        </div>
      </footer>
    </div>
  )
}
