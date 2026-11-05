'use client'
import { useState, useEffect } from 'react'
import { Top } from '@/lib/ui'
import { createBrowserClient } from '@/lib/supabase'

// Compact country list grouped by which providers actually serve them —
// enough to smart-default without building a full 195-country picker.
// Matches PAYOUT_PROVIDERS' own `regions` arrays in src/lib/payouts.ts.
// Alphabetical by label (verified with a sort, not by hand) — "Other /
// not listed" stays pinned at the end regardless, as the catch-all.
const COUNTRIES = [
  { code: 'AR', label: 'Argentina' }, { code: 'AM', label: 'Armenia' }, { code: 'AU', label: 'Australia' },
  { code: 'AZ', label: 'Azerbaijan' }, { code: 'BH', label: 'Bahrain' },
  { code: 'BZ', label: 'Belize' }, { code: 'BO', label: 'Bolivia' }, { code: 'BR', label: 'Brazil' },
  { code: 'CM', label: 'Cameroon' }, { code: 'CA', label: 'Canada' }, { code: 'CL', label: 'Chile' },
  { code: 'CN', label: 'China' },
  { code: 'CO', label: 'Colombia' }, { code: 'CR', label: 'Costa Rica' }, { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'EC', label: 'Ecuador' }, { code: 'EG', label: 'Egypt' }, { code: 'SV', label: 'El Salvador' },
  { code: 'EU', label: 'European Union' }, { code: 'GH', label: 'Ghana' }, { code: 'GT', label: 'Guatemala' },
  { code: 'GY', label: 'Guyana' }, { code: 'HN', label: 'Honduras' }, { code: 'HK', label: 'Hong Kong' },
  { code: 'IN', label: 'India' }, { code: 'ID', label: 'Indonesia' }, { code: 'IQ', label: 'Iraq' },
  { code: 'IL', label: 'Israel' }, { code: 'JP', label: 'Japan' }, { code: 'JO', label: 'Jordan' },
  { code: 'KE', label: 'Kenya' }, { code: 'KW', label: 'Kuwait' }, { code: 'LB', label: 'Lebanon' },
  { code: 'MV', label: 'Maldives' }, { code: 'MU', label: 'Mauritius' },
  { code: 'MX', label: 'Mexico' }, { code: 'MD', label: 'Moldova' }, { code: 'NZ', label: 'New Zealand' }, { code: 'NI', label: 'Nicaragua' },
  { code: 'NG', label: 'Nigeria' }, { code: 'OM', label: 'Oman' }, { code: 'PA', label: 'Panama' },
  { code: 'PY', label: 'Paraguay' }, { code: 'PE', label: 'Peru' }, { code: 'PH', label: 'Philippines' },
  { code: 'QA', label: 'Qatar' }, { code: 'RW', label: 'Rwanda' }, { code: 'SA', label: 'Saudi Arabia' },
  { code: 'SN', label: 'Senegal' }, { code: 'SC', label: 'Seychelles' }, { code: 'SG', label: 'Singapore' }, { code: 'ZA', label: 'South Africa' },
  { code: 'KR', label: 'South Korea' },
  { code: 'SR', label: 'Suriname' }, { code: 'TW', label: 'Taiwan' }, { code: 'TZ', label: 'Tanzania' },
  { code: 'TH', label: 'Thailand' }, { code: 'TR', label: 'Turkey' },
  { code: 'UG', label: 'Uganda' }, { code: 'UA', label: 'Ukraine' }, { code: 'AE', label: 'United Arab Emirates' },
  { code: 'GB', label: 'United Kingdom' }, { code: 'US', label: 'United States' }, { code: 'UY', label: 'Uruguay' },
  { code: 'VE', label: 'Venezuela' },
  // Deliberately not listed yet: Iran, Syria, Yemen — real, unresolved
  // sanctions complexity (Iran is comprehensively embargoed; Syria's
  // status is actively disputed/changing; Yemen carries targeted
  // sanctions from the ongoing conflict). Same "confirm before guessing"
  // treatment as Venezuela — see the open item on the running list.
  { code: 'other', label: 'Other / not listed' },
]

