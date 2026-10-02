// @ts-nocheck
'use client'
import { useState } from 'react'

interface SP { reportId: string; title: string; location: string; username: string; compact?: boolean }

// Real brand marks instead of emoji/letter stand-ins. Each is a plain
// currentColor path so it can be recolored per-platform via the wrapper.
const ICON_PATHS: Record<string, string> = {
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  tiktok: 'M16.6 5.82c-.97-.94-1.5-2.23-1.5-3.57h-3.12v13.3c0 1.6-1.3 2.9-2.9 2.9a2.9 2.9 0 0 1 0-5.8c.3 0 .59.04.86.13V9.63a6.03 6.03 0 0 0-.86-.06 6.02 6.02 0 1 0 6.02 6.02V9.4a7.2 7.2 0 0 0 4.2 1.35V7.63a4.84 4.84 0 0 1-2.7-1.81z',
  youtube: 'M23.498 6.186a2.97 2.97 0 0 0-2.088-2.103C19.692 3.5 12 3.5 12 3.5s-7.692 0-9.41.583A2.97 2.97 0 0 0 .502 6.186C0 7.91 0 12 0 12s0 4.09.502 5.814a2.97 2.97 0 0 0 2.088 2.103C4.308 20.5 12 20.5 12 20.5s7.692 0 9.41-.583a2.97 2.97 0 0 0 2.088-2.103C24 16.09 24 12 24 12s0-4.09-.502-5.814zM9.75 15.5v-7l6.25 3.5z',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  whatsapp: 'M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.48 1.32 5l-1.4 5.11 5.23-1.37c1.47.8 3.12 1.22 4.76 1.22 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.17c-.24.68-1.19 1.25-1.95 1.41-.53.11-1.21.2-3.52-.76-2.95-1.22-4.85-4.18-5-4.38-.14-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.17 1.03-2.46.27-.3.6-.37.8-.37.2 0 .4 0 .58.01.19.01.44-.07.68.53.25.6.85 2.07.92 2.22.07.15.12.33.02.53-.1.2-.15.33-.3.5-.15.18-.31.4-.45.54-.15.15-.3.31-.13.6.17.3.76 1.26 1.64 2.04 1.13 1 2.08 1.32 2.38 1.47.3.15.47.13.65-.08.18-.2.76-.88.96-1.18.2-.3.4-.25.68-.15.27.1 1.75.83 2.05.98.3.15.5.22.57.35.08.13.08.74-.16 1.42z',
  telegram: 'M11.944 0a12 12 0 1 0 .112 24A12 12 0 0 0 11.944 0zm4.962 7.224c.265.012.552.095.73.345.11.155.14.355.153.546-.004.165-.015.33-.034.493-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
}
const BRAND_COLOR: Record<string, string> = { x: '#000', facebook: '#1877F2', tiktok: '#000', youtube: '#FF0000', instagram: '#E1306C', whatsapp: '#25D366', telegram: '#26A5E4' }

function PlatformIcon({ id, size = 16 }: { id: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={BRAND_COLOR[id] || '#555'}>
      <path d={ICON_PATHS[id]} />
    </svg>
  )
}

const PLATFORMS = [
  { id: 'x', label: 'Post to X', shareUrl: (u: string, t: string) => `https://x.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}` },
  { id: 'facebook', label: 'Share on Facebook', shareUrl: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { id: 'whatsapp', label: 'WhatsApp', shareUrl: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(t + ' ' + u)}` },
  { id: 'telegram', label: 'Telegram', shareUrl: (u: string, t: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  // TikTok, YouTube and Instagram have no public web link that opens a
  // composer pre-filled with someone else's URL the way X/Facebook/
  // WhatsApp/Telegram do — the old code just reopened our own report
  // page, which did nothing useful. Copy the link and send the reporter
  // into the app to paste it themselves (bio, description, story).
  { id: 'tiktok', label: 'Share on TikTok', linkOnly: true, appUrl: 'https://www.tiktok.com/upload' },
  { id: 'youtube', label: 'Share on YouTube', linkOnly: true, appUrl: 'https://www.youtube.com' },
  { id: 'instagram', label: 'Share on Instagram', linkOnly: true, appUrl: 'https://www.instagram.com' },
]

export function ShareButton({ reportId, title, location, username, compact }: SP) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const [embedCopied, setEmbedCopied] = useState(false)
  const [linkCopiedFor, setLinkCopiedFor] = useState<string | null>(null)
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
                onClick={async () => {
                  if (p.linkOnly) {
                    await navigator.clipboard.writeText(url)
                    window.open(p.appUrl, '_blank')
                    track(p.id)
                    setLinkCopiedFor(p.id)
                    setTimeout(() => setLinkCopiedFor(null), 3000)
                  } else {
                    window.open(p.shareUrl(url, text), '_blank', 'width=600,height=400')
                    track(p.id)
                  }
                }}
                style={{ padding: '7px 8px', borderRadius: 6, cursor: 'pointer', color: '#333', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PlatformIcon id={p.id} />{p.label}</span>
                {linkCopiedFor === p.id ? <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 600 }}>✓ Link copied</span> : distributed.includes(p.id) && <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 600 }}>✓ Posted</span>}
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
  const ib = { width: 30, height: 30, borderRadius: 6, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const, border: '1px solid #eee', cursor: 'pointer' as const, background: '#fff' }

  function s(p: string, u?: string) {
    if (u) window.open(u, '_blank')
    fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ report_id: reportId, platform: p }) })
  }

  async function shareLinkOnly(p: string, appUrl: string) {
    await navigator.clipboard.writeText(url)
    window.open(appUrl, '_blank')
    s(p)
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button style={ib} onClick={() => s('x', `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)}><PlatformIcon id="x" /></button>
      <button style={ib} onClick={() => s('facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}><PlatformIcon id="facebook" /></button>
      <button style={ib} onClick={() => shareLinkOnly('youtube', 'https://www.youtube.com')}><PlatformIcon id="youtube" /></button>
      <button style={ib} onClick={() => shareLinkOnly('tiktok', 'https://www.tiktok.com/upload')}><PlatformIcon id="tiktok" /></button>
      <button style={ib} onClick={() => s('whatsapp', `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`)}><PlatformIcon id="whatsapp" /></button>
      <button style={ib} onClick={async () => { if (navigator.share) { try { await navigator.share({ title, text, url }); s('native') } catch {} } else { await navigator.clipboard.writeText(url); s('copy') } }}>↗</button>
    </div>
  )
}
