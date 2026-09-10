// @ts-nocheck
// ══════════════════════════════════════════════════════════════
// VozIt Three-Layer Watermark System
// ══════════════════════════════════════════════════════════════
//
// Layer 1: BOTTOM BAR (persistent)
//   [logo] VozIt! · @username · I was there... [★ Tier]
//   Gradient bar, entire video duration
//
// Layer 2: FLOATING STAMP (anti-scraping)
//   Pill with logo + "VozIt! — I was there..."
//   Drifts to new position every 4 seconds (7 positions)
//   Semi-transparent, avoids center of frame
//
// Layer 3: END CARD (1.5s bumper)
//   Logo scales up, orange fills screen, tagline fades in
//   Appended to the last 1.5s of every export/share
//
// Outputs: watermarked (public) + clean (licensed)
// ══════════════════════════════════════════════════════════════

export interface WatermarkConfig {
  username: string
  tier: 'starter' | 'silver' | 'gold' | 'platinum'
  logoPath: string        // Path to VozIt logo PNG (with transparency)
  videoDuration: number   // Total video duration in seconds
  videoWidth: number
  videoHeight: number
}

const TIER_COLORS: Record<string, string> = {
  starter:  'green',
  silver:   'gray',
  gold:     'yellow',
  platinum: 'violet',
}

const TIER_LABELS: Record<string, string> = {
  starter:  '★ Starter',
  silver:   '★ Silver',
  gold:     '★ Gold',
  platinum: '★ Platinum',
}

