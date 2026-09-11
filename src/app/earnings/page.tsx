'use client'
import { Top } from '@/lib/ui'
export default function Earnings() {
  return (
    <div className="page"><Top />
      <div className="container">
        <a href="/settings" style={{ fontSize: 13, color: '#0a8fe8', marginBottom: 16, display: 'block' }}>← Settings</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Earnings</h1>
        <div style={{ background: 'linear-gradient(135deg,#065F46,#0a8fe8)', borderRadius: 12, padding: 24, marginBottom: 16, color: '#fff' }}>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Total (30d)</div>
          <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>$0.00</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[{ l: 'Ad revenue', v: '$0.00', c: '#0a8fe8' }, { l: 'Licensing', v: '$0.00', c: '#7C3AED' }, { l: 'Tips', v: '$0.00', c: '#CA8A04' }, { l: 'Bounties', v: '$0.00', c: '#22C55E' }].map(s => (
            <div key={s.l} className="card">
              <div style={{ fontSize: 11, color: '#666' }}>{s.l}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.c, marginTop: 6 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
