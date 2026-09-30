// @ts-nocheck
// Hive AI Moderation Integration
// Scans video frames + audio for: NSFW, violence, minors, hate speech
// https://docs.thehive.ai/docs/visual-content-moderation

export type ModerationCategory =
  | 'sexual' | 'nudity' | 'suggestive'
  | 'violence' | 'gore' | 'weapons'
  | 'minor' | 'minor_suggestive'
  | 'hate_symbol' | 'hate_speech'
  | 'drugs' | 'self_harm'
  | 'spam' | 'misleading'
  | 'ai_generated' | 'ai_generated_audio'
  | 'metadata_mismatch' | 'duplicate_content'

export type ModerationSeverity = 'safe' | 'low' | 'medium' | 'high' | 'critical'

export interface ModerationResult {
  passed: boolean
  severity: ModerationSeverity
  flags: ModerationFlag[]
  autoAction: 'publish' | 'flag_review' | 'auto_remove' | 'auto_ban'
  scanId: string
  scannedAt: string
  processingMs: number
  // Show a localized crisis-resource panel to viewers — independent of
  // autoAction, since this can be true even when the content just publishes.
  showCrisisResources: boolean
  // True when auto_remove was triggered by a NO_STRIKE_CATEGORIES match —
  // tells the caller to skip applyStrike() for this removal.
  noStrikeRemoval: boolean
}

export interface ModerationFlag {
  category: ModerationCategory
  confidence: number   // 0-1
  severity: ModerationSeverity
  timestamp?: number   // seconds into video where detected
  description: string
}

// Thresholds for auto-actions
const THRESHOLDS = {
  // Auto-remove (no human review needed)
  auto_remove: {
    sexual: 0.90,
    nudity: 0.92,
    minor: 0.70,           // Lower threshold for child safety
    minor_suggestive: 0.60, // Very low — err on side of caution
    ai_generated: 0.85,    // High-confidence AI-generated/deepfake — VozIt only accepts real recorded footage
    // High-confidence self-harm depiction only — see NO_STRIKE_CATEGORIES
    // below. Moderate-confidence hits (someone discussing their own
    // experience, news coverage) are handled separately, via
    // SELF_HARM_PANEL_THRESHOLD, and are meant to publish normally with a
    // crisis-resource panel rather than being removed at all.
    self_harm: 0.85,
  },
  // Flag for human review
  flag_review: {
    sexual: 0.60,
    nudity: 0.65,
    suggestive: 0.75,
    violence: 0.70,        // Violence MAY be newsworthy
    weapons: 0.80,
    // Gore lives here, not in auto_remove — VozIt's own content mix includes
    // real frontline combat and protest footage (Ukraine-style: explosions,
    // weapons fire, injury) that can be graphic without being exploitative.
    // Auto-deleting on a "gore" match would silence exactly the reporting
    // the platform exists to carry, and cost it future licensing value — a
    // human call is worth the day's delay a fabricated upload isn't owed.
    gore: 0.90,
    minor: 0.40,           // Very sensitive — flag at low confidence
    hate_symbol: 0.70,
    hate_speech: 0.65,
    drugs: 0.75,
    misleading: 0.70,
    ai_generated: 0.50,    // Lower-confidence AI-generated signal — don't auto-remove, but a human should look
    ai_generated_audio: 0.50, // Possible voice clone / synthetic narration
    metadata_mismatch: 0.50,  // GPS/timestamp inconsistency — see checkMetadataConsistency()
  },
}

// Below this, self-harm content still publishes normally, but the viewer
// sees a crisis-resource panel (localized to them, see crisis-resources.ts)
// — a much lower bar than any removal threshold, since showing a helpful
// resource on a false positive costs nothing, unlike a false-positive
// removal or strike would.
const SELF_HARM_PANEL_THRESHOLD = 0.40

// Auto-ban categories (immediate permanent ban)
const AUTO_BAN_CATEGORIES: ModerationCategory[] = ['minor_suggestive']

// A high-confidence hit here still removes the content, but never applies
// the account strike applyStrike() would otherwise add — the uploader may
// be the person actually at risk, and a strike is the wrong response to
// that, unlike for fabrication/exploitation categories.
const NO_STRIKE_CATEGORIES: ModerationCategory[] = ['self_harm']

// Never auto-remove these regardless of confidence — a human always looks
// first. All three show up routinely in legitimate frontline combat and
// protest footage (weapons fire, explosions, injury), which is exactly the
// content VozIt exists to carry. Enforced directly in determineAction()
// below, not just by omission from THRESHOLDS.auto_remove, so a future
// edit to that table can't silently reintroduce auto-removal for these.
const NEWSWORTHY_CATEGORIES: ModerationCategory[] = ['violence', 'weapons', 'gore']