// Official marks for providers with a verified, accurate source.
// Stripe/PayPal/Wise/Payoneer: simple-icons (open-source exact brand
// SVGs, colors from that same source's published hex values).
// WorldRemit: the real logo's icon-mark paths, isolated and cropped from
// its official SVG (Wikimedia Commons, purple #813fd6) — the source file
// is a full wordmark logo, so only the compact geometric mark is used
// here rather than squishing the whole wide wordmark into a small slot.
// Flutterwave and Chipper Cash have no verified source and keep their
// emoji placeholder rather than risk a hand-drawn, inaccurate knockoff.
const PROVIDER_LOGOS: Record<string, JSX.Element> = {
  stripe: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#635BFF"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>
  ),
  payoneer: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF4800"><path d="M1.474 3.31c.234 1.802 1.035 5.642 1.398 7.263.095.459.201.853.298 1.013.501.865.907-.287.907-.287C5.644 6.616 3.17 3.597 2.38 2.787c-.139-.15-.384-.332-.608-.396-.32-.095-.374.086-.374.236.01.148.065.565.075.682zm21.835-1.463c.31.224 1.386 1.355 0 1.526-1.984.234-5.76.373-12.022 5.61C8.92 10.968 3.607 16.311.76 22.957a.181.181 0 01-.216.106c-.255-.074-.714-.352-.48-1.418.32-1.44 3.201-8.938 10.817-15.552 2.485-2.155 8.416-7.232 12.426-4.245z"/></svg>
  ),
  wise: (
    <span style={{ background: '#163300', borderRadius: 6, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="#9FE870"><path d="M6.488 7.469 0 15.05h11.585l1.301-3.576H7.922l3.033-3.507.01-.092L8.993 4.48h8.873l-6.878 18.925h4.706L24 .595H2.543l3.945 6.874Z"/></svg>
    </span>
  ),
  paypal: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#002991"><path d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z"/></svg>
  ),
  worldremit: (
    <svg width="22" height="22" viewBox="50 50 220 220" fill="#813fd6">
      <path d="M175.36,63.74a2.39,2.39,0,0,1,1.16.3L240,100a2.33,2.33,0,0,1,1.11,1.42l19.51,70.29a2.31,2.31,0,0,1-.22,1.78L224.47,237a2.34,2.34,0,0,1-1.41,1.11l-70.29,19.5a2.28,2.28,0,0,1-.63.09,2.33,2.33,0,0,1-1.16-.3L87.49,221.42a2.31,2.31,0,0,1-1.1-1.42L66.88,149.71a2.31,2.31,0,0,1,.22-1.78L103,84.44a2.36,2.36,0,0,1,1.42-1.11l70.29-19.51a2.72,2.72,0,0,1,.63-.08m0-7.05a9.32,9.32,0,0,0-2.51.34L102.56,76.54A9.36,9.36,0,0,0,96.89,81L61,144.45a9.44,9.44,0,0,0-.88,7.15l19.51,70.29A9.43,9.43,0,0,0,84,227.56l63.49,35.92a9.41,9.41,0,0,0,7.14.88l70.29-19.51a9.39,9.39,0,0,0,5.67-4.43l35.93-63.49a9.37,9.37,0,0,0,.87-7.14L247.91,99.5a9.43,9.43,0,0,0-4.43-5.67L180,57.91a9.37,9.37,0,0,0-4.63-1.22Z"/>
      <path opacity="0.7" d="M151,125.84l-.6,0-10.11,29.67-1.23,3.6a5.41,5.41,0,0,0,0,3.51l9.86,28.91a5.5,5.5,0,0,0,3.17,3.32l1.89.7,10.16-29.79,1.39-4.06a5.29,5.29,0,0,0,0-3.47l-9.84-28.75A5.38,5.38,0,0,0,151,125.84Z"/>
      <path d="M220.7,123.88H199.41a2.85,2.85,0,0,0-2.7,1.94l-9.88,29-.81,2.4a8.21,8.21,0,0,0,0,5.36l10.67,31.29a2.64,2.64,0,0,0,2.65,1.78l.95-.1,23.14-67.88A2.89,2.89,0,0,0,220.7,123.88Z"/>
      <path d="M151.25,197.51H130a2.86,2.86,0,0,1-2.71-1.94l-23.16-67.91a2.86,2.86,0,0,1,2.7-3.78h21.29a2.86,2.86,0,0,1,2.71,1.94L154,193.73A2.86,2.86,0,0,1,151.25,197.51Z"/>
      <path d="M197.54,197.51H176.25a2.85,2.85,0,0,1-2.7-1.94l-23.16-67.91a2.86,2.86,0,0,1,2.7-3.78h21.32a2.86,2.86,0,0,1,2.7,1.94l23.16,67.91A2.88,2.88,0,0,1,197.54,197.51Z"/>
    </svg>
  ),
}