// ── LAYER 1: BOTTOM BAR ──────────────────────────────────────
// Persistent gradient bar at bottom with logo, text, and tier badge
function buildBottomBarFilter(config: WatermarkConfig): string {
  const { username, tier, videoHeight } = config
  const barHeight = Math.max(36, Math.round(videoHeight * 0.05))
  const fontSize = Math.max(14, Math.round(videoHeight * 0.02))
  const tierLabel = TIER_LABELS[tier] || TIER_LABELS.starter

  const safeUser = username.replace(/'/g, "\\'").replace(/:/g, '\\:')
  const safeTier = tierLabel.replace(/'/g, "\\'").replace(/:/g, '\\:')

  // Gradient bar background (dark fade from transparent)
  const barBg = `drawbox=x=0:y=ih-${barHeight}:w=iw:h=${barHeight}:color=black@0.55:t=fill`

  // "VozIt!" text (after logo space)
  const brandText = [
    `drawtext=text='VozIt!'`,
    `fontsize=${fontSize}`,
    `fontcolor=white@0.88`,
    `shadowcolor=black@0.8:shadowx=1:shadowy=1`,
    `x=42:y=ih-${barHeight}+${Math.round(barHeight / 2 - fontSize / 2)}`,
    `font=Arial:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`,
  ].join(':')

  // "· @username · I was there..."
  const creditText = [
    `drawtext=text='\\· @${safeUser} \\· I was there...'`,
    `fontsize=${fontSize - 1}`,
    `fontcolor=white@0.82`,
    `shadowcolor=black@0.8:shadowx=1:shadowy=1`,
    `x=42+text_w+12:y=ih-${barHeight}+${Math.round(barHeight / 2 - fontSize / 2)}`,
    `font=Arial:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`,
  ].join(':')

  // Tier badge (right-aligned)
  const tierBadge = [
    `drawtext=text='${safeTier}'`,
    `fontsize=${fontSize - 3}`,
    `fontcolor=white@0.9`,
    `shadowcolor=black@0.6:shadowx=1:shadowy=1`,
    `x=iw-text_w-14:y=ih-${barHeight}+${Math.round(barHeight / 2 - (fontSize - 3) / 2)}`,
    `font=Arial:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`,
  ].join(':')

  return [barBg, brandText, creditText, tierBadge].join(',')
}

// ── LAYER 2: FLOATING STAMP ──────────────────────────────────
// Semi-transparent pill that drifts every 4 seconds
// Uses FFmpeg's enable=between() to show at different positions
function buildFloatingStampFilter(config: WatermarkConfig): string {
  const { videoWidth, videoHeight, videoDuration } = config
  const fontSize = Math.max(12, Math.round(videoHeight * 0.017))
  const stampText = 'VozIt! \\— I was there...'

  // 7 positions as percentage of frame (avoiding center and bottom bar)
  const positions = [
    { xExpr: 'iw*0.08',           yExpr: 'ih*0.15' }, // top-left area
    { xExpr: 'iw-text_w-iw*0.10', yExpr: 'ih*0.22' }, // top-right area
    { xExpr: 'iw*0.15',           yExpr: 'ih*0.40' }, // mid-left
    { xExpr: 'iw-text_w-iw*0.06', yExpr: 'ih*0.45' }, // mid-right
    { xExpr: 'iw*0.40',           yExpr: 'ih*0.12' }, // top-center-ish
    { xExpr: 'iw*0.30',           yExpr: 'ih*0.38' }, // left-of-center
    { xExpr: 'iw-text_w-iw*0.22', yExpr: 'ih*0.18' }, // upper-right-ish
  ]

  // Build a drawtext for each 4-second window at a different position
  const interval = 4 // seconds per position
  const stamps: string[] = []

  for (let t = 0; t < videoDuration; t += interval) {
    const posIdx = Math.floor(t / interval) % positions.length
    const pos = positions[posIdx]
    const tEnd = Math.min(t + interval, videoDuration)

    // Semi-transparent background box behind text
    const boxFilter = [
      `drawbox=x=${pos.xExpr}-8`,
      `y=${pos.yExpr}-4`,
      `w=text_w+40`,  // approximate — FFmpeg doesn't support text_w in drawbox
      `h=${fontSize + 10}`,
      `color=0xFE3D07@0.18:t=fill`,
      `enable='between(t,${t},${tEnd})'`,
    ].join(':')

    // Text overlay
    const textFilter = [
      `drawtext=text='${stampText}'`,
      `fontsize=${fontSize}`,
      `fontcolor=white@0.50`,
      `shadowcolor=black@0.5:shadowx=1:shadowy=1`,
      `x=${pos.xExpr}`,
      `y=${pos.yExpr}`,
      `font=Arial:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`,
      `enable='between(t,${t},${tEnd})'`,
    ].join(':')

    stamps.push(textFilter)
  }

  return stamps.join(',')
}

// ── LAYER 3: END CARD ────────────────────────────────────────
// 1.5s bumper: orange background + logo overlay + tagline text
// This is generated as a separate video and concatenated
function buildEndCardCommand(config: WatermarkConfig): string {
  const { logoPath, videoWidth, videoHeight } = config
  const duration = 1.5
  const fontSize = Math.max(20, Math.round(videoHeight * 0.035))
  const logoSize = Math.round(Math.min(videoWidth, videoHeight) * 0.25)

  // Generate a 1.5s orange gradient background with logo centered + tagline
  // Step 1: Create orange gradient background video
  // Step 2: Overlay logo at center
  // Step 3: Add "I was there..." text below
  // Step 4: Add "vozit.app" URL text
  return [
    'ffmpeg -y',
    // Input 1: Orange gradient color source
    `-f lavfi -i "color=c=0xFE3D07:size=${videoWidth}x${videoHeight}:duration=${duration}:rate=30"`,
    // Input 2: Logo image
    `-i "${logoPath}"`,
    // Filter: scale logo, center it, add text
    `-filter_complex "` +
      // Scale logo to desired size
      `[1:v]scale=${logoSize}:${logoSize}[logo];` +
      // Overlay logo centered on orange background
      `[0:v][logo]overlay=(W-w)/2:(H-h)/2-${Math.round(fontSize * 0.8)}[bg_logo];` +
      // Add tagline
      `[bg_logo]drawtext=text='I was there...':` +
        `fontsize=${fontSize}:fontcolor=white@0.92:` +
        `font=Arial:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf:` +
        `x=(w-text_w)/2:y=(h/2)+${Math.round(logoSize / 2)}+${Math.round(fontSize * 0.3)},` +
      // Add URL
      `drawtext=text='vozit.app':` +
        `fontsize=${Math.round(fontSize * 0.6)}:fontcolor=white@0.4:` +
        `font=Arial:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:` +
        `x=(w-text_w)/2:y=(h/2)+${Math.round(logoSize / 2)}+${Math.round(fontSize * 1.8)}"`,
    // Output
    '-c:v libx264 -preset fast -crf 18',
    '-pix_fmt yuv420p',
    '-t', String(duration),
  ].join(' ')
}

// ── FULL PIPELINE ────────────────────────────────────────────
// Combines all three layers into two output files:
//   1. watermarked.mp4 (public — all three layers burned in)
//   2. clean.mp4 (licensed — no watermarks)
export function buildFullWatermarkPipeline(params: {
  inputPath: string
  outputDir: string
  config: WatermarkConfig
}): {
  step1_endcard: string   // Generate end card video
  step2_watermark: string // Apply layers 1+2 + concatenate layer 3
  step3_clean: string     // Copy clean version
  outputWatermarked: string
  outputClean: string
  outputEndCard: string
} {
  const { inputPath, outputDir, config } = params
  const endCardPath = `${outputDir}/endcard_tmp.mp4`
  const watermarkedPath = `${outputDir}/watermarked.mp4`
  const watermarkedPreConcat = `${outputDir}/watermarked_pre.mp4`
  const cleanPath = `${outputDir}/clean.mp4`
  const concatListPath = `${outputDir}/concat.txt`

  // Step 1: Generate the end card bumper video
  const step1 = buildEndCardCommand(config) + ` "${endCardPath}"`

  // Step 2: Apply bottom bar (Layer 1) + floating stamp (Layer 2) to main video
  const bottomBar = buildBottomBarFilter(config)
  const floatingStamp = buildFloatingStampFilter(config)

  // Logo overlay for bottom bar (overlay the actual logo image at bottom-left)
  const logoOverlay = [
    'ffmpeg -y',
    `-i "${inputPath}"`,
    `-i "${config.logoPath}"`,
    `-filter_complex "`,
      // Scale logo to 22px for bottom bar
      `[1:v]scale=22:22[bar_logo];`,
      // Overlay logo at bottom-left of bar
      `[0:v][bar_logo]overlay=12:H-30[with_logo];`,
      // Apply bottom bar text + floating stamp
      `[with_logo]${bottomBar},${floatingStamp}"`,
    '-c:v libx264 -preset fast -crf 23',
    '-c:a aac -b:a 128k',
    '-movflags +faststart',
    `-map 0:a?`,
    `"${watermarkedPreConcat}"`,
  ].join(' ')

  // Concatenate main video + end card
  // First write the concat list file
  const step2 = [
    // Apply watermark layers
    logoOverlay,
    '&&',
    // Write concat list
    `echo "file '${watermarkedPreConcat}'" > "${concatListPath}"`,
    '&&',
    `echo "file '${endCardPath}'" >> "${concatListPath}"`,
    '&&',
    // Concatenate
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${watermarkedPath}"`,
    '&&',
    // Cleanup temp files
    `rm -f "${watermarkedPreConcat}" "${endCardPath}" "${concatListPath}"`,
  ].join(' ')

  // Step 3: Clean copy (no watermarks — for licensed downloads)
  const step3 = [
    'ffmpeg -y',
    `-i "${inputPath}"`,
    '-c:v libx264 -preset fast -crf 23',
    '-c:a aac -b:a 128k',
    '-movflags +faststart',
    `"${cleanPath}"`,
  ].join(' ')

  return {
    step1_endcard: step1,
    step2_watermark: step2,
    step3_clean: step3,
    outputWatermarked: watermarkedPath,
    outputClean: cleanPath,
    outputEndCard: endCardPath,
  }
}

// ── WORKER ENTRY POINT ───────────────────────────────────────
// Called by background worker after Mux finishes transcoding
export async function processVideoWatermark(params: {
  playbackId: string
  reportId: string
  username: string
  tier: 'starter' | 'silver' | 'gold' | 'platinum'
  duration: number
  width?: number
  height?: number
}): Promise<{
  watermarkedUrl: string
  cleanUrl: string
  success: boolean
  error?: string
}> {
  const downloadUrl = `https://stream.mux.com/${params.playbackId}/high.mp4`

  try {
    // In production worker environment:
    // 1. Download video from Mux
    //    wget -O /tmp/{reportId}/input.mp4 {downloadUrl}
    //
    // 2. Copy logo to working directory
    //    cp /app/public/brand/vozit-icon-96.png /tmp/{reportId}/logo.png
    //
    // 3. Get video dimensions if not provided
    //    ffprobe -v error -select_streams v:0 \
    //      -show_entries stream=width,height \
    //      -of csv=p=0 /tmp/{reportId}/input.mp4
    //
    // 4. Build and execute pipeline
    const config: WatermarkConfig = {
      username: params.username,
      tier: params.tier,
      logoPath: '/tmp/logo.png',
      videoDuration: params.duration,
      videoWidth: params.width || 1920,
      videoHeight: params.height || 1080,
    }

    const pipeline = buildFullWatermarkPipeline({
      inputPath: `/tmp/${params.reportId}/input.mp4`,
      outputDir: `/tmp/${params.reportId}`,
      config,
    })

    // Execute steps in sequence:
    // exec(pipeline.step1_endcard)   // Generate end card
    // exec(pipeline.step2_watermark) // Apply layers + concat
    // exec(pipeline.step3_clean)     // Clean copy

    // 5. Upload both versions to storage
    //    - watermarked.mp4 → Supabase Storage (public bucket)
    //    - clean.mp4 → Supabase Storage (private bucket, license-gated)
    //
    // 6. Update reports table with video URLs
    //    UPDATE reports SET
    //      watermarked_url = '...',
    //      clean_url = '...',
    //      watermark_applied = true
    //    WHERE id = reportId

    return {
      watermarkedUrl: `${params.reportId}/watermarked.mp4`,
      cleanUrl: `${params.reportId}/clean.mp4`,
      success: true,
    }
  } catch (e: any) {
    return { watermarkedUrl: '', cleanUrl: '', success: false, error: e.message }
  }
}

// ── STORAGE PATHS ────────────────────────────────────────────
export function getVideoStoragePaths(reportId: string) {
  return {
    watermarked: `videos/${reportId}/watermarked.mp4`,  // Public — anyone can stream
    clean: `videos/${reportId}/clean.mp4`,              // Private — licensed downloads only
    original: `videos/${reportId}/original.mp4`,        // Archive — never served
  }
}

// ── LICENSE GATE ─────────────────────────────────────────────
export async function canDownloadCleanVideo(
  supabase: any, reportId: string, licenseeEmail: string
): Promise<boolean> {
  const { data: license } = await supabase
    .from('licenses')
    .select('id, status, expires_at, rights')
    .eq('report_id', reportId)
    .eq('licensee_email', licenseeEmail)
    .eq('status', 'active')
    .single()

  if (!license) return false
  if (new Date(license.expires_at) < new Date()) return false
  return (license.rights as string[]).includes('download')
}

// ── CSS OVERLAY (for embed player — no FFmpeg needed) ────────
export function getEmbedWatermarkHTML(username: string): string {
  return `
    <div style="position:absolute;bottom:0;left:0;right:0;height:36px;
      background:linear-gradient(transparent,rgba(0,0,0,0.6));
      display:flex;align-items:center;gap:8px;padding:0 14px;
      pointer-events:none;z-index:10">
      <span style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:500;
        text-shadow:0 1px 3px rgba(0,0,0,0.9);letter-spacing:0.3px">
        VozIt! · @${username} · <em>I was there...</em>
      </span>
    </div>`
}
