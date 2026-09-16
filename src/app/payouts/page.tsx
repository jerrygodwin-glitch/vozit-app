'use client'
import { Top } from '@/lib/ui'
export default function Payouts() {
  const G = 'https://www.google.com/s2/favicons?domain=DOMAIN&sz=128'
  const P = [
    { n: 'Stripe', d: 'Bank transfer, 46+ countries', r: 'US, EU, UK, CA, AU +', domain: 'stripe.com' },
    { n: 'PayPal', d: 'PayPal balance, 200+ countries', r: 'Global', domain: 'paypal.com' },
    { n: 'Wise', d: 'Low-fee bank transfer, real FX rate', r: '80+ countries', domain: 'wise.com' },
    { n: 'Payoneer', d: 'Bank or prepaid card', r: '200+ countries', domain: 'payoneer.com' },
    { n: 'Mobile Money', d: 'M-Pesa, MTN, Airtel via Flutterwave', r: 'Africa', domain: 'flutterwave.com' },
    { n: 'Chipper Cash', d: 'Chipper wallet, zero fees', r: '7 African countries', domain: 'chippercash.com' },
    { n: 'WorldRemit', d: 'Bank, mobile money, or cash pickup', r: '130+ countries', domain: 'worldremit.com' },
    { n: 'Crypto (USDC)', d: 'To any wallet. No bank needed.', r: 'Anywhere', domain: 'circle.com' },
  ]
  return (
    <div className="page"><Top />
      <div className="container">
        <a href="/settings" style={{ fontSize: 13, color: '#0a8fe8', marginBottom: 16, display: 'block' }}>← Settings</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Payouts</h1>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Withdraw earnings. 7-day hold.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[{ l: 'Available', v: '$0.00', c: '#22C55E' }, { l: 'Pending', v: '$0.00', c: '#CA8A04' }, { l: 'Total', v: '$0.00', c: '#1a1a1a' }].map(b => (
            <div key={b.l} className="card"><div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{b.l}</div><div style={{ fontSize: 28, fontWeight: 700, color: b.c }}>{b.v}</div></div>
          ))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Payout providers</div>
        {P.map(p => (
          <div key={p.n} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={G.replace('DOMAIN', p.domain)} alt={p.n} style={{ width: 36, height: 36, borderRadius: 12 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{p.n}</div>
              <div style={{ fontSize: 11, color: '#666' }}>{p.d}</div>
              <div style={{ fontSize: 11, color: '#0a8fe8', marginTop: 2 }}>{p.r}</div>
            </div>
            <button className="btn btn-outline">Connect</button>
          </div>
        ))}
        <div style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 12 }}>OFAC sanctions screening on every withdrawal</div>
      </div>
    </div>
  )
}