// Scan video via Hive Visual Moderation API
export async function scanVideoFrames(videoUrl: string): Promise<ModerationFlag[]> {
  if (!process.env.HIVE_API_KEY) {
    console.warn('Hive API key not configured — skipping visual scan')
    return []
  }

  try {
    const res = await fetch('https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.HIVE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: videoUrl,
        models: {
          'visual-moderation': {},
          'demographic': {},  // For minor detection
        },
      }),
      signal: AbortSignal.timeout(60000), // 60s for video processing
    })

    if (!res.ok) {
      console.error('Hive API error:', res.status)
      return []
    }

    const data = await res.json()
    const flags: ModerationFlag[] = []

    // Parse Hive response — extract class scores
    const results = data.status?.[0]?.response?.output || []
    for (const frame of results) {
      const classes = frame.classes || []
      for (const cls of classes) {
        const category = mapHiveCategory(cls.class)
        if (category && cls.score > 0.3) {
          flags.push({
            category,
            confidence: cls.score,
            severity: scoreSeverity(cls.score),
            timestamp: frame.time,
            description: `${cls.class}: ${(cls.score * 100).toFixed(1)}% confidence`,
          })
        }
      }
    }

    return flags
  } catch (e: any) {
    console.error('Hive scan failed:', e.message)
    return []
  }
}

// Scan video for AI-generated / deepfake content. VozIt only publishes real
// recorded footage of real events, so this runs on every video alongside
// scanVideoFrames() — a high-confidence hit is treated as seriously as any
// other auto-remove category.
//
// VERIFY BEFORE RELYING ON THIS: the "models" key below (and the exact
// response class names) are Hive's documented product name for this feature
// ("AI-Generated & Deepfake Content Detection") but the precise API key was
// not confirmed against Hive's authenticated API reference. Check the actual
// key in the Hive dashboard / API reference under your account and correct
// it here if it differs before treating this as verified in production.
export async function scanAIGeneratedContent(videoUrl: string): Promise<ModerationFlag[]> {
  if (!process.env.HIVE_API_KEY) {
    console.warn('Hive API key not configured — skipping AI-generated content scan')
    return []
  }

  try {
    const res = await fetch('https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.HIVE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: videoUrl,
        models: { 'ai_generated_and_deepfake_detection': {} },
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      console.error('Hive AI-generated detection API error:', res.status)
      return []
    }

    const data = await res.json()
    const flags: ModerationFlag[] = []
    const results = data.status?.[0]?.response?.output || []

    for (const frame of results) {
      const classes = frame.classes || []
      for (const cls of classes) {
        if ((cls.class === 'ai_generated' || cls.class === 'deepfake') && cls.score > 0.3) {
          flags.push({
            category: 'ai_generated',
            confidence: cls.score,
            severity: scoreSeverity(cls.score),
            timestamp: frame.time,
            description: cls.class === 'deepfake'
              ? `Possible deepfake: ${(cls.score * 100).toFixed(1)}% confidence`
              : `Likely AI-generated content: ${(cls.score * 100).toFixed(1)}% confidence`,
          })
        }
      }
    }

    return flags
  } catch (e: any) {
    console.error('Hive AI-generated content scan failed:', e.message)
    return []
  }
}

// Scan the video's audio track for synthetic/cloned voice content — a
// separate signal from the visual deepfake scan above, since a narration
// track can be AI-generated even when the footage itself is real.
//
// VERIFY BEFORE RELYING ON THIS: same caveat as scanAIGeneratedContent —
// the exact model key/response shape was not confirmed against Hive's
// live, authenticated API reference. Check against your account's actual
// API docs before treating this as verified in production.
export async function scanAIGeneratedAudio(videoUrl: string): Promise<ModerationFlag[]> {
  if (!process.env.HIVE_API_KEY) {
    console.warn('Hive API key not configured — skipping AI-generated audio scan')
    return []
  }

  try {
    const res = await fetch('https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.HIVE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: videoUrl,
        models: { 'audio_deepfake_detection': {} },
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      console.error('Hive audio deepfake detection API error:', res.status)
      return []
    }

    const data = await res.json()
    const flags: ModerationFlag[] = []
    const results = data.status?.[0]?.response?.output || []

    for (const frame of results) {
      const classes = frame.classes || []
      for (const cls of classes) {
        if ((cls.class === 'synthetic_voice' || cls.class === 'voice_clone' || cls.class === 'ai_generated') && cls.score > 0.3) {
          flags.push({
            category: 'ai_generated_audio',
            confidence: cls.score,
            severity: scoreSeverity(cls.score),
            timestamp: frame.time,
            description: `Possible synthetic/cloned voice: ${(cls.score * 100).toFixed(1)}% confidence`,
          })
        }
      }
    }

    return flags
  } catch (e: any) {
    console.error('Hive audio deepfake scan failed:', e.message)
    return []
  }
}

