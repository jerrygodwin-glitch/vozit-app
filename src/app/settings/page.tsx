'use client'
import { Nav, Top } from '@/lib/ui'

export default function Settings() {
  return (
    <div className="page">
      <Top />
      <div className="container">
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Settings</h1>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: 'linear-gradient(135deg,#22C55E,#22C55E88)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 }}>J</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>@jerry</div>
            <div style={{ fontSize: 13, color: '#22C55E' }}>★ Starter — 50% revenue</div>
          </div>
        </div>
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
