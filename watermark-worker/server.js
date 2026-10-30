// VozIt watermark worker — burns the 3-layer design (persistent bottom
// bar, drifting anti-scrape stamp, orange end-card bumper) into published
// videos. Ported from the filter specs in the main app's
// src/lib/watermark.ts, which had the exact design written out as FFmpeg
// filter strings but never actually executed them.
//
// Deliberately kept simpler than the original spec in one place: the
// bottom bar and floating stamp use styled TEXT (no image overlay), which
// matches what viewers already see in the in-app CSS overlay and avoids
// chaining a second image input through the main video's filter graph.
// The end card keeps the real logo image, since that's a bigger, more
// impactful bumper moment worth the extra complexity.
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

  const { reportId, playbackId, username, tier, duration } = req.body || {}
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

    // 2. Bottom bar (Layer 1) + drifting stamp (Layer 2), applied to the
    // main video as one filter chain.
    //
    // ROOT CAUSE of every "Undefined constant or missing '('" crash this
    // feature ever hit, confirmed by direct, isolated testing on the live
    // machine via `fly ssh console` (not guesswork): the drawtext filter's
    // own frame-size variables are w/h (also main_w/main_h) — iw/ih are a
    // *different* filter's variables (drawbox, scale, crop...) and are
    // simply undefined inside drawtext. Every x/y expression below that
    // used iw/ih failed the instant it was evaluated, regardless of how
    // simple or complex the surrounding arithmetic was — confirmed
    // multi-operator chains (including chained subtraction) parse fine
    // once the variable name itself is correct. drawbox two lines down
    // correctly keeps iw/ih — that filter actually defines them.
    const barHeight = Math.max(36, Math.round(height * 0.05))
    const fontSize = Math.max(14, Math.round(height * 0.02))

    // Reported directly, comparing against the DOM-overlay version: that
    // one wraps this same text in a faint orange backing box
    // (rgba(254,61,7,0.18), padded, rounded corners) — the baked-in
    // version only ever drew bare text with nothing behind it, which is
    // why it read as "very faint" even at the same text opacity. Adding
    // a matching box here. Positions are now plain computed pixel
    // numbers instead of FFmpeg expressions like "w-text_w-w*0.10" —
    // drawbox has no "text_w" variable to align itself against (that's
    // the same self-reference trap the username/tier bug turned out to
    // be), so the box and the text need a shared, pre-computed position
    // to actually line up, which only works cleanly in JS since this
    // text's content — and therefore its width — never changes.
    // "I was there..." requested in italics here too — split into a
    // regular-weight prefix and an italic suffix, drawn as two adjacent
    // drawtext calls rather than one. Their x positions are computed in
    // JS (prefix's own estimated width decides where the suffix starts)
    // for the same reason the box position above is — no FFmpeg
    // cross-filter reference to lean on.
    const STAMP_PREFIX = 'VozIt! — '
    const STAMP_SUFFIX = 'I was there...'
    const STAMP_TEXT = STAMP_PREFIX + STAMP_SUFFIX
    const STAMP_CHAR_WIDTH_RATIO = 0.54 // DejaVu Sans regular weight, narrower than the Bold ratio used above
    const stampTextWidth = Math.round(STAMP_TEXT.length * fontSize * STAMP_CHAR_WIDTH_RATIO)
    const stampPrefixWidth = Math.round(STAMP_PREFIX.length * fontSize * STAMP_CHAR_WIDTH_RATIO)
    const stampPadX = Math.round(fontSize * 0.45)
    const stampPadY = Math.round(fontSize * 0.3)
    const stampBoxW = stampTextWidth + stampPadX * 2
    const stampBoxH = fontSize + stampPadY * 2

    const positions = [
      { x: Math.round(width * 0.08), y: Math.round(height * 0.15) },
      { x: Math.round(width - stampTextWidth - width * 0.10), y: Math.round(height * 0.22) },
      { x: Math.round(width * 0.15), y: Math.round(height * 0.40) },
      { x: Math.round(width - stampTextWidth - width * 0.06), y: Math.round(height * 0.45) },
      { x: Math.round(width * 0.40), y: Math.round(height * 0.12) },
      { x: Math.round(width * 0.30), y: Math.round(height * 0.38) },
      { x: Math.round(width - stampTextWidth - width * 0.22), y: Math.round(height * 0.18) },
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
        `drawtext=text='${STAMP_PREFIX}':fontsize=${fontSize}:fontcolor=white@0.50:` +
        `fontfile=${FONT_REGULAR}:x=${pos.x}:y=${pos.y}:${enable}`
      )
      stampFilters.push(
        `drawtext=text='${STAMP_SUFFIX}':fontsize=${fontSize}:fontcolor=white@0.50:` +
        `fontfile=${FONT_ITALIC}:x=${pos.x + stampPrefixWidth}:y=${pos.y}:${enable}`
      )
    }

    // THE ACTUAL bug behind the username/tier overlap, found by having
    // FFmpeg itself print the real text_w of each piece of text (not
    // guesswork): the middle text's old position, "x=14+tw+10", was
    // written to mean "14px + the width of 'VozIt!' before it + 10px
    // gap" — but `tw` inside a drawtext filter is that filter's OWN
    // rendered text width, not a preceding filter's. So the middle text
    // was actually positioning itself at (14 + ITS OWN full width + 10),
    // pushing it further right the longer it is, with nothing stopping
    // it from running past the right-aligned tier badge. This was
    // always wrong, for every username — it just never surfaced as a
    // visible bug until contrast/playback were fixed enough to actually
    // see a frame clearly. The tier badge's own "x=w-tw-14" is a
    // DIFFERENT, correct use of the same variable (deliberately
    // self-referential, for right-aligning against its own width).
    //
    // Fix: compute "VozIt!"'s real width and use that literal number to
    // place the middle text, instead of relying on tw to mean something
    // it doesn't. Character-width ratio below (~0.58) is calibrated from
    // FFmpeg's own measured text_w for this exact font/weight, not an
    // assumption — confirmed against three real samples. Still sizes the
    // middle text down (and, as a last resort for an extreme-length
    // username, elides it) if it would run past the tier badge, since
    // usernames are arbitrary length and no fixed size can be safe.
    const CHAR_WIDTH_RATIO = 0.58 // DejaVu Sans Bold, measured via FFmpeg's own text_w debug output
    const estimateTextWidth = (text, size) => text.length * size * CHAR_WIDTH_RATIO
    const tierFontSize = fontSize - 3
    const brandWidth = estimateTextWidth('VozIt!', fontSize)
    const tierWidth = estimateTextWidth(tierLabel, tierFontSize)
    const leftMargin = 14, midGap = 10, tierGap = 14, rightMargin = 14
    const middleStartX = leftMargin + brandWidth + midGap
    const availableForMiddle = width - middleStartX - tierGap - tierWidth - rightMargin

    let middleText = `· @${safeUsername} · I was there...`
    let middleFontSize = fontSize - 1
    const MIN_MIDDLE_FONT = 11
    while (estimateTextWidth(middleText, middleFontSize) > availableForMiddle && middleFontSize > MIN_MIDDLE_FONT) {
      middleFontSize -= 1
    }
    if (estimateTextWidth(middleText, middleFontSize) > availableForMiddle) {
      let trimmed = safeUsername
      while (trimmed.length > 3 && estimateTextWidth(`· @${trimmed}… · I was there...`, middleFontSize) > availableForMiddle) {
        trimmed = trimmed.slice(0, -1)
      }
      middleText = `· @${trimmed}… · I was there...`
    }
    // "I was there..." requested in italics here too — the fitting logic
    // above still treats middleText as one string (the combined width is
    // what actually has to fit, regardless of how it's drawn), but it
    // always ends with this exact suffix, so it can be split safely
    // after sizing is decided. Same reasoning as the drifting stamp
    // above: x positions computed in JS, not a cross-filter tw reference.
    const MIDDLE_SUFFIX = 'I was there...'
    const middlePrefix = middleText.slice(0, middleText.length - MIDDLE_SUFFIX.length)
    const middleSuffixX = Math.round(middleStartX) + Math.round(estimateTextWidth(middlePrefix, middleFontSize))

    // Still reported as hard to read after the black@0.75/bold/opacity
    // pass above, compared against the crisp DOM-overlay version. That
    // earlier fix was verified against a frame pulled straight from the
    // source-resolution file, where it did look legible — the gap is
    // what happens after: video compression softens flat-colored text
    // edges, and a real device then scales the whole frame down further
    // to fit its screen, compounding the softening. A translucent
    // background bar alone can't fully compensate for that. Adding a
    // solid dark outline/stroke directly on the glyphs — the standard
    // technique broadcast captions and subtitles use for exactly this
    // reason — holds up under both compression and scaling in a way
    // background opacity alone doesn't, since it's contrast baked into
    // the letterforms themselves rather than relying on what's visible
    // around them.
    const TEXT_BORDER = `borderw=2:bordercolor=black@0.85`
    const mainFilter = [
      // Bumped from black@0.55: reported directly against a bright
      // outdoor scene (green foliage, white sky) the bar let enough of
      // the video show through that the white text on top washed out —
      // legible as a crisp DOM overlay on-screen, but a compressed video
      // frame has softer edges and needs more contrast margin to read
      // the same way. drawbox correctly keeps iw/ih — that's the filter
      // that actually defines them.
      `drawbox=x=0:y=ih-${barHeight}:w=iw:h=${barHeight}:color=black@0.75:t=fill`,
      `drawtext=text='VozIt!':fontsize=${fontSize}:fontcolor=0xFE3D07:fontfile=${FONT_BOLD}:${TEXT_BORDER}:` +
        `x=14:y=h-${barHeight}+${Math.round(barHeight / 2 - fontSize / 2)}`,
      // No backslash before the middle dot — only :, ' and \ itself are
      // actual FFmpeg drawtext escape characters. A backslash in front of
      // any other character (like the \· this line used to have) isn't a
      // real escape sequence.
      // FONT_BOLD + fuller opacity (was FONT_REGULAR @0.82) — same
      // legibility reasoning as the background bar above. x is now a
      // real computed offset (see middleStartX above), not the broken
      // self-referential tw. Size is whatever the width-fitting above
      // decided. "I was there..." split out into its own italic
      // drawtext — see middlePrefix/middleSuffixX above.
      `drawtext=text='${middlePrefix}':fontsize=${middleFontSize}:fontcolor=white@0.95:${TEXT_BORDER}:` +
        `fontfile=${FONT_BOLD}:x=${Math.round(middleStartX)}:y=h-${barHeight}+${Math.round(barHeight / 2 - middleFontSize / 2)}`,
      `drawtext=text='${MIDDLE_SUFFIX}':fontsize=${middleFontSize}:fontcolor=white@0.95:${TEXT_BORDER}:` +
        `fontfile=${FONT_ITALIC}:x=${middleSuffixX}:y=h-${barHeight}+${Math.round(barHeight / 2 - middleFontSize / 2)}`,
      `drawtext=text='${tierLabel}':fontsize=${tierFontSize}:fontcolor=white@1.0:fontfile=${FONT_BOLD}:${TEXT_BORDER}:` +
        `x=w-tw-14:y=h-${barHeight}+${Math.round(barHeight / 2 - tierFontSize / 2)}`,
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
