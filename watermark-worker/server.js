// VozIt watermark worker — burns the brand/caption design into published
// videos: a compact top-left brand badge, a short-lived title banner
// stacked beneath it, burned-in captions from the reporter's own
// transcript in a center-safe band, a drifting anti-scrape stamp, and an
// orange end-card bumper.
//
// Layout was redesigned around real per-platform safe-zone conflicts:
// TikTok reserves its own top ~120 screen-px for nav AND has an unusually
// wide right-side icon column; Meta (Reels/Facebook) and TikTok both
// crowd the bottom ~25-33% with caption/follow/engagement UI. Top-left is
// the one corner all four distribution platforms leave clearest, so the
// old full-width bottom bar moved there and shrank to fit its content
// instead of spanning the frame.
//
// Deliberately kept simpler than a fancier spec in one place: the badge,
// title banner, captions and floating stamp all use styled TEXT (no image
// overlay), which matches what viewers already see in the in-app CSS
// overlay and avoids chaining a second image input through the main
// video's filter graph. The end card keeps the real logo image, since
// that's a bigger, more impactful bumper moment worth the extra
// complexity.
const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const { execFile } = require('child_process')
const { promisify } = require('util')
const fs = require('fs/promises')
const path = require('path')
const os = require('os')

const execFileAsync = promisify(execFile)
const app = express()
app.use(express.json())

const WORKER_SECRET = process.env.WATERMARK_WORKER_SECRET
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STORAGE_BUCKET = process.env.WATERMARK_STORAGE_BUCKET || 'videos'
const LOGO_PATH = path.join(__dirname, 'assets', 'logo.png')
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const FONT_REGULAR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
const FONT_ITALIC = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf'

