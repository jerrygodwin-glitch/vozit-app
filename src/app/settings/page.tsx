'use client'
import { Nav, Top } from '@/lib/ui'
import { useAuth } from '@/hooks/useAuth'

const TC: Record<string, { c: string; rate: string }> = { starter: { c: '#22C55E', rate: '50%' }, silver: { c: '#64748B', rate: '55%' }, gold: { c: '#CA8A04', rate: '65%' }, platinum: { c: '#7C3AED', rate: '70%' } }

export default function Settings() {
  const { user, loading } = useAuth()
  const t = TC[user?.tier || 'starter'] || TC.starter
  return (
    <div className="page">
      <Top />
      <div className="container">
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Settings</h1>
        {loading ? (
          <div className="card" style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>Loading...</div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: `linear-gradient(135deg,${t.c},${t.c}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 }}>{(user?.display_name || '?').slice(0, 2).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>@{user?.username || '...'}</div>
              <div style={{ fontSize: 13, color: t.c }}>★ {(user?.tier || 'starter').charAt(0).toUpperCase() + (user?.tier || 'starter').slice(1)} — {t.rate} revenue</div>
            </div>
          </div>
        )}
        <div className="card">
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>TIER PROGRESSION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[{ l: 'Starter', s: '50%', r: '0-25', c: '#22C55E' }, { l: 'Silver', s: '55%', r: '26-100', c: '#64748B' }, { l: 'Gold', s: '65%', r: '101-499', c: '#CA8A04' }, { l: 'Platinum', s: '70%', r: '500+', c: '#7C3AED' }].map(t => (
              <div key={t.l} style={{ padding: 10, borderRadius: 12, background: t.c + '10', border: '1px solid ' + t.c + '25' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.c }}>★ {t.l}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{t.s}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{t.r} reports</div>
              </div>
            ))}
          </div>
        </div>
        {[{ i: '📊', t: 'Earnings', h: '/earnings' }, { i: '💰', t: 'Payouts', h: '/payouts' }, { i: '📱', t: 'Social', h: '/settings/social' }, { i: '📄', t: 'Licensing', h: '/licensing' }].map(s => (
          <a key={s.t} href={s.h} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#1a1a1a' }}>
            <span style={{ fontSize: 28 }}>{s.i}</span>
            <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{s.t}</span>
            <span style={{ color: '#ccc', fontSize: 18 }}>›</span>
          </a>
        ))}
      </div>
      <Nav active="/settings" />
    </div>
  )
}
