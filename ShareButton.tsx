// @ts-nocheck
'use client'
import { useState } from 'react'

interface SP { reportId: string; title: string; location: string; username: string; compact?: boolean }

const PLATFORMS = [
  { id: 'x', label: '𝕏 Post to X', shareUrl: (u: string, t: string) => `https://x.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}` },
  { id: 'facebook', label: '👤 Share on Facebook', shareUrl: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { id: 'tiktok', label: '🎵 Share on TikTok', shareUrl: (u: string, t: string) => `https://www.tiktok.com/share?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { id: 'youtube', label: '📺 Share on YouTube', shareUrl: (u: string) => u }, // Opens report URL
  { id: 'instagram', label: '📸 Share on Instagram', shareUrl: (u: string) => u },
  { id: 'whatsapp', label: '💬 WhatsApp', shareUrl: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(t + ' ' + u)}` },
  { id: 'telegram', label: '✈️ Telegram', shareUrl: (u: string, t: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
]

export function ShareButton({ reportId, title, location, username, compact }: SP) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const [embedCopied, setEmbedCopied] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [distributed, setDistributed] = useState<string[]>([])

  const url = typeof window !== 'undefined' ? window.location.origin + '/report/' + reportId : ''
  const text = `${title} — @${username} on VozIt`
  const embedCode = `<iframe src="${url}?embed=1" width="400" height="320" frameborder="0" allowfullscreen></iframe>`

  function track(platform: string) {
    fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId, platform }),
    })
  }

  // Cross-post via API (requires connected social accounts)
  async function crossPost(platform: string) {
    setDistributing(true)
    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'distribute', report_id: reportId, platforms: [platform] }),
      })
      const data = await res.json()
      if (data.ok && data.distributed > 0) {
        setDistributed(d => [...d, platform])
      }
    } catch { /* silent */ }
    setDistributing(false)
  }

  if (compact) {
    return (
      <button
        onClick={() => {
          if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({ title, text, url })
            track('native')
          } else {
            navigator.clipboard.writeText(url)
            track('copy')
          }
        }}
        className="card"
        style={{ padding: '6px 12px', cursor: 'pointer', color: '#888', fontSize: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}
      >Share</button>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShow(!show)}
        style={{ background: show ? '#FE3D07' : '#fff', border: '1px solid #eee', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: show ? '#fff' : '#333', fontSize: 13, fontWeight: 500, fontFamily: 'inherit' }}
      >Share & distribute</button>

      {show && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, width: 280, borderRadius: 12, background: '#fff', border: '1px solid #eee', zIndex: 50, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Share this report</div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>More shares = more earnings</div>
          </div>

          {/* Share links */}
          <div style={{ padding: '6px 8px' }}>
            {PLATFORMS.map(p => (
              <div
                key={p.id}
                onClick={() => {
                  window.open(p.shareUrl(url, text), '_blank', 'width=600,height=400')
                  track(p.id)
                }}
                style={{ padding: '7px 8px', borderRadius: 6, cursor: 'pointer', color: '#333', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>{p.label}</span>
                {distributed.includes(p.id) && <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 600 }}>✓ Posted</span>}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #f0f0f0', padding: '6px 8px' }}>
            {/* Copy link */}
            <div
              onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); track('copy'); setTimeout(() => setCopied(false), 2000) }}
              style={{ padding: '7px 8px', cursor: 'pointer', color: copied ? '#085041' : '#333', fontSize: 12, fontWeight: copied ? 600 : 400 }}
            >{copied ? '✓ Link copied!' : '🔗 Copy link'}</div>

            {/* Copy embed code */}
            <div
              onClick={async () => { await navigator.clipboard.writeText(embedCode); setEmbedCopied(true); track('embed'); setTimeout(() => setEmbedCopied(false), 2000) }}
              style={{ padding: '7px 8px', cursor: 'pointer', color: embedCopied ? '#085041' : '#333', fontSize: 12, fontWeight: embedCopied ? 600 : 400 }}
            >{embedCopied ? '✓ Embed code copied!' : '</> Copy embed code'}</div>
          </div>

          {/* Cross-post CTA */}
          <div style={{ borderTop: '1px solid #f0f0f0', padding: '10px 14px', background: '#fafafa' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Auto-post to your accounts</div>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>Connect in Profile → earn from every platform</div>
            <button
              onClick={() => crossPost('all')}
              disabled={distributing}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: 'none', background: '#0a8fe8', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: distributing ? 0.5 : 1 }}
            >{distributing ? 'Posting...' : '🚀 Post to all connected'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ShareIconRow({ reportId, title, location, username }: Omit<SP, 'compact'>) {
  const url = typeof window !== 'undefined' ? window.location.origin + '/report/' + reportId : ''
  const text = title + ' — @' + username
  const ib = { width: 30, height: 30, borderRadius: 6, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const, border: '1px solid #eee', cursor: 'pointer' as const, background: '#fff', color: '#555', fontSize: 12, fontFamily: 'inherit' }

  function s(p: string, u?: string) {
    if (u) window.open(u, '_blank')
    fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ report_id: reportId, platform: p }) })
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button style={ib} onClick={() => s('x', `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)}>𝕏</button>
      <button style={ib} onClick={() => s('facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}>f</button>
      <button style={ib} onClick={() => s('youtube')}>▶</button>
      <button style={ib} onClick={() => s('tiktok')}>♪</button>
      <button style={ib} onClick={() => s('whatsapp', `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`)}>💬</button>
      <button style={ib} onClick={async () => { if (navigator.share) { try { await navigator.share({ title, text, url }); s('native') } catch {} } else { await navigator.clipboard.writeText(url); s('copy') } }}>↗</button>
    </div>
  )
}
