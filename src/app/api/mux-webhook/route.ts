// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { moderateContent, logModerationResult } from '@/lib/hive-moderation'
import { createCaptureManifest, addModerationAssertion, addPublishAssertion, signManifest, storeProvenance } from '@/lib/c2pa-provenance'
import { generate5Ws, storeAnalysis } from '@/lib/ai-5w-analysis'
import { assessGeoRisk } from '@/lib/security'
import { processVideoWatermark } from '@/lib/watermark'
import { autoDistributeToVozItChannels, logVozItDistribution } from '@/lib/auto-distribute'
import { captureError, captureMessage } from '@/lib/monitoring'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    // Verify Mux webhook signature
    if (process.env.MUX_WEBHOOK_SECRET) {
      const { verifyMuxSignature } = await import('@/lib/security')
      const rawBody = JSON.stringify(body)
      const sig = req.headers.get('mux-signature')
      if (!(await verifyMuxSignature(rawBody, sig, process.env.MUX_WEBHOOK_SECRET))) {
        captureMessage('Mux webhook signature verification failed', { type })
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const supabase = createServerClient()

    if (type === 'video.asset.ready') {
      const assetId = data.id
      const playbackId = data.playback_ids?.[0]?.id
      const duration = data.duration
      const thumbnailUrl = playbackId
        ? `https://image.mux.com/${playbackId}/thumbnail.png?width=640&height=360`
        : null

      // Find the report linked to this Mux upload
      const { data: report } = await supabase
        .from('reports')
        .select('id, user_id, title, who, what, why, status, location_name, location_lat, location_lng, content_hash, created_at, user:users(country)')
        .eq('mux_asset_id', assetId)
        .single()

      if (!report) {
        // Try matching by upload ID
        const uploadId = data.upload_id
        if (uploadId) {
          const { data: r2 } = await supabase
            .from('reports')
            .select('id, user_id, title, who, what, why, status, location_name, location_lat, location_lng, content_hash, created_at, user:users(country)')
            .eq('mux_upload_id', uploadId)
            .single()
          if (!r2) return NextResponse.json({ ok: true })
          Object.assign(report || {}, r2)
        } else {
          return NextResponse.json({ ok: true })
        }
      }

      // At this point report is guaranteed non-null
      const rep = report as NonNullable<typeof report>

      // Update report with video details
      const { error: videoUpdateError } = await supabase.from('reports').update({
        mux_asset_id: assetId,
        playback_id: playbackId,
        thumbnail_url: thumbnailUrl,
        duration_seconds: Math.round(duration),
      }).eq('id', report!.id)
      if (videoUpdateError) captureError(videoUpdateError, { route: 'POST /api/mux-webhook', step: 'save video details', reportId: report!.id })

      // ═══ PHASE 3: MODERATION + C2PA PIPELINE ═══════════════════

      // 1. C2PA — Create capture provenance manifest
      let manifest = createCaptureManifest({
        contentHash: report.content_hash || '',
        capturedAt: report.created_at,
        gps: report.location_lat ? {
          lat: report.location_lat,
          lng: report.location_lng,
        } : undefined,
        duration,
      })


      // ═══ AI 5W ANALYSIS (auto-enhance if reporter used quick mode) ═══
      if (report.ai_enhanced !== false || !report.who || !report.what) {
        try {
          const analysis = await generate5Ws({
            title: report.title,
            reporterWho: report.who,
            reporterWhat: report.what,
            reporterWhere: report.where_text || report.location_name,
            reporterWhy: report.why,
            playbackId: playbackId,
            duration,
            capturedAt: report.created_at,
            gps: report.location_lat ? { lat: report.location_lat, lng: report.location_lng } : undefined,
          })

          await storeAnalysis(supabase, report.id, analysis)

          // Fill in missing 5Ws from AI suggestions
          const updates: Record<string, any> = {}
          if (!report.who && analysis.suggested.who && analysis.confidence.who > 0.5) updates.who = analysis.suggested.who
          if (!report.what && analysis.suggested.what && analysis.confidence.what > 0.5) updates.what = analysis.suggested.what
          if (!report.where_text && analysis.suggested.where_text) updates.where_text = analysis.suggested.where_text
          if (!report.why && analysis.suggested.why && analysis.confidence.why > 0.5) updates.why = analysis.suggested.why
          if (analysis.tags?.length > 0) updates.ai_tags = analysis.tags
          updates.ai_enhanced = true

          if (Object.keys(updates).length > 0) {
            await supabase.from('reports').update(updates).eq('id', report.id)
          }
        } catch {} // Non-blocking — don't fail the webhook
      }

      // 2. Hive Moderation — scan video + text
      const videoUrl = playbackId
        ? `https://stream.mux.com/${playbackId}/high.mp4`
        : undefined

      const modResult = await moderateContent({
        videoUrl,
        title: report.title,
        who: report.who,
        what: report.what,
        why: report.why,
      })

      // Log moderation result
      await logModerationResult(supabase, report.id, modResult)

      // 3. C2PA — Add moderation assertion to provenance
      manifest = addModerationAssertion(manifest, {
        passed: modResult.passed,
        severity: modResult.severity,
        scanId: modResult.scanId,
        scannedAt: modResult.scannedAt,
      })

      // 4. Apply auto-action from video moderation. The report's text (title/who/what/why)
      // was already moderated when it was created (see /api/reports) — combine the two
      // results by taking whichever is more severe, so a clean video scan can't un-flag
      // or republish a report the text moderation already removed/flagged.
      const STATUS_SEVERITY = { published: 0, flagged: 1, removed: 2 } as const
      let videoStatus: 'published' | 'flagged' | 'removed' = 'published'
      switch (modResult.autoAction) {
        case 'auto_ban':
          videoStatus = 'removed'
          // Ban the user
          await supabase.from('users').update({
            is_banned: true,
            ban_reason: `Auto-banned: ${modResult.flags.map(f => f.category).join(', ')}`,
          }).eq('id', report.user_id)
          break
        case 'auto_remove':
          videoStatus = 'removed'
          break
        case 'flag_review':
          videoStatus = 'flagged'
          break
        case 'publish':
          videoStatus = 'published'
          break
      }
      const existingStatus = (report.status as keyof typeof STATUS_SEVERITY) || 'published'
      const reportStatus = STATUS_SEVERITY[videoStatus] >= STATUS_SEVERITY[existingStatus] ? videoStatus : existingStatus

      // 5. Geo-risk tagging
      const country = (report.user as any)?.country || ''
      const geoRisk = assessGeoRisk(country, report.location_name)

      // 6. C2PA — Add publish assertion + sign
      if (reportStatus === 'published') {
        manifest = addPublishAssertion(manifest, new Date().toISOString())
      }
      const { signature } = await signManifest(manifest)
      await storeProvenance(supabase, report.id, manifest, signature)



      // ═══ AUTO-DISTRIBUTE TO VozIt's SOCIAL CHANNELS ═══════════
      if (reportStatus === 'published' && playbackId) {
        // Non-blocking: distribute to VozIt's YouTube, TikTok, IG, FB, X
        autoDistributeToVozItChannels({
          reportId: report.id,
          title: report.title,
          description: report.what || report.title,
          playbackId,
          locationName: report.location_name,
          location: report.location_lat ? { lat: report.location_lat, lng: report.location_lng } : undefined,
          reporterUsername: (report.user as any)?.username || 'reporter',
          reporterTier: (report.user as any)?.tier || 'starter',
        }).then(dist => {
          logVozItDistribution(supabase, report.id, dist.results)
        }) // Non-blocking — don't fail the webhook
      }


      // ═══ THREE-LAYER WATERMARK PROCESSING ═════════════════════
      if (reportStatus === 'published' && playbackId) {
        // Non-blocking: process watermark in background
        processVideoWatermark({
          playbackId,
          reportId: report.id,
          username: (report.user as any)?.username || 'reporter',
          tier: ((report.user as any)?.tier || 'starter') as any,
          duration: Math.round(duration),
        }).then(result => {
          if (result.success) {
            supabase.from('reports').update({
              watermarked_url: result.watermarkedUrl,
              clean_url: result.cleanUrl,
              watermark_applied: true,
            }).eq('id', report!.id)
          }
        }) // Non-blocking
      }

      // 7. Update report with final status + risk level
      await supabase.from('reports').update({
        status: reportStatus,
        geo_risk: geoRisk.riskLevel,
        moderation_flags: modResult.flags.map(f => f.category),
      }).eq('id', report!.id)

      return NextResponse.json({
        ok: true,
        status: reportStatus,
        moderation: modResult.autoAction,
        geoRisk: geoRisk.riskLevel,
        provenance: manifest.manifestId,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/mux-webhook' })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