function suggestProviderIds(country: string): string[] {
  // Confirmed directly against Stripe's own supported-country list
  // (stripe.com/global) — Brazil, Mexico, and the UAE are all genuinely
  // Stripe-supported, same as the rest of this bucket, but were
  // previously falling into the generic catch-all below instead. Thailand
  // confirmed the same way. Taiwan and South Korea were NOT on that
  // official list despite showing up in some PayPal/Stripe marketing
  // material — that material conflates "we can charge your customers
  // there" with "you can register a payout account there," which are
  // different things; they use the generic default below instead.
  if (['US', 'CA', 'GB', 'EU', 'AU', 'NZ', 'JP', 'SG', 'HK', 'BR', 'MX', 'AE', 'TH'].includes(country)) return ['stripe', 'paypal', 'wise']
  if (['NG', 'KE', 'GH', 'ZA', 'TZ', 'UG', 'RW', 'CI', 'SN', 'CM', 'EG'].includes(country)) return ['flutterwave', 'chipper', 'worldremit']
  // Central America — these 7 countries were missing from the picker
  // entirely (confirmed directly: a real reporter in Honduras had no
  // option to select her own country). WorldRemit has the most concretely
  // verified cash-pickup coverage here (named partner banks in Honduras:
  // Elektra-Banco Azteca, Banco Ficohsa, Banco Atlántida, Davivienda);
  // Payoneer also checks out across multiple sources for this region.
  if (['GT', 'SV', 'HN', 'BZ', 'NI', 'CR', 'PA'].includes(country)) return ['worldremit', 'payoneer', 'crypto']
  // Iraq — checked specifically after Jerry asked: PayPal doesn't
  // actually operate there (there's a real, active petition asking
  // PayPal to add it), and Wise appears to have the same gap. Payoneer
  // is confirmed to support Iraqi banks directly, so it replaces both
  // here rather than Iraq silently falling into the generic default
  // below, which would have recommended two providers that don't work.
  if (country === 'IQ') return ['payoneer', 'crypto']
  // Lebanon — PayPal confirmed not supported there (two independent
  // sources agree directly, including PayPal's own stated country
  // count). No specific evidence against Wise for Lebanon, so leaving
  // that in rather than guessing a replacement with the same
  // uncertainty this whole check started from.
  if (country === 'LB') return ['wise', 'payoneer', 'crypto']
  // Maldives — researched specifically since both the usual defaults
  // have real, confirmed limitations here (not excluded, just flagged):
  // PayPal could only SEND to Maldives, not receive, until a local
  // telecom's mobile wallet got licensed for inward transfers in October
  // 2025 — and multiple reports describe that rollout as still
  // inconsistent. Wise's support depends heavily on which country the
  // transfer originates from (some corridors work, others are still
  // waitlisted). Crypto has no such limitation, so it's included
  // alongside both rather than in place of them.
  if (country === 'MV') return ['wise', 'paypal', 'payoneer', 'crypto']
  // China — confirmed directly: PayPal's own individual (non-business)
  // accounts in China cannot receive payments at all, only send, so it's
  // excluded rather than offered as a dead end. Wise works but is
  // meaningfully limited there (routes through Alipay, per-transfer caps,
  // no business accounts). Payoneer has the strongest evidence — eBay's
  // own developer docs name it as the only payout provider they support
  // for mainland China sellers. Crypto is deliberately left off too:
  // mainland China has banned cryptocurrency transactions domestically
  // since 2021, so recommending it here wouldn't just be unreliable, it'd
  // point someone toward something illegal under their own law.
  if (country === 'CN') return ['payoneer', 'wise']
  // Armenia and Azerbaijan — PayPal confirmed broken for both, same
  // "send only" problem as China's individual accounts: multiple
  // independent sources for each country agree users cannot receive or
  // withdraw PayPal funds there at all. Wise confirmed working for both
  // (explicit local bank account payouts in each country's own
  // currency — AMD, AZN). Payoneer has decent supporting evidence too,
  // including a specific local bank partnership in Armenia.
  if (['AM', 'AZ'].includes(country)) return ['wise', 'payoneer', 'crypto']
  return ['wise', 'paypal', 'crypto']
}

