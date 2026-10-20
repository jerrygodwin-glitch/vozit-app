// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createAdminClient } from '@/lib/supabase-server'
import { moderateContent, logModerationResult } from '@/lib/hive-moderation'
import { applyStrike } from '@/lib/strikes'
import { createCaptureManifest, addModerationAssertion, addPublishAssertion, signManifest, storeProvenance } from '@/lib/c2pa-provenance'
import { generate5Ws, storeAnalysis } from '@/lib/ai-5w-analysis'
import { assessGeoRisk } from '@/lib/security'
import { processVideoWatermark } from '@/lib/watermark'
import { autoDistributeToVozItChannels, logVozItDistribution } from '@/lib/auto-distribute'
import { captureError, captureMessage } from '@/lib/monitoring'

export async function POST(req: NextRequest) {
  try {
    // Signature verification needs the EXACT bytes Mux signed — reading
    // the raw text first, then parsing it, instead of req.json() followed
    // by JSON.stringify(parsed) to reconstruct a "raw" body. The
    // reconstructed version isn't guaranteed byte-identical to what Mux
    // actually sent (key order, number formatting, spacing can all
    // differ on round-trip), so verification could silently fail for any
    // payload complex enough to diverge — exactly the kind of thing a
    // deeply-nested event like static_rendition.ready (files array,
    // mixed string/number fields) is more likely to hit than a simple one.
    const rawBody = await req.text()
    const body = JSON.parse(rawBody)
    const { type, data } = body

    // Verify Mux webhook signature
    if (process.env.MUX_WEBHOOK_SECRET) {
      const { verifyMuxSignature } = await import('@/lib/security')
      const sig = req.headers.get('mux-signature')
      if (!(await verifyMuxSignature(rawBody, sig, process.env.MUX_WEBHOOK_SECRET))) {
        captureMessage('Mux webhook signature verification failed', { type })
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Real root cause of videos stuck forever on "Video processing...":
    // this is a server-to-server callback from Mux, never a logged-in
    // user, so createServerClient() always ran as an unauthenticated
    // client here — auth.uid() is null. The "Update own report" RLS
    // policy (USING auth.uid() = user_id) silently matched zero rows on
    // every write this handler made: no thrown error, just nothing saved
    // (confirmed via direct DB check — mux_asset_id/playback_id stayed
    // null even though the handler ran its full pipeline without error
    // and Mux's own asset had already finished processing). Needs the
    // service-role client to actually bypass RLS like every other piece
    // of this file already assumed it did.
    const supabase = createAdminClient()

    // Temporary visibility while chasing why static_rendition.ready
    // never seems to arrive — no Vercel log access from this session,
    // so this is the only way to see what Mux is actually sending
    // without needing Jerry to dig through Mux's own dashboard each time.
    captureMessage('Mux webhook event received', { type, objectId: body.object?.id, dataId: data?.id, dataAssetId: data?.asset_id })

    if (type === 'video.asset.ready') {
      const assetId = data.id
      const playbackId = data.playback_ids?.[0]?.id
      const duration = data.duration
      const thumbnailUrl = playbackId
        ? `https://image.mux.com/${playbackId}/thumbnail.png?width=640&height=360`
        : null

      // Find the report linked to this Mux upload
      let { data: report } = await supabase
        .from('reports')
        .select('id, user_id, title, who, what, why, status, location_name, location_lat, location_lng, content_hash, created_at, show_crisis_resources, user:users(country)')
        .eq('mux_asset_id', assetId)
        .single()

      if (!report) {
        // Try matching by upload ID
        const uploadId = data.upload_id
        if (uploadId) {
          const { data: r2 } = await supabase
            .from('reports')
            .select('id, user_id, title, who, what, why, status, location_name, location_lat, location_lng, content_hash, created_at, show_crisis_resources, user:users(country)')
            .eq('mux_upload_id', uploadId)
            .single()
          if (!r2) return NextResponse.json({ ok: true })
          // report was declared const before — Object.assign(report || {}, r2)
          // silently discarded its result instead of actually updating
          // report, leaving it null and crashing a few lines down on
          // report.id. report needs to actually become r2 here.
          report = r2
        } else {
          return NextResponse.json({ ok: true })
        }
      }

      // At this point report is guaranteed non-null
      const rep = report as NonNullable<typeof report>

      // Update report with video details. clean_url for licensing is just
      // the original Mux master — nothing was ever burned into it, so
      // there's no processing to wait on; only the watermarked (public)
      // copy needs the worker, set separately once that finishes below.
      const { error: videoUpdateError } = await supabase.from('reports').update({
        mux_asset_id: assetId,
        playback_id: playbackId,
        thumbnail_url: thumbnailUrl,
        duration_seconds: Math.round(duration),
        clean_url: `https://stream.mux.com/${playbackId}/high.mp4`,
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
        whenHappened: report.when_happened,
        locationName: report.location_name,
        locationLat: report.location_lat,
        locationLng: report.location_lng,
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
          // Fabrication/exploitation categories only — never fires for
          // violence/weapons/gore, see NEWSWORTHY_CATEGORIES. Also skipped
          // for self-harm removals (noStrikeRemoval) — the uploader may be
          // the person at risk, and a strike is the wrong response to that.
          if (!modResult.noStrikeRemoval) {
            await applyStrike(createAdminClient(), {
              userId: report.user_id,
              reportId: report.id,
              reason: `Auto-removed: ${modResult.flags.map(f => f.category).join(', ')}`,
            })
          }
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



      // Watermarking + auto-distribute moved to the video.asset.static_
      // rendition.ready handler below — it needs the plain MP4 file Mux
      // generates from static_renditions, which is a separate, slower
      // process than the streaming (HLS) rendition this event is about.
      // Firing it here 404'd every time: confirmed via the worker's own
      // logs that the file genuinely didn't exist yet at this point,
      // then existed minutes later once that rendition actually finished.

      // 7. Update report with final status + risk level
      await supabase.from('reports').update({
        status: reportStatus,
        geo_risk: geoRisk.riskLevel,
        moderation_flags: modResult.flags.map(f => f.category),
        // OR, not overwrite — the text-moderation pass at creation time may
        // already have set this true, and a clean video scan shouldn't turn
        // it back off.
        show_crisis_resources: report.show_crisis_resources || modResult.showCrisisResources,
        // Gore never removes the report (NEWSWORTHY_CATEGORIES) — the
        // player blurs these specific seconds instead.
        gore_timestamps: modResult.goreTimestamps,
      }).eq('id', report!.id)

      return NextResponse.json({
        ok: true,
        status: reportStatus,
        moderation: modResult.autoAction,
        geoRisk: geoRisk.riskLevel,
        provenance: manifest.manifestId,
      })
    }

    // ═══ THREE-LAYER WATERMARK PROCESSING, THEN AUTO-DISTRIBUTE ═══
    // Fires separately from video.asset.ready, once Mux confirms the
    // plain downloadable MP4 (requested via static_renditions, see
    // src/lib/mux.ts) is actually ready — that file takes longer to
    // generate than the streaming rendition, and the watermark worker
    // needs to download it to run FFmpeg on.
    if (type === 'video.asset.static_rendition.ready') {
      const assetId = data?.asset_id || data?.id || body.object?.id
      if (!assetId) {
        captureMessage('static_rendition.ready had no extractable asset id', { body })
        return NextResponse.json({ ok: true })
      }

      const { data: report } = await supabase
        .from('reports')
        .select('id, user_id, title, what, status, location_name, location_lat, location_lng, playback_id, duration_seconds, user:users(username, tier)')
        .eq('mux_asset_id', assetId)
        .single()

      if (!report) {
        captureMessage('static_rendition.ready: no report matched this asset id', { assetId })
        return NextResponse.json({ ok: true })
      }
      if (report.status !== 'published' || !report.playback_id) {
        return NextResponse.json({ ok: true })
      }

      // Non-blocking, but NOT fire-and-forget — see the note on maxDuration
      // below for why waitUntil matters here (a bare un-awaited .then()
      // has no guarantee of surviving past this function's response).
      waitUntil(processVideoWatermark({
        playbackId: report.playback_id,
        reportId: report.id,
        username: (report.user as any)?.username || 'reporter',
        tier: ((report.user as any)?.tier || 'starter') as any,
        duration: report.duration_seconds || 90,
      }).then(result => {
        if (result.success) {
          return supabase.from('reports').update({
            watermarked_url: result.watermarkedUrl,
            watermark_applied: true,
          }).eq('id', report.id).then(() => result)
        }
        // processVideoWatermark() catches its own errors and returns
        // {success:false} instead of throwing, so without this, a worker
        // rejection left literally no trace anywhere to diagnose from.
        captureMessage('Watermarking failed', { reportId: report.id, error: result.error })
        return result
      }).then(result => {
        // Distribute to VozIt's own channels either way — with the
        // branded copy if watermarking succeeded, falling back to the
        // raw master (still better than never posting) if it failed.
        return autoDistributeToVozItChannels({
          reportId: report.id,
          title: report.title,
          description: report.what || report.title,
          playbackId: report.playback_id,
          watermarkedUrl: result?.success ? result.watermarkedUrl : undefined,
          locationName: report.location_name,
          location: report.location_lat ? { lat: report.location_lat, lng: report.location_lng } : undefined,
          reporterUsername: (report.user as any)?.username || 'reporter',
          reporterTier: (report.user as any)?.tier || 'starter',
        }).then(dist => logVozItDistribution(supabase, report.id, dist.results))
      }).catch(e => captureError(e, { route: 'POST /api/mux-webhook', step: 'watermark/distribute background job', reportId: report.id })))

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/mux-webhook' })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
// The watermark worker call this route kicks off (via waitUntil, above)
// can take up to ~280s. Vercel's Hobby plan caps serverless functions at
// 60s regardless of this setting — watermarking needs at least a Pro
// plan to actually get the full runway it asks for.
export const maxDuration = 300
