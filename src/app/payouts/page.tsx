'use client'
import { useState, useEffect } from 'react'
import { Top } from '@/lib/ui'

export default function Payouts() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [acctInput, setAcctInput] = useState('')
  const [connectMsg, setConnectMsg] = useState('')
  const [amount, setAmount] = useState('')
  const [payoutMsg, setPayoutMsg] = useState('')
  const [payoutLoading, setPayoutLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/payouts')
      const d = await res.json()
      setData(d)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function connect(providerId: string) {
    setConnectMsg('')
    if (providerId === 'stripe') {
      const res = await fetch('/api/payouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', provider: 'stripe' }),
      })
      const d = await res.json()
      if (d.onboarding_url) { window.location.href = d.onboarding_url; return }
      setConnectMsg(d.error || 'Could not start Stripe onboarding')
      return
    }
    setConnecting(providerId)
    setAcctInput('')
  }

  async function saveConnect(providerId: string) {
    if (!acctInput.trim()) return
    setConnectMsg('')
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect', provider: providerId,
          account_details: { account_id: acctInput.trim(), email: acctInput.trim(), wallet_address: acctInput.trim() },
        }),
      })
      const d = await res.json()
      if (!res.ok) { setConnectMsg(d.error || 'Could not connect provider'); return }
      setConnecting(null)
      await load()
    } catch (e: any) { setConnectMsg(e.message) }
  }

  async function requestPayout() {
    setPayoutMsg(''); setPayoutLoading(true)
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'payout', amount: Number(amount) }),
      })
      const d = await res.json()
      if (!res.ok) setPayoutMsg(d.error || 'Payout request failed')
      else if (d.status === 'pending_review') setPayoutMsg(d.message)
      else { setPayoutMsg(`✓ $${d.amount} sent to ${d.provider}`); setAmount(''); await load() }
    } catch (e: any) { setPayoutMsg(e.message) }
    setPayoutLoading(false)
  }

  if (loading) return (<div className="page"><Top /><div className="container"><p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Loading...</p></div></div>)

  const providers = data?.availableProviders || []
  const connectedProvider = data?.provider

  return (
    <div className="page"><Top />
      <div className="container">
        <a href="/settings" style={{ fontSize: 13, color: '#0a8fe8', marginBottom: 16, display: 'block' }}>← Settings</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Payouts</h1>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Withdraw earnings. 7-day hold.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { l: 'Available', v: data?.balance?.available ?? 0, c: '#22C55E' },
            { l: 'Pending', v: data?.balance?.pending ?? 0, c: '#CA8A04' },
            { l: 'Total', v: data?.balance?.total ?? 0, c: '#1a1a1a' },
          ].map(b => (
            <div key={b.l} className="card"><div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{b.l}</div><div style={{ fontSize: 24, fontWeight: 700, color: b.c }}>${Number(b.v).toFixed(2)}</div></div>
          ))}
        </div>

        {connectedProvider && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Request a withdrawal</div>
            {payoutMsg && <div style={{ fontSize: 12, marginBottom: 10, color: payoutMsg.startsWith('✓') ? '#065F46' : '#DC2626' }}>{payoutMsg}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (USD)" type="number" style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' }} />
              <button onClick={requestPayout} disabled={payoutLoading || !amount || Number(amount) <= 0} className="btn btn-primary" style={{ opacity: (payoutLoading || !amount) ? 0.5 : 1 }}>
                {payoutLoading ? 'Sending...' : `Withdraw via ${connectedProvider}`}
              </button>
            </div>
          </div>
        )}

        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Payout providers</div>
        {connectMsg && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{connectMsg}</div>}
        {providers.map((p: any) => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28, width: 36, textAlign: 'center' }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{p.description}</div>
              </div>
              {connectedProvider === p.id
                ? <span style={{ fontSize: 12, fontWeight: 600, color: '#22C55E' }}>✓ Connected</span>
                : <button onClick={() => connect(p.id)} className="btn btn-outline">Connect</button>}
            </div>
            {connecting === p.id && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input value={acctInput} onChange={e => setAcctInput(e.target.value)} placeholder="Account email / ID / wallet address" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 12, fontFamily: 'inherit' }} />
                <button onClick={() => saveConnect(p.id)} className="btn btn-primary btn-sm">Save</button>
              </div>
            )}
          </div>
        ))}

        {data?.payouts?.length > 0 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 10px' }}>Recent payouts</div>
            {data.payouts.map((p: any) => (
              <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>${Number(p.amount).toFixed(2)} via {p.provider}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{new Date(p.created_at).toLocaleDateString()}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: p.status === 'completed' ? '#22C55E' : p.status === 'failed' ? '#DC2626' : '#CA8A04' }}>{p.status}</span>
              </div>
            ))}
          </>
        )}

        <div style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 12 }}>OFAC sanctions screening on every withdrawal</div>
      </div>
    </div>
  )
}
