'use client'
import { Top } from '@/lib/ui'
const G = 'https://www.google.com/s2/favicons?domain=DOMAIN&sz=128'
export default function Social() {
  return (
    <div className="page"><Top />
      <div className="container">
        <a href="/settings" style={{ fontSize: 13, color: '#0a8fe8', marginBottom: 16, display: 'block' }}>← Settings</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Social accounts</h1>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>Cross-post and earn from every platform.</p>
        {[{ n: 'YouTube', d: 'Upload as YouTube videos. AdSense monetization.', domain: 'youtube.com' }, { n: 'TikTok', d: 'Post as TikToks. Creator Fund eligible.', domain: 'tiktok.com' }, { n: 'Instagram', d: 'Post as Instagram Reels.', domain: 'instagram.com' }, { n: 'Facebook', d: 'Post to your Facebook Page.', domain: 'facebook.com' }, { n: 'X (Twitter)', d: 'Tweet reports. Revenue sharing eligible.', domain: 'x.com' }].map(p => (
          <div key={p.n} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src={G.replace('DOMAIN', p.domain)} alt={p.n} style={{ width: 40, height: 40, borderRadius: 10 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{p.n}</div>
              <div style={{ fontSize: 13, color: '#666' }}>{p.d}</div>
            </div>
            <button className="btn btn-connect">Connect</button>
          </div>
        ))}
      </div>
    </div>
  )
}