const TIER_LABELS = { starter: 'Starter', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' }
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Calendar date only (not time-of-day), so a UTC-vs-local mismatch only
// risks being off by one day right at midnight — an acceptable tradeoff
// for a display label, unlike the GPS/bearing/tilt telemetry elsewhere in
// this app which must always be device-sourced.
function formatDateLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null

app.get('/health', (req, res) => res.json({ ok: true }))

app.post('/process', async (req, res) => {
  // This route previously had no logging at all except on a thrown error
  // partway through FFmpeg/upload — an auth rejection or a missing-config
  // response left zero trace anywhere, making "nothing happened" and
  // "ran and failed silently" indistinguishable from the outside.
  console.log('[watermark-worker] /process request received', { reportId: req.body?.reportId, hasSecret: !!req.headers['x-worker-secret'] })
  if (!WORKER_SECRET || req.headers['x-worker-secret'] !== WORKER_SECRET) {
    console.error('[watermark-worker] rejected: secret mismatch or WORKER_SECRET unset', { hasWorkerSecret: !!WORKER_SECRET, hasHeaderSecret: !!req.headers['x-worker-secret'] })
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!supabase) {
    console.error('[watermark-worker] rejected: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    return res.status(500).json({ error: 'Worker missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' })
  }

  const { reportId, playbackId, username, tier, duration, title, transcript, location, capturedAt } = req.body || {}
  const videoDuration = Number(duration) || 90

  if (!reportId || !playbackId) {
    return res.status(400).json({ error: 'reportId and playbackId required' })
  }

  // Fail fast, before spending a minute on FFmpeg, if the one remaining
  // untested link in this chain — the storage bucket the finished file
  // gets uploaded to — doesn't actually exist. Every prior failure
  // happened upstream of this step, so it's never actually been
  // exercised; this turns a silent/late storage error into an
  // immediate, clearly-labeled one.
  const { error: bucketError } = await supabase.storage.from(STORAGE_BUCKET).list('', { limit: 1 })
  if (bucketError) {
    console.error('[watermark-worker] storage bucket check failed', { bucket: STORAGE_BUCKET, error: bucketError.message })
    return res.status(500).json({ success: false, error: `Storage bucket "${STORAGE_BUCKET}" is missing or inaccessible: ${bucketError.message}` })
  }

  const workDir = path.join(os.tmpdir(), `vz_${reportId}_${Date.now()}`)
  const inputPath = path.join(workDir, 'input.mp4')
  const preConcatPath = path.join(workDir, 'pre_concat.mp4')
  const endCardPath = path.join(workDir, 'endcard.mp4')
  const concatListPath = path.join(workDir, 'concat.txt')
  const outputPath = path.join(workDir, 'watermarked.mp4')

  try {
    await fs.mkdir(workDir, { recursive: true })

    // 1. Download the source rendition from Mux
    // static_renditions with resolution:'highest' (set at upload time, see
    // src/lib/mux.ts) names its file "highest.mp4" — the older
    // mp4_support:'standard' shortcut would have produced "high.mp4"
    // instead, which is deprecated and rejected on this account's plan.
    // Every FFmpeg step below has an explicit timeout; this fetch never
    // did. Confirmed by direct testing: a /process request can log
    // "received" and then produce zero further trace — no success, no
    // error — for 7+ minutes straight, consistent with a stalled network
    // read here hanging the whole job forever with nothing to show for
    // it. AbortController gives this the same kind of ceiling the rest
    // of the pipeline already has.
    const sourceUrl = `https://stream.mux.com/${playbackId}/highest.mp4`
    const downloadController = new AbortController()
    const downloadTimeout = setTimeout(() => downloadController.abort(), 120_000)
    let videoRes
    try {
      videoRes = await fetch(sourceUrl, { signal: downloadController.signal })
    } catch (e) {
      throw new Error(`Fetching source video from Mux timed out or failed: ${e.message}`)
    } finally {
      clearTimeout(downloadTimeout)
    }
    if (!videoRes.ok) throw new Error(`Could not fetch source video from Mux (${videoRes.status})`)
    await fs.writeFile(inputPath, Buffer.from(await videoRes.arrayBuffer()))

    // Measure the real video dimensions instead of trusting a caller-
    // supplied (or defaulted) width/height. The caller was defaulting to
    // 1920x1080 whenever it didn't pass dimensions at all — for a portrait
    // phone video (actually 1080x1920) that fed exactly backwards numbers
    // into the bar-height/font-size math below, which produced a
    // malformed FFmpeg filter expression and crashed every single job for
    // vertical video, the most common shape this app actually receives.
    const { stdout: probeOut } = await execFileAsync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'json', inputPath,
    ])
    const probed = JSON.parse(probeOut)?.streams?.[0] || {}
    const width = Number(probed.width) || 1920
    const height = Number(probed.height) || 1080

    // Strip anything that could break out of an FFmpeg drawtext filter
    // string (colons, quotes, commas, backslashes all have special meaning
    // there) — usernames are already sanitized at registration, but the
    // worker shouldn't trust that alone.
    const safeUsername = String(username || 'reporter').replace(/['":,\\]/g, '').slice(0, 40)
    const tierLabel = `★ ${TIER_LABELS[tier] || 'Starter'}`

    // 2. Brand badge (Layer 1, compact/top-left) + title banner (Layer 1b,
    // fades after ~5s) + burned-in captions (Layer 1c, center-safe band) +
    // drifting stamp (Layer 2), applied to the main video as one filter
    // chain.
    //
    // ROOT CAUSE of every "Undefined constant or missing '('" crash this
    // feature ever hit, confirmed by direct, isolated testing on the live
    // machine via `fly ssh console` (not guesswork): the drawtext filter's
    // own frame-size variables are w/h (also main_w/main_h) — iw/ih are a
    // *different* filter's variables (drawbox, scale, crop...) and are
    // simply undefined inside drawtext. Every x/y expression below that
    // used iw/ih failed the instant it was evaluated, regardless of how
    // simple or complex the surrounding arithmetic was. drawbox calls
    // below correctly keep iw/ih — that filter actually defines them;
    // every position fed to a drawtext call is a plain pre-computed pixel
    // number instead, since w/h being constant for the whole video means
    // JS can just do this math once up front.
    // Bumped from the previously-measured 0.58/0.54: confirmed directly
    // against a real rendered frame that those ratios under-measure real
    // text_w enough, across several adjacent drawtext calls whose
    // positions chain off each other's estimated width (brand->username,
    // username->tier), for the accumulated error to visibly overlap two
    // segments — the tier badge's star glyph landed on top of the
    // username's last character. An overestimate here only adds a little
    // harmless extra gap; an underestimate causes exactly this kind of
    // silent, hard-to-spot overlap, so erring wide is the safer direction.
    const CHAR_WIDTH_RATIO_BOLD = 0.66 // DejaVu Sans Bold
    const CHAR_WIDTH_RATIO_REG = 0.60  // DejaVu Sans regular, narrower than Bold
    const estimateTextWidth = (text, size, ratio = CHAR_WIDTH_RATIO_BOLD) => text.length * size * ratio
    // Standard broadcast-caption technique: a solid dark outline baked
    // into the glyphs themselves holds up under video compression and
    // on-device scaling in a way translucent background boxes alone
    // don't — confirmed directly against a bright outdoor source clip
    // where box-only contrast washed out but this didn't.
    const TEXT_BORDER = `borderw=2:bordercolor=black@0.85`

    // ── LAYER 1: BRAND BADGE (compact, top-left) ──────────────────
    // Replaces the old full-width bottom bar. TikTok reserves roughly its
    // own top ~120 screen-px for nav; scaled to this video's own height
    // with real headroom, 0.09H clears that with margin on every
    // platform reviewed. Sized to its own content (not full-width) per
    // the "compact" brief — "I was there..." dropped from this line to
    // keep it tight; it still appears in the drifting stamp and end card.
    const badgeFontSize = Math.max(14, Math.round(height * 0.02))
    const badgeUserFontSize = badgeFontSize - 1
    const badgeTierFontSize = badgeFontSize - 3
    const badgeY0 = Math.round(height * 0.09)
    const badgeHeight = Math.max(36, Math.round(height * 0.05))
    const badgeX0 = 14
    const badgePadX = 12
    const badgeGap = 12
    const MAX_BADGE_WIDTH = Math.round(width * 0.72)

    let badgeUser = safeUsername
    const badgeFits = (user) =>
      estimateTextWidth('VozIt!', badgeFontSize) + badgeGap +
      estimateTextWidth(`@${user}`, badgeUserFontSize) + badgeGap +
      estimateTextWidth(tierLabel, badgeTierFontSize) + badgePadX * 2
    while (badgeFits(badgeUser) > MAX_BADGE_WIDTH && badgeUser.length > 3) {
      badgeUser = badgeUser.slice(0, -1)
    }
    if (badgeUser.length < safeUsername.length) badgeUser = badgeUser.slice(0, -1) + '…'
    const badgeUserText = `@${badgeUser}`

    const badgeBrandWidth = estimateTextWidth('VozIt!', badgeFontSize)
    const badgeUserWidth = estimateTextWidth(badgeUserText, badgeUserFontSize)
    const badgeTierWidth = estimateTextWidth(tierLabel, badgeTierFontSize)
    const badgeContentWidth = badgeBrandWidth + badgeGap + badgeUserWidth + badgeGap + badgeTierWidth
    const badgeWidth = Math.min(MAX_BADGE_WIDTH, Math.round(badgeContentWidth) + badgePadX * 2)

    const badgeBrandX = badgeX0 + badgePadX
    const badgeUserX = badgeBrandX + Math.round(badgeBrandWidth) + badgeGap
    const badgeTierX = badgeUserX + Math.round(badgeUserWidth) + badgeGap
    const badgeTextY = (fontSize) => badgeY0 + Math.round(badgeHeight / 2 - fontSize / 2)

    const badgeFilters = [
      `drawbox=x=${badgeX0}:y=${badgeY0}:w=${badgeWidth}:h=${badgeHeight}:color=black@0.60:t=fill`,
      `drawtext=text='VozIt!':fontsize=${badgeFontSize}:fontcolor=0xFE3D07:fontfile=${FONT_BOLD}:${TEXT_BORDER}:` +
        `x=${badgeBrandX}:y=${badgeTextY(badgeFontSize)}`,
      `drawtext=text='${badgeUserText}':fontsize=${badgeUserFontSize}:fontcolor=white@0.95:${TEXT_BORDER}:` +
        `fontfile=${FONT_BOLD}:x=${badgeUserX}:y=${badgeTextY(badgeUserFontSize)}`,
      `drawtext=text='${tierLabel}':fontsize=${badgeTierFontSize}:fontcolor=white@1.0:fontfile=${FONT_BOLD}:${TEXT_BORDER}:` +
        `x=${badgeTierX}:y=${badgeTextY(badgeTierFontSize)}`,
    ]

    // ── LAYER 1b: TITLE BANNER (stacked below badge, fades ~4-5s) ──
    // Two lines: "RAW FOOTAGE: <title>" then "<location> · <date>" — the
    // raw-footage framing from the Meta guidance review, using the
    // reporter's own Title and the report's own location/date (never
    // AI-generated text). Visible full-strength for TITLE_VISIBLE_SECONDS,
    // then a 1s linear fade, then gone — reads as an establishing caption
    // for the opening beat, not something that needs to stay up the whole
    // clip.
    const titleFilters = []
    const safeTitle0 = String(title || '').replace(/['":,\\]/g, '').slice(0, 120)
    if (safeTitle0) {
      const TITLE_VISIBLE_SECONDS = 4
      const TITLE_FADE_SECONDS = 1
      const line1FontSize = Math.max(15, Math.round(height * 0.022))
      const line2FontSize = Math.max(13, Math.round(height * 0.018))
      const lineGap = 4
      const titleY0 = badgeY0 + badgeHeight + 8
      const titlePadX = 12
      const titlePadY = 8
      const MAX_TITLE_WIDTH = Math.round(width * 0.86)

      const fitLine = (text, fontSize) => {
        let t = text
        let truncated = false
        while (estimateTextWidth(t, fontSize) + titlePadX * 2 > MAX_TITLE_WIDTH && t.length > 3) {
          t = t.slice(0, -1)
          truncated = true
        }
        return truncated ? t.trimEnd() + '…' : t
      }

      // A literal, unescaped ':' in drawtext's text value breaks FFmpeg's
      // own option parsing (':' is the filter option separator, even
      // inside single-quoted text) — confirmed directly: this crashed
      // every single job with "Both text and text file provided" until
      // escaped. Reporter-entered text never hits this (sanitized
      // upstream to strip ':' entirely), but this literal label is
      // authored here, so it needs its own escape.
      const line1 = fitLine(`RAW FOOTAGE\\: ${safeTitle0}`, line1FontSize)

      const safeLocation = String(location || '').replace(/['":,\\]/g, '').slice(0, 60)
      const dateLabel = formatDateLabel(capturedAt)
      const line2Raw = [safeLocation, dateLabel].filter(Boolean).join(' · ')
      const line2 = line2Raw ? fitLine(line2Raw, line2FontSize) : ''

      const titleContentWidth = Math.max(
        estimateTextWidth(line1, line1FontSize),
        line2 ? estimateTextWidth(line2, line2FontSize) : 0
      )
      const titleBoxWidth = Math.min(MAX_TITLE_WIDTH, Math.round(titleContentWidth) + titlePadX * 2)
      const titleBoxHeight = line2
        ? titlePadY * 2 + line1FontSize + lineGap + line2FontSize
        : titlePadY * 2 + line1FontSize

      const cutoff = TITLE_VISIBLE_SECONDS + TITLE_FADE_SECONDS
      const titleEnable = `enable='lt(t\\,${cutoff})'`
      // FFmpeg expression commas need escaping the same way the stamp's
      // enable=between(...) below does, since this whole expression sits
      // inside one comma-joined filter chain.
      const titleAlpha = `alpha='if(lt(t\\,${TITLE_VISIBLE_SECONDS})\\,1\\,(${cutoff}-t))'`

      titleFilters.push(
        `drawbox=x=${badgeX0}:y=${titleY0}:w=${titleBoxWidth}:h=${titleBoxHeight}:color=black@0.55:t=fill:${titleEnable}`
      )
      titleFilters.push(
        `drawtext=text='${line1}':fontsize=${line1FontSize}:fontcolor=white@0.95:${TEXT_BORDER}:` +
        `fontfile=${FONT_BOLD}:x=${badgeX0 + titlePadX}:y=${titleY0 + titlePadY}:` +
        `${titleAlpha}:${titleEnable}`
      )
      if (line2) {
        titleFilters.push(
          `drawtext=text='${line2}':fontsize=${line2FontSize}:fontcolor=white@0.80:${TEXT_BORDER}:` +
          `fontfile=${FONT_REGULAR}:x=${badgeX0 + titlePadX}:y=${titleY0 + titlePadY + line1FontSize + lineGap}:` +
          `${titleAlpha}:${titleEnable}`
        )
      }
    }

    // ── LAYER 1c: BURNED-IN CAPTIONS (center-safe band) ─────────────
    // The reporter's own Whisper transcript, until now only ever shown
    // as click-to-reveal text on VozIt's own site — never burned into
    // the video itself, so social viewers never saw it. No per-word
    // timestamps are captured today (see /api/ai-transcribe), so this
    // divides the flat transcript into short word-chunks spread evenly
    // across the real video duration rather than word-perfect sync —
    // an approximation, not true ASR timing, but still real spoken
    // content on screen instead of none. Positioned around 0.58H: clear
    // of the badge/title zone above (ends ~0.19H) and clear of the
    // bottom ~25-33% every platform reviewed crowds with its own UI.
    const captionFilters = []
    const rawTranscript = String(transcript || '').trim()
    if (rawTranscript) {
      const CAPTION_MIN_CHUNK_SECONDS = 1.6
      const captionFontSize = Math.max(16, Math.round(height * 0.024))
      const captionY = Math.round(height * 0.58)
      const captionPadX = Math.round(captionFontSize * 0.5)
      const captionPadY = Math.round(captionFontSize * 0.35)
      const MAX_CAPTION_WIDTH = Math.round(width * 0.84)

      const words = rawTranscript.replace(/['":,\\]/g, '').split(/\s+/).filter(Boolean)
      // Bounds the chunk count by the clip's own length regardless of
      // transcript length (a dense/long monologue packs more words per
      // chunk instead of growing the filter chain without limit).
      const maxChunks = Math.max(1, Math.floor(videoDuration / CAPTION_MIN_CHUNK_SECONDS))
      const wordsPerChunk = Math.max(1, Math.ceil(words.length / maxChunks))
      const chunks = []
      for (let i = 0; i < words.length; i += wordsPerChunk) {
        chunks.push(words.slice(i, i + wordsPerChunk).join(' ').slice(0, 70))
      }

      if (chunks.length > 0) {
        const chunkDuration = videoDuration / chunks.length
        chunks.forEach((text, idx) => {
          if (!text) return
          const start = idx * chunkDuration
          const end = Math.min(start + chunkDuration, videoDuration)
          const enable = `enable='between(t\\,${start.toFixed(2)}\\,${end.toFixed(2)})'`
          const textWidth = estimateTextWidth(text, captionFontSize, CHAR_WIDTH_RATIO_REG)
          const boxWidth = Math.min(MAX_CAPTION_WIDTH, Math.round(textWidth) + captionPadX * 2)
          const boxX = Math.round((width - boxWidth) / 2)
          captionFilters.push(
            `drawbox=x=${boxX}:y=${captionY - captionPadY}:w=${boxWidth}:h=${captionFontSize + captionPadY * 2}:color=black@0.55:t=fill:${enable}`
          )
          captionFilters.push(
            `drawtext=text='${text}':fontsize=${captionFontSize}:fontcolor=white@0.95:${TEXT_BORDER}:` +
            `fontfile=${FONT_REGULAR}:x=(w-text_w)/2:y=${captionY}:${enable}`
          )
        })
      }
    }

    // ── LAYER 2: DRIFTING STAMP (anti-scrape) ───────────────────────
    // Wander zone tightened from the original spec: right-edge margin
    // widened from 6-10% to 20% of frame width, clearing TikTok's
    // unusually wide right-side icon column (its equivalent is ~2x
    // Meta's). Positions also avoid the top ~20% (now occupied by the
    // badge/title) and the ~0.52-0.65 center band (now occupied by
    // captions) — and can now use lower-frame space the old full-width
    // bottom bar used to occupy.
    const STAMP_PREFIX = 'VozIt! — '
    const STAMP_SUFFIX = 'I was there...'
    const STAMP_TEXT = STAMP_PREFIX + STAMP_SUFFIX
    const stampFontSize = Math.max(12, Math.round(height * 0.017))
    const stampTextWidth = Math.round(STAMP_TEXT.length * stampFontSize * CHAR_WIDTH_RATIO_REG)
    const stampPrefixWidth = Math.round(STAMP_PREFIX.length * stampFontSize * CHAR_WIDTH_RATIO_REG)
    const stampPadX = Math.round(stampFontSize * 0.45)
    const stampPadY = Math.round(stampFontSize * 0.3)
    const stampBoxW = stampTextWidth + stampPadX * 2
    const stampBoxH = stampFontSize + stampPadY * 2

    const positions = [
      { x: Math.round(width * 0.08), y: Math.round(height * 0.26) },
      { x: Math.round(width - stampTextWidth - width * 0.20), y: Math.round(height * 0.30) },
      { x: Math.round(width * 0.10), y: Math.round(height * 0.42) },
      { x: Math.round(width - stampTextWidth - width * 0.20), y: Math.round(height * 0.46) },
      { x: Math.round(width * 0.08), y: Math.round(height * 0.72) },
      { x: Math.round(width - stampTextWidth - width * 0.20), y: Math.round(height * 0.76) },
      { x: Math.round(width * 0.08), y: Math.round(height * 0.84) },
    ]
    // Drift interval widened from 4s to 8s: every drawtext filter in this
    // chain gets evaluated on every single frame regardless of whether its
    // enable=between(...) window is active, so halving the stamp count
    // (≈23 → ≈12 for a 90s clip) meaningfully cuts per-frame cost. This
    // was a real, measured contributor to encodes running slow enough to
    // get killed by the caller's timeout — still drifts often enough for
    // the original anti-scrape intent.
    const STAMP_INTERVAL = 8
    const stampFilters = []
    for (let t = 0; t < videoDuration; t += STAMP_INTERVAL) {
      const pos = positions[Math.floor(t / STAMP_INTERVAL) % positions.length]
      const tEnd = Math.min(t + STAMP_INTERVAL, videoDuration)
      const enable = `enable='between(t\\,${t}\\,${tEnd})'`
      stampFilters.push(
        `drawbox=x=${pos.x - stampPadX}:y=${pos.y - stampPadY}:w=${stampBoxW}:h=${stampBoxH}:color=0xFE3D07@0.18:t=fill:${enable}`
      )
      stampFilters.push(
        `drawtext=text='${STAMP_PREFIX}':fontsize=${stampFontSize}:fontcolor=white@0.50:` +
        `fontfile=${FONT_REGULAR}:x=${pos.x}:y=${pos.y}:${enable}`
      )
      stampFilters.push(
        `drawtext=text='${STAMP_SUFFIX}':fontsize=${stampFontSize}:fontcolor=white@0.50:` +
        `fontfile=${FONT_ITALIC}:x=${pos.x + stampPrefixWidth}:y=${pos.y}:${enable}`
      )
    }

    const mainFilter = [
      ...badgeFilters,
      ...titleFilters,
      ...captionFilters,
      ...stampFilters,
    ].join(',')

    // 'veryfast' instead of 'fast' — this is the full-length pass (the
    // end-card pass below stays on 'fast', it's only 1.5s either way and
    // isn't a real contributor to total time). A faster preset trades a
    // bit of compression efficiency for real wall-clock time, which is
    // what actually matters here: an encode that finishes reliably
    // inside the caller's timeout beats a marginally smaller file that
    // sometimes gets killed mid-job.
    // Phone recordings are commonly variable-frame-rate — ffprobe on a
    // finished file showed its actual duration as ~117s against a ~92s
    // source+end-card total, and the encode logs were quietly climbing a
    // "dup=" (duplicate frame) counter the whole time. Without an
    // explicit output rate, FFmpeg has to guess how to lay VFR input
    // onto the fixed timeline the text-overlay filters need (their
    // between(t,...) windows depend on a clean, predictable t), and
    // guessed wrong — stretching the timeline and inserting duplicate
    // frames to compensate. -r 30 -vsync cfr forces a constant, known
    // frame rate instead of leaving that to chance.
    // -level 4.2: without an explicit level, libx264 auto-picks the
    // lowest one that technically fits the output — for a 1080x1920 @
    // 30fps portrait video (the common case here), that lands on level
    // 4.0, which caps out at 245,760 macroblocks/sec. This video needs
    // 244,800 — 99.6% of that ceiling. Lenient software decoders
    // (ffprobe, this worker's own verification checks) don't enforce the
    // cap and play it back fine; strict ones, which real phone and
    // browser decoders generally are, are within spec to reject a stream
    // sitting right on its level's edge outright. That's consistent with
    // every symptom seen so far: passes every structural/decode check
    // this worker can run, still won't play on an actual device. Level
    // 4.2 raises the ceiling to 522,240 — real headroom instead of a
    // knife's edge — and is still supported by effectively every phone
    // and browser in use.
    await execFileAsync('ffmpeg', [
      '-y', '-i', inputPath,
      '-vf', mainFilter,
      '-r', '30', '-vsync', 'cfr',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-level', '4.2',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
      '-movflags', '+faststart',
      preConcatPath,
      // Raised from 240s — the worker now stays running continuously
      // (fly.toml min_machines_running=1) instead of being at risk of
      // getting stopped mid-job, so there's no longer a reason to cut
      // this off tightly. This is just a safety ceiling against a
      // genuinely hung process, not a budget to encode within.
    ], { timeout: 600_000, maxBuffer: 1024 * 1024 * 20 })

    // 3. End card (Layer 3) — 1.5s orange bumper, rendered with a
    // matching silent audio track so the concat step below doesn't
    // choke on mismatched stream layouts.
    //
    // Previously overlaid the actual app icon image (logo.png) here.
    // Reported directly, comparing side by side against the DOM-overlay
    // end card (ReportDetailClient.tsx's Layer 3, which never went
    // through this worker): that one draws bold "VozIt!" WORD TEXT, not
    // an icon — a different, simpler look this never matched. Switched
    // to text so the baked-in end card actually looks like the design
    // it was meant to mirror, and dropped the logo image input/overlay
    // step entirely since nothing here needs it anymore.
    const fontSizeEnd = Math.max(20, Math.round(height * 0.035))
    const brandSizeEnd = Math.max(28, Math.round(height * 0.045))
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', `color=c=0xFE3D07:size=${width}x${height}:duration=1.5:rate=30`,
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-vf',
      `drawtext=text='VozIt!':fontsize=${brandSizeEnd}:fontcolor=white:fontfile=${FONT_BOLD}:` +
        `x=(w-text_w)/2:y=(h/2)-${Math.round(brandSizeEnd * 1.2)},` +
      `drawtext=text='I was there...':fontsize=${fontSizeEnd}:fontcolor=white@0.92:fontfile=${FONT_ITALIC}:` +
        `x=(w-text_w)/2:y=(h/2)+${Math.round(brandSizeEnd * 0.3)},` +
      `drawtext=text='vozit.net':fontsize=${Math.round(fontSizeEnd * 0.6)}:fontcolor=white@0.4:fontfile=${FONT_REGULAR}:` +
        `x=(w-text_w)/2:y=(h/2)+${Math.round(brandSizeEnd * 0.3) + Math.round(fontSizeEnd * 1.6)}`,
      '-map', '0:v', '-map', '1:a',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-level', '4.2',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
      '-shortest', '-t', '1.5',
      endCardPath,
    ], { timeout: 60_000, maxBuffer: 1024 * 1024 * 20 })

    // 4. Concatenate main + end card
    // Previously used "-c copy" here (a pure stream splice, no decoding).
    // NOTE: an earlier version of this comment blamed that on an invalid
    // "reserved" color_transfer tag found on the spliced output — that
    // turned out to be a red herring; the same tag is present on the raw
    // Mux source and on freshly re-encoded output alike, so it's just an
    // iPhone metadata quirk ffprobe doesn't have a name for, not a sign
    // of damage. The real, confirmed-separate issue (see -level 4.2
    // above) is that neither segment's encode declared an explicit H.264
    // level, leaving strict device decoders a legitimate reason to
    // reject the file regardless of how it's joined. Re-encoding at this
    // step is kept anyway — concatenating two independently-encoded
    // segments via a raw stream copy is still fragile on general
    // principle (e.g. mismatched encoder settings), and +faststart here
    // ensures the moov atom lands at the front of the final file
    // regardless of what the two inputs did.
    await fs.writeFile(concatListPath, `file '${preConcatPath}'\nfile '${endCardPath}'\n`)
    await execFileAsync('ffmpeg', [
      '-y', '-f', 'concat', '-safe', '0', '-i', concatListPath,
      '-r', '30', '-vsync', 'cfr',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-level', '4.2',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
      '-movflags', '+faststart',
      outputPath,
    ], { timeout: 600_000, maxBuffer: 1024 * 1024 * 20 })

    // 5. Upload to Supabase Storage (public bucket) and hand back the URL.
    // Each run gets its own never-before-seen filename instead of reusing
    // (and overwriting) the same `${reportId}.mp4` path every time. Found
    // by direct testing: Supabase's storage CDN caches Range sub-requests
    // (what every video player actually issues to start playback)
    // separately and far more aggressively than whole-file requests, and
    // that cache isn't reliably invalidated just because the underlying
    // object was overwritten with upsert. A report that's been
    // reprocessed more than once — exactly the case while debugging this
    // pipeline — could keep serving stale cached bytes from an earlier,
    // broken version at the old URL indefinitely. A fresh path per run
    // sidesteps the whole problem instead of depending on cache
    // invalidation working correctly.
    const fileBuffer = await fs.readFile(outputPath)
    const storagePath = `watermarked/${reportId}-${Date.now()}.mp4`
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, { contentType: 'video/mp4', upsert: true })
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath)

    // 6. Write the result straight to the report row ourselves, instead of
    // relying solely on the caller (mux-webhook.ts) to do it after getting
    // our HTTP response back. A full job here can take minutes — if the
    // caller's own connection/timeout gives up before we're done (which
    // kept happening in testing), the old design meant a successful
    // upload could still never make it into the database: nothing else
    // was going to write it. This makes the result durable the moment
    // it's ready, regardless of whether anyone's still listening for the
    // HTTP response. Still returns the same response below too, so the
    // caller gets an immediate update on the fast path when it's around
    // to receive it.
    const { error: dbError } = await supabase.from('reports').update({
      watermarked_url: pub.publicUrl,
      watermark_applied: true,
    }).eq('id', reportId)
    if (dbError) console.error('[watermark-worker] uploaded file but failed to update report row', reportId, dbError)

    console.log('[watermark-worker] processing succeeded', reportId, pub.publicUrl)
    res.json({ success: true, watermarkedUrl: pub.publicUrl })
  } catch (e) {
    console.error('[watermark-worker] processing failed', reportId, e)
    res.status(500).json({ success: false, error: e.message })
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`[watermark-worker] listening on ${PORT}`))
