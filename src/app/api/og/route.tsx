// @ts-nocheck
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export const runtime = 'edge'

// GET /api/og?id=report_id — generates an Open Graph preview image
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reportId = searchParams.get('id')

  if (!reportId) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: 1200, height: 630, background: '#1E5B8A', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#E8541A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 28, fontWeight: 900 }}>V</div>
            <span style={{ fontSize: 52, fontWeight: 900, color: 'white' }}>Voz<span style={{ color: '#E8541A' }}>It</span></span>
          </div>
          <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', letterSpacing: 4 }}>I WAS THERE</span>
        </div>
      </div>,
      { width: 1200, height: 630 }
    )
  }

  const admin = createAdminClient()
  const { data: report } = await admin
    .from('reports')
    .select('*, user:users(username, display_name, tier, credibility_score)')
    .eq('id', reportId)
    .single()

  if (!report) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: 1200, height: 630, background: '#1E5B8A', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 28, fontFamily: 'sans-serif' }}>Report not found</div>,
      { width: 1200, height: 630 }
    )
  }

  const credColor = report.credibility_pct >= 90 ? '#4CD4A0' : report.credibility_pct >= 75 ? '#F0B040' : '#F07060'

  return new ImageResponse(
    <div style={{
      display: 'flex', flexDirection: 'column', width: 1200, height: 630,
      background: '#1E5B8A', fontFamily: 'sans-serif', padding: 0,
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 40px', background: '#236BA0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#E8541A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 900 }}>V</div>
          <span style={{ fontSize: 28, fontWeight: 900, color: 'white' }}>Voz<span style={{ color: '#E8541A' }}>It</span></span>
        </div>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: 3 }}>I WAS THERE</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 48px', gap: 20 }}>
        {/* Title */}
        <div style={{ fontSize: 36, fontWeight: 700, color: 'white', lineHeight: 1.3, maxWidth: 900 }}>
          {report.title}
        </div>

        {/* 5 Ws pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'WHO', value: report.who, bg: 'rgba(232,84,26,0.15)', color: '#F5A97B' },
            { label: 'WHAT', value: report.what, bg: 'rgba(55,138,221,0.15)', color: '#85B7EB' },
            { label: 'WHERE', value: report.location_name, bg: 'rgba(76,212,160,0.12)', color: '#6EDDB0' },
          ].map(w => (
            <div key={w.label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: w.bg, borderRadius: 6, padding: '6px 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: w.color }}>{w.label}</span>
              <span style={{ fontSize: 14, color: w.color }}>{(w.value ?? '').slice(0, 30)}</span>
            </div>
          ))}
        </div>

        {/* Reporter info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: '#E8541A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 700 }}>
            {(report.user?.display_name ?? '?').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>@{report.user?.username}</span>
            <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{report.user?.tier}</span>
              <span style={{ color: credColor }}>{Math.round(report.credibility_pct)}% credibility</span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>▲ {report.upvotes}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 48px', background: '#1A5580' }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{report.location_name}</span>
        <span style={{ fontSize: 14, color: '#E8541A', fontWeight: 600 }}>vozit.com/report/{reportId.slice(0, 8)}...</span>
      </div>
    </div>,
    { width: 1200, height: 630 }
  )
}