export default function Payouts() {
  const sb = createBrowserClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [acctInput, setAcctInput] = useState('')
  const [connectMsg, setConnectMsg] = useState('')
  const [amount, setAmount] = useState('')
  const [payoutMsg, setPayoutMsg] = useState('')
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [showAllProviders, setShowAllProviders] = useState(false)
  const [settingCountry, setSettingCountry] = useState(false)
  const [editingCountry, setEditingCountry] = useState(false)

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

  async function setCountry(country: string) {
    setSettingCountry(true)
    // Update the screen immediately rather than waiting on a save-then-
    // refetch round trip — if that persist step has any hiccup, the
    // provider list should still show right away instead of the page
    // just sitting there with nothing visible.
    setData((prev: any) => ({ ...prev, country }))
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setConnectMsg('Not signed in — please refresh and try again.'); return }
      const { error } = await sb.from('users').update({ country }).eq('id', user.id)
      if (error) setConnectMsg(`Could not save your country: ${error.message}`)
      else setEditingCountry(false)
    } catch (e: any) {
      setConnectMsg(`Could not save your country: ${e.message}`)
    } finally { setSettingCountry(false) }
  }

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
  const country = data?.country
  const suggestedIds = country ? suggestProviderIds(country) : []
  const suggested = providers.filter((p: any) => suggestedIds.includes(p.id))
  const others = providers.filter((p: any) => !suggestedIds.includes(p.id))
  // Fall back to showing everything if the "recommended for this country"
  // filter would otherwise leave nothing on screen — better to show all 8
  // than to show zero.
  const providersToShow = country && !showAllProviders && suggested.length > 0 ? suggested : providers

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

        {(!country || editingCountry) && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Where are you located?</div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>So we can show the payout methods that actually work where you are.</div>
            <select onChange={e => e.target.value && setCountry(e.target.value)} disabled={settingCountry} defaultValue={country || ''} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' }}>
              <option value="" disabled>Select your country...</option>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            {editingCountry && (
              <span onClick={() => setEditingCountry(false)} style={{ fontSize: 12, color: '#666', cursor: 'pointer', display: 'inline-block', marginTop: 8 }}>Cancel</span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{country && !showAllProviders ? 'Recommended for you' : 'Payout providers'}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {country && !editingCountry && (
              <span onClick={() => setEditingCountry(true)} style={{ fontSize: 12, color: '#0a8fe8', cursor: 'pointer' }}>
                {COUNTRIES.find(c => c.code === country)?.label || country} · Change
              </span>
            )}
            {country && suggested.length > 0 && others.length > 0 && (
              <span onClick={() => setShowAllProviders(s => !s)} style={{ fontSize: 12, color: '#0a8fe8', cursor: 'pointer' }}>{showAllProviders ? 'Show recommended only' : 'Show all methods'}</span>
            )}
          </div>
        </div>
        {connectMsg && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{connectMsg}</div>}
        {providersToShow.map((p: any) => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{PROVIDER_LOGOS[p.id] || p.icon}</span>
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
