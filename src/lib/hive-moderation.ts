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
  | 'ai_generated'

export type ModerationSeverity = 'safe' | 'low' | 'medium' | 'high' | 'critical'

export interface ModerationResult {
  passed: boolean
  severity: ModerationSeverity
  flags: ModerationFlag[]
  autoAction: 'publish' | 'flag_review' | 'auto_remove' | 'auto_ban'
  scanId: string
  scannedAt: string
  processingMs: number
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
    gore: 0.90,
    ai_generated: 0.85,    // High-confidence AI-generated/deepfake — VozIt only accepts real recorded footage
  },
  // Flag for human review
  flag_review: {
    sexual: 0.60,
    nudity: 0.65,
    suggestive: 0.75,
    violence: 0.70,        // Violence MAY be newsworthy
    weapons: 0.80,
    minor: 0.40,           // Very sensitive — flag at low confidence
    hate_symbol: 0.70,
    hate_speech: 0.65,
    drugs: 0.75,
    self_harm: 0.60,
    misleading: 0.70,
    ai_generated: 0.50,    // Lower-confidence AI-generated signal — don't auto-remove, but a human should look
  },
}

// Auto-ban categories (immediate permanent ban)
const AUTO_BAN_CATEGORIES: ModerationCategory[] = ['minor_suggestive']

// Newsworthy exception categories (violence/weapons may be legitimate reporting)
const NEWSWORTHY_CATEGORIES: ModerationCategory[] = ['violence', 'weapons']

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
}): Promise<ModerationResult> {
  const startTime = Date.now()
  const allFlags: ModerationFlag[] = []

  // 1. Scan video frames (if URL available)
  if (params.videoUrl) {
    const videoFlags = await scanVideoFrames(params.videoUrl)
    allFlags.push(...videoFlags)
    const aiGenFlags = await scanAIGeneratedContent(params.videoUrl)
    allFlags.push(...aiGenFlags)
  }

  // 2. Scan text content
  const textContent = [params.title, params.description, params.who, params.what, params.why]
    .filter(Boolean).join('. ')
  if (textContent) {
    const textFlags = await scanText(textContent)
    allFlags.push(...textFlags)
  }

  // 3. Determine action
  const autoAction = determineAction(allFlags)
  const highestSeverity = allFlags.reduce<ModerationSeverity>((max, f) => {
    const order: ModerationSeverity[] = ['safe', 'low', 'medium', 'high', 'critical']
    return order.indexOf(f.severity) > order.indexOf(max) ? f.severity : max
  }, 'safe')

  return {
    passed: autoAction === 'publish',
    severity: highestSeverity,
    flags: allFlags,
    autoAction,
    scanId: `HIVE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    scannedAt: new Date().toISOString(),
    processingMs: Date.now() - startTime,
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
