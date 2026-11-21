'use client'
import { Nav, Top } from '@/lib/ui'
import { useAuth } from '@/hooks/useAuth'
import { useUITranslation } from '@/hooks/useUITranslation'

const TC: Record<string, { c: string; rate: string }> = { starter: { c: '#22C55E', rate: '40%' }, silver: { c: '#64748B', rate: '45%' }, gold: { c: '#CA8A04', rate: '50%' }, platinum: { c: '#7C3AED', rate: '55%' } }

// Tier names (Starter/Silver/Gold/Platinum) are left untranslated — they're
// the same branded tier labels shown everywhere else in the app (badges,
// the feed, etc.), not generic copy, so translating them here only would
// make this one page inconsistent with the rest of the product.
const SETTINGS_STRINGS = {
  pageTitle: 'Settings',
  loading: 'Loading...',
  revenue: 'revenue',
  tierProgression: 'TIER PROGRESSION',
  reports: 'reports',
  earnings: 'Earnings',
  payouts: 'Payouts',
  social: 'Social',
  licensing: 'Licensing',
  blockedAccounts: 'Blocked Accounts',
  signOut: 'Sign out',
}

export default function Settings() {
  const { user, loading, signOut } = useAuth()
  const tr = useUITranslation('settings', SETTINGS_STRINGS)
  const t = TC[user?.tier || 'starter'] || TC.starter
  const menuItems = [
    { i: '📊', t: tr.earnings, h: '/earnings' }, { i: '💰', t: tr.payouts, h: '/payouts' },
    { i: '📱', t: tr.social, h: '/settings/social' }, { i: '📄', t: tr.licensing, h: '/licensing' },
    { i: '🚫', t: tr.blockedAccounts, h: '/settings/blocked' },
  ]
  return (
    <div className="page">
      <Top />
      <div className="container">
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>{tr.pageTitle}</h1>
        {loading ? (
          <div className="card" style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>{tr.loading}</div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: `linear-gradient(135deg,${t.c},${t.c}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 }}>{(user?.display_name || '?').slice(0, 2).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>@{user?.username || '...'}</div>
              <div style={{ fontSize: 13, color: t.c }}>★ {(user?.tier || 'starter').charAt(0).toUpperCase() + (user?.tier || 'starter').slice(1)} — {t.rate} {tr.revenue}</div>
            </div>
          </div>
        )}
        <div className="card">
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>{tr.tierProgression}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[{ l: 'Starter', s: '40%', r: '0-25', c: '#22C55E' }, { l: 'Silver', s: '45%', r: '26-100', c: '#64748B' }, { l: 'Gold', s: '50%', r: '101-499', c: '#CA8A04' }, { l: 'Platinum', s: '55%', r: '500+', c: '#7C3AED' }].map(t => (
              <div key={t.l} style={{ padding: 10, borderRadius: 12, background: t.c + '10', border: '1px solid ' + t.c + '25' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.c }}>★ {t.l}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{t.s}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{t.r} {tr.reports}</div>
              </div>
            ))}
          </div>
        </div>
        {menuItems.map(s => (
          <a key={s.h} href={s.h} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#1a1a1a' }}>
            <span style={{ fontSize: 28 }}>{s.i}</span>
            <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{s.t}</span>
            <span style={{ color: '#ccc', fontSize: 18 }}>›</span>
          </a>
        ))}
        {/* Every "signed in" indicator across the app (the shared Top
            header, the homepage's own header) links here — confirmed
            directly there was no sign-out control reachable from this
            page at all, only from a separate /profile screen behind the
            bottom nav's "More" tab, which isn't even shown on the
            homepage. */}
        <button onClick={signOut} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#DC2626', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ fontSize: 28 }}>🚪</span>
          <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{tr.signOut}</span>
        </button>
      </div>
      <Nav active="/settings" />
    </div>
  )
}
