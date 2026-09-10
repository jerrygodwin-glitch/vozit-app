// @ts-nocheck
// ══════════════════════════════════════════════════════════════
// AI-Powered 5W Analysis Engine
// ══════════════════════════════════════════════════════════════
//
// Analyzes video transcript + GPS + metadata + reporter input
// to auto-generate or enhance the 5Ws (Who, What, Where, When, Why)
//
// Pipeline:
//   1. Get video transcript (Mux auto-captions or Whisper)
//   2. Extract GPS coordinates → reverse geocode to location name
//   3. Analyze video frames for visual context (via Hive or Claude)
//   4. Combine all signals + reporter input → generate 5Ws via Claude API
//   5. Return structured suggestions for reporter review
// ══════════════════════════════════════════════════════════════

export interface FiveWs {
  who: string
  what: string
  where_text: string
  when_happened: string
  why: string
}

export interface AnalysisInput {
  // What the reporter provided (may be partial or empty)
  title: string
  reporterWho?: string
  reporterWhat?: string
  reporterWhere?: string
  reporterWhen?: string
  reporterWhy?: string
  reporterNotes?: string     // Free-form voice note transcript or quick notes

  // Video metadata
  playbackId?: string
  duration?: number
  capturedAt: string          // ISO timestamp from device

  // GPS from device
  gps?: { lat: number; lng: number; alt?: number }

  // Transcript (from Mux captions or Whisper)
  transcript?: string

  // Visual description (from Hive or frame analysis)
  visualContext?: string
}

export interface AnalysisResult {
  suggested: FiveWs            // AI-generated suggestions
  confidence: Record<keyof FiveWs, number>  // 0-1 confidence per field
  sources: Record<keyof FiveWs, string>     // Where each suggestion came from
  summary: string              // One-line summary for the feed
  tags: string[]               // Auto-generated topic tags
}

// ── GET TRANSCRIPT FROM MUX ──────────────────────────────────
export async function getVideoTranscript(playbackId: string): Promise<string> {
  if (!playbackId) return ''

  try {
    // Mux auto-generated captions (if enabled)
    const muxToken = process.env.MUX_TOKEN_ID
    const muxSecret = process.env.MUX_TOKEN_SECRET
    if (!muxToken || !muxSecret) return ''

    const auth = Buffer.from(`${muxToken}:${muxSecret}`).toString('base64')

    // Get asset ID from playback ID
    const assetRes = await fetch(`https://api.mux.com/video/v1/playback-ids/${playbackId}`, {
      headers: { 'Authorization': `Basic ${auth}` },
    })
    const assetData = await assetRes.json()
    const assetId = assetData.data?.object?.id
    if (!assetId) return ''

    // Get tracks (captions)
    const tracksRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}/tracks`, {
      headers: { 'Authorization': `Basic ${auth}` },
    })
    const tracksData = await tracksRes.json()
    const captionTrack = tracksData.data?.find((t: any) => t.type === 'text' && t.status === 'ready')

    if (captionTrack) {
      // Download the VTT/SRT file
      const captionUrl = `https://stream.mux.com/${playbackId}/text/${captionTrack.id}.vtt`
      const captionRes = await fetch(captionUrl)
      const vtt = await captionRes.text()
      // Strip VTT formatting, keep just the text
      return vtt
        .replace(/WEBVTT\n\n/g, '')
        .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\n/g, '')
        .replace(/\n{2,}/g, ' ')
        .trim()
    }

    return ''
  } catch { return '' }
}

// ── REVERSE GEOCODE GPS ──────────────────────────────────────
export async function reverseGeocode(lat: number, lng: number): Promise<{
  locationName: string
  city: string
  country: string
  countryCode: string
}> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'VozIt/1.0 (citizen-journalism)' } }
    )
    const data = await res.json()
    const addr = data.address || {}
    const city = addr.city || addr.town || addr.village || addr.municipality || ''
    const state = addr.state || ''
    const country = addr.country || ''
    const countryCode = addr.country_code?.toUpperCase() || ''
    const locationName = [city, state, country].filter(Boolean).join(', ')

    return { locationName, city, country, countryCode }
  } catch {
    return { locationName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, city: '', country: '', countryCode: '' }
  }
}