// Cross-checks a report's own claimed details against each other — catches
// sloppy fakes and recycled footage without needing any external API.
// Pure, synchronous, no network calls.
export function checkMetadataConsistency(params: {
  whenHappened?: string | null
  locationName?: string | null
  locationLat?: number | null
  locationLng?: number | null
  createdAt?: string
}): ModerationFlag[] {
  const flags: ModerationFlag[] = []
  const now = params.createdAt ? new Date(params.createdAt) : new Date()

  if (params.whenHappened) {
    const claimed = new Date(params.whenHappened)
    const hoursDiff = (now.getTime() - claimed.getTime()) / (1000 * 60 * 60)

    // Claiming an event happened in the future
    if (hoursDiff < -1) {
      flags.push({
        category: 'metadata_mismatch',
        confidence: 0.9,
        severity: 'high',
        description: `Claimed event time (${params.whenHappened}) is in the future relative to upload time`,
      })
    }
    // Claiming "breaking news" timing on footage that's actually weeks old —
    // not disqualifying (old footage can be legitimate follow-up/archival),
    // but worth a human glance rather than auto-treating it as fresh.
    else if (hoursDiff > 24 * 14) {
      flags.push({
        category: 'metadata_mismatch',
        confidence: 0.5,
        severity: 'low',
        description: `Claimed event time is ${Math.round(hoursDiff / 24)} days before upload — verify this isn't recycled footage`,
      })
    }
  }

  // A named location with no coordinates at all is a weaker report — not
  // inherently suspicious (GPS can be denied/unavailable), just noted.
  if (params.locationName && (params.locationLat == null || params.locationLng == null)) {
    flags.push({
      category: 'metadata_mismatch',
      confidence: 0.35,
      severity: 'low',
      description: 'Location named but no GPS coordinates captured',
    })
  }

  return flags
}

