// @ts-nocheck
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function EmbedPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const headersList = headers()
  const referer = headersList.get('referer') || ''
  const refererDomain = referer ? new URL(referer).hostname : 'direct'

  // Fetch report
  const { data: report } = await supabase
    .from('reports')
    .select('id, title, playback_id, thumbnail_url, location_name, created_at, duration, user:users(username, display_name, tier)')
    .eq('id', params.id)
    .eq('status', 'published')
    .single()

  if (!report) {
    return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui', color: '#999' }}>Report not found</div>
  }

  // Track embed view (non-blocking)
  supabase.from('embed_views').upsert({
    report_id: report.id,
    referrer_domain: refererDomain,
    referrer_url: referer || null,
    view_count: 1,
    last_seen: new Date().toISOString(),
  }, {
    onConflict: 'report_id,referrer_domain',
  }).then(() => {
    // Increment view count for existing entries
    supabase.rpc('increment_embed_views', {
      rid: report.id, domain: refererDomain,
    })
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vozit.app'
  const reportUrl = `${appUrl}/report/${report.id}`
  const videoUrl = report.playback_id
    ? `https://stream.mux.com/${report.playback_id}.m3u8`
    : null

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, system-ui, sans-serif; background: #000; overflow: hidden; }
          .embed { width: 100%; height: 100vh; display: flex; flex-direction: column; }
          .video-wrap { flex: 1; position: relative; background: #000; display: flex; align-items: center; justify-content: center; }
          .video-wrap video { width: 100%; height: 100%; object-fit: contain; }
          .poster { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; cursor: pointer; }
          .play-btn { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 64px; height: 64px; border-radius: 32px; background: rgba(254,61,7,0.9); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 2; }
          .play-btn::after { content: ''; width: 0; height: 0; border-left: 22px solid #fff; border-top: 14px solid transparent; border-bottom: 14px solid transparent; margin-left: 4px; }
          .watermark { position: absolute; bottom: 0; left: 0; right: 0; height: 36px; background: linear-gradient(transparent, rgba(0,0,0,0.55)); display: flex; align-items: flex-end; padding: 0 12px 8px; pointer-events: none; z-index: 5; }
          .watermark span { color: rgba(255,255,255,0.85); font-size: 11px; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.9); letter-spacing: 0.3px; }
          .bar { background: #111; padding: 8px 12px; display: flex; align-items: center; gap: 8px; border-top: 1px solid #222; }
          .logo { height: 24px; width: 24px; border-radius: 4px; }
          .info { flex: 1; min-width: 0; }
          .title { font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .meta { font-size: 10px; color: #888; margin-top: 1px; }
          .cta { background: #FE3D07; color: #fff; border: none; border-radius: 4px; padding: 4px 10px; font-size: 10px; font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap; }
          .badge { font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: 600; margin-left: 4px; }
        `}</style>
      </head>
      <body>
        <div className="embed">
          <div className="video-wrap">
            {report.thumbnail_url && (
              <img src={report.thumbnail_url} className="poster" alt={report.title} id="poster" />
            )}
            {videoUrl && (
              <video
                id="player"
                controls
                playsInline
                preload="none"
                poster={report.thumbnail_url || undefined}
                style={{ display: 'none' }}
              >
                <source src={videoUrl} type="application/x-mpegURL" />
              </video>
            )}
            <button className="play-btn" id="playBtn" />
            <div className="watermark">
              <span>VozIt! · @{(report.user as any)?.username} · <em>I was there...</em></span>
            </div>
          </div>
          <div className="bar">
            <a href={appUrl} target="_blank" rel="noopener">
              <img src={`${appUrl}/icon-192.png`} className="logo" alt="VozIt" />
            </a>
            <div className="info">
              <div className="title">{report.title}</div>
              <div className="meta">
                {report.location_name} · @{(report.user as any)?.username}
                <span
                  className="badge"
                  style={{
                    background: (report.user as any)?.tier === 'platinum' ? '#F5F0FF' :
                      (report.user as any)?.tier === 'gold' ? '#FFF8E6' :
                      (report.user as any)?.tier === 'silver' ? '#F0F4F8' : '#ECFDF5',
                    color: (report.user as any)?.tier === 'platinum' ? '#8B5CF6' :
                      (report.user as any)?.tier === 'gold' ? '#EAB308' :
                      (report.user as any)?.tier === 'silver' ? '#94A3B8' : '#22C55E',
                  }}
                >
                  ★ {((report.user as any)?.tier || 'starter').charAt(0).toUpperCase() + ((report.user as any)?.tier || 'starter').slice(1)}
                </span>
              </div>
            </div>
            <a href={reportUrl} target="_blank" rel="noopener" className="cta">
              Watch on VozIt
            </a>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          document.getElementById('playBtn').onclick = function() {
            var v = document.getElementById('player');
            var p = document.getElementById('poster');
            if (v) { v.style.display = 'block'; v.play(); this.style.display = 'none'; if(p) p.style.display = 'none'; }
          };
        `}} />
      </body>
    </html>
  )
}