// ── GENERATE 5Ws VIA CLAUDE API ──────────────────────────────
export async function generate5Ws(input: AnalysisInput): Promise<AnalysisResult> {
  // Gather all available context
  let location = ''
  let countryCode = ''
  if (input.gps) {
    const geo = await reverseGeocode(input.gps.lat, input.gps.lng)
    location = geo.locationName
    countryCode = geo.countryCode
  }

  const transcript = input.transcript || (input.playbackId ? await getVideoTranscript(input.playbackId) : '')

  // Build the prompt with all available signals
  const contextParts = [
    `Title provided by reporter: "${input.title}"`,
    input.reporterNotes ? `Reporter's notes: "${input.reporterNotes}"` : '',
    input.reporterWho ? `Reporter said WHO: "${input.reporterWho}"` : '',
    input.reporterWhat ? `Reporter said WHAT: "${input.reporterWhat}"` : '',
    input.reporterWhere ? `Reporter said WHERE: "${input.reporterWhere}"` : '',
    input.reporterWhen ? `Reporter said WHEN: "${input.reporterWhen}"` : '',
    input.reporterWhy ? `Reporter said WHY: "${input.reporterWhy}"` : '',
    location ? `GPS reverse-geocoded to: ${location}` : '',
    input.gps ? `GPS coordinates: ${input.gps.lat}, ${input.gps.lng}` : '',
    `Video recorded at: ${new Date(input.capturedAt).toLocaleString()}`,
    input.duration ? `Video duration: ${input.duration} seconds` : '',
    transcript ? `Audio transcript from video: "${transcript.slice(0, 2000)}"` : '',
    input.visualContext ? `Visual analysis: "${input.visualContext}"` : '',
  ].filter(Boolean).join('\n')

  // Call Claude API to generate 5Ws
  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback: use available data without AI
    return buildFallback5Ws(input, location, transcript)
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are an AI assistant for VozIt, a citizen journalism platform. 
Analyze the provided context about a video report and generate the 5Ws (Who, What, Where, When, Why).
Be factual and concise. Only state what the evidence supports — do not speculate or fabricate.
If evidence is insufficient for a field, say so briefly rather than guessing.

Respond ONLY with valid JSON in this exact format, no other text:
{
  "who": "...",
  "what": "...",
  "where_text": "...",
  "when_happened": "...",
  "why": "...",
  "summary": "One-line summary for social media feed",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": {"who": 0.0-1.0, "what": 0.0-1.0, "where_text": 0.0-1.0, "when_happened": 0.0-1.0, "why": 0.0-1.0}
}`,
        messages: [{ role: 'user', content: `Analyze this citizen journalist report and generate the 5Ws:\n\n${contextParts}` }],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) return buildFallback5Ws(input, location, transcript)

    const data = await res.json()
    const text = data.content?.[0]?.text || ''

    // Parse JSON response
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      suggested: {
        who: parsed.who || input.reporterWho || '',
        what: parsed.what || input.reporterWhat || input.title,
        where_text: parsed.where_text || input.reporterWhere || location,
        when_happened: parsed.when_happened || input.reporterWhen || input.capturedAt,
        why: parsed.why || input.reporterWhy || '',
      },
      confidence: parsed.confidence || { who: 0.5, what: 0.7, where_text: 0.8, when_happened: 0.9, why: 0.3 },
      sources: {
        who: input.reporterWho ? 'reporter' : transcript ? 'transcript' : 'ai_inference',
        what: input.reporterWhat ? 'reporter' : 'ai_analysis',
        where_text: input.reporterWhere ? 'reporter' : input.gps ? 'gps' : 'ai_inference',
        when_happened: input.reporterWhen ? 'reporter' : 'device_timestamp',
        why: input.reporterWhy ? 'reporter' : transcript ? 'transcript' : 'ai_inference',
      },
      summary: parsed.summary || input.title,
      tags: parsed.tags || [],
    }
  } catch {
    return buildFallback5Ws(input, location, transcript)
  }
}

// ── FALLBACK (no AI key) ─────────────────────────────────────
function buildFallback5Ws(input: AnalysisInput, location: string, transcript: string): AnalysisResult {
  return {
    suggested: {
      who: input.reporterWho || '',
      what: input.reporterWhat || input.title,
      where_text: input.reporterWhere || location || '',
      when_happened: input.reporterWhen || new Date(input.capturedAt).toLocaleString(),
      why: input.reporterWhy || '',
    },
    confidence: {
      who: input.reporterWho ? 0.9 : 0.1,
      what: input.reporterWhat ? 0.9 : 0.5,
      where_text: location ? 0.85 : input.reporterWhere ? 0.9 : 0.1,
      when_happened: 0.95,
      why: input.reporterWhy ? 0.9 : 0.1,
    },
    sources: {
      who: input.reporterWho ? 'reporter' : 'none',
      what: input.reporterWhat ? 'reporter' : 'title',
      where_text: input.gps ? 'gps' : input.reporterWhere ? 'reporter' : 'none',
      when_happened: 'device_timestamp',
      why: input.reporterWhy ? 'reporter' : 'none',
    },
    summary: input.title,
    tags: [],
  }
}

// ── STORE AI ANALYSIS ────────────────────────────────────────
export async function storeAnalysis(supabase: any, reportId: string, result: AnalysisResult) {
  await supabase.from('ai_analyses').insert({
    report_id: reportId,
    suggested_5w: result.suggested,
    confidence: result.confidence,
    sources: result.sources,
    summary: result.summary,
    tags: result.tags,
    created_at: new Date().toISOString(),
  })
}