// Scan text content (title, description, 5Ws) for hate speech / misleading
export async function scanText(text: string): Promise<ModerationFlag[]> {
  if (!process.env.HIVE_API_KEY || !text.trim()) return []

  try {
    const res = await fetch('https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.HIVE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text_data: text,
        models: { 'text-moderation': {} },
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return []
    const data = await res.json()
    const flags: ModerationFlag[] = []
    const classes = data.status?.[0]?.response?.output?.[0]?.classes || []

    for (const cls of classes) {
      const category = mapHiveTextCategory(cls.class)
      if (category && cls.score > 0.5) {
        flags.push({
          category,
          confidence: cls.score,
          severity: scoreSeverity(cls.score),
          description: `Text: ${cls.class} (${(cls.score * 100).toFixed(1)}%)`,
        })
      }
    }
    return flags
  } catch { return [] }
}

// Map Hive class names to our categories
function mapHiveCategory(hiveClass: string): ModerationCategory | null {
  const map: Record<string, ModerationCategory> = {
    'general_nsfw': 'sexual',
    'sexual_activity': 'sexual',
    'sexual_display': 'nudity',
    'very_suggestive': 'suggestive',
    'suggestive': 'suggestive',
    'animated_nudity': 'nudity',
    'general_suggestive': 'suggestive',
    'violence': 'violence',
    'very_bloody': 'gore',
    'bloody': 'gore',
    'gun_in_hand': 'weapons',
    'knife_in_hand': 'weapons',
    'drugs': 'drugs',
    'pills': 'drugs',
    'smoking': 'drugs',
    'self_harm': 'self_harm',
    'hate_signs': 'hate_symbol',
    'nazi': 'hate_symbol',
    'yes_minor': 'minor',
  }
  return map[hiveClass] || null
}

function mapHiveTextCategory(hiveClass: string): ModerationCategory | null {
  const map: Record<string, ModerationCategory> = {
    'hate': 'hate_speech',
    'violence': 'violence',
    'sexual': 'sexual',
    'self_harm': 'self_harm',
    'spam': 'spam',
    'bullying': 'hate_speech',
  }
  return map[hiveClass] || null
}

function scoreSeverity(score: number): ModerationSeverity {
  if (score >= 0.95) return 'critical'
  if (score >= 0.85) return 'high'
  if (score >= 0.65) return 'medium'
  if (score >= 0.40) return 'low'
  return 'safe'
}

// Determine auto-action based on flags
function determineAction(flags: ModerationFlag[]): ModerationResult['autoAction'] {
  for (const flag of flags) {
    // Auto-ban: CSAM or minor exploitation
    if (AUTO_BAN_CATEGORIES.includes(flag.category) && flag.confidence > 0.5) {
      return 'auto_ban'
    }
    // Newsworthy categories never auto-remove, no matter how confident the
    // scan is — falls through to the flag_review pass below instead.
    if (NEWSWORTHY_CATEGORIES.includes(flag.category)) continue
    // Auto-remove: high-confidence explicit content
    const removeThreshold = THRESHOLDS.auto_remove[flag.category as keyof typeof THRESHOLDS.auto_remove]
    if (removeThreshold && flag.confidence >= removeThreshold) {
      return 'auto_remove'
    }
  }

  // Flag for review: moderate confidence on sensitive categories
  for (const flag of flags) {
    const reviewThreshold = THRESHOLDS.flag_review[flag.category as keyof typeof THRESHOLDS.flag_review]
    if (reviewThreshold && flag.confidence >= reviewThreshold) {
      // Newsworthy exception: violence/weapons get flagged, not removed
      // This is citizen journalism — war footage is expected
      return 'flag_review'
    }
  }

  return 'publish'
}

// Full moderation scan pipeline
export async function moderateContent(params: {
  videoUrl?: string
  title: string
  description?: string
  who?: string
  what?: string
  why?: string
  whenHappened?: string | null
  locationName?: string | null
  locationLat?: number | null
  locationLng?: number | null
}): Promise<ModerationResult> {
  const startTime = Date.now()
  const allFlags: ModerationFlag[] = []

  // 1. Scan video frames + audio (if URL available)
  if (params.videoUrl) {
    const videoFlags = await scanVideoFrames(params.videoUrl)
    allFlags.push(...videoFlags)
    const aiGenFlags = await scanAIGeneratedContent(params.videoUrl)
    allFlags.push(...aiGenFlags)
    const audioFlags = await scanAIGeneratedAudio(params.videoUrl)
    allFlags.push(...audioFlags)
  }

  // 2. Scan text content
  const textContent = [params.title, params.description, params.who, params.what, params.why]
    .filter(Boolean).join('. ')
  if (textContent) {
    const textFlags = await scanText(textContent)
    allFlags.push(...textFlags)
  }

  // 3. Cross-check the report's own claimed details against each other —
  // no external API, always runs.
  allFlags.push(...checkMetadataConsistency({
    whenHappened: params.whenHappened,
    locationName: params.locationName,
    locationLat: params.locationLat,
    locationLng: params.locationLng,
  }))

  // 4. Determine action
  const autoAction = determineAction(allFlags)
  const highestSeverity = allFlags.reduce<ModerationSeverity>((max, f) => {
    const order: ModerationSeverity[] = ['safe', 'low', 'medium', 'high', 'critical']
    return order.indexOf(f.severity) > order.indexOf(max) ? f.severity : max
  }, 'safe')

  const showCrisisResources = allFlags.some(
    f => f.category === 'self_harm' && f.confidence >= SELF_HARM_PANEL_THRESHOLD
  )
  const noStrikeRemoval = autoAction === 'auto_remove' && allFlags.some(
    f => NO_STRIKE_CATEGORIES.includes(f.category)
      && f.confidence >= (THRESHOLDS.auto_remove[f.category as keyof typeof THRESHOLDS.auto_remove] ?? Infinity)
  )

  return {
    passed: autoAction === 'publish',
    severity: highestSeverity,
    flags: allFlags,
    autoAction,
    scanId: `HIVE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    scannedAt: new Date().toISOString(),
    processingMs: Date.now() - startTime,
    showCrisisResources,
    noStrikeRemoval,
  }
}

// Log moderation result to database
export async function logModerationResult(
  supabase: any, reportId: string, result: ModerationResult
) {
  await supabase.from('moderation_scans').insert({
    report_id: reportId,
    scan_id: result.scanId,
    passed: result.passed,
    severity: result.severity,
    auto_action: result.autoAction,
    flags: result.flags,
    processing_ms: result.processingMs,
    scanned_at: result.scannedAt,
  })
}
