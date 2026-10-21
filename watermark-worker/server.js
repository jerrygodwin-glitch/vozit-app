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
    const sourceUrl = `https://stream.mux.com/${playbackId}/highest.mp4`
    const videoRes = await fetch(sourceUrl)
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

    const positions = [
      { x: 'w*0.08', y: 'h*0.15' }, { x: 'w-text_w-w*0.10', y: 'h*0.22' },
      { x: 'w*0.15', y: 'h*0.40' }, { x: 'w-text_w-w*0.06', y: 'h*0.45' },
      { x: 'w*0.40', y: 'h*0.12' }, { x: 'w*0.30', y: 'h*0.38' },
      { x: 'w-text_w-w*0.22', y: 'h*0.18' },
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
      stampFilters.push(
        `drawtext=text='VozIt! — I was there...':fontsize=${fontSize}:fontcolor=white@0.50:` +
        `fontfile=${FONT_REGULAR}:x=${pos.x}:y=${pos.y}:enable='between(t\\,${t}\\,${tEnd})'`
      )
    }

    const mainFilter = [
      // drawbox correctly keeps iw/ih — that's the filter that actually
      // defines them.
      `drawbox=x=0:y=ih-${barHeight}:w=iw:h=${barHeight}:color=black@0.55:t=fill`,
      `drawtext=text='VozIt!':fontsize=${fontSize}:fontcolor=0xFE3D07:fontfile=${FONT_BOLD}:` +
        `x=14:y=h-${barHeight}+${Math.round(barHeight / 2 - fontSize / 2)}`,
      // No backslash before the middle dot — only :, ' and \ itself are
      // actual FFmpeg drawtext escape characters. A backslash in front of
      // any other character (like the \· this line used to have) isn't a
      // real escape sequence.
      `drawtext=text='· @${safeUsername} · I was there...':fontsize=${fontSize - 1}:fontcolor=white@0.82:` +
        `fontfile=${FONT_REGULAR}:x=14+tw+10:y=h-${barHeight}+${Math.round(barHeight / 2 - fontSize / 2)}`,
      `drawtext=text='${tierLabel}':fontsize=${fontSize - 3}:fontcolor=white@0.9:fontfile=${FONT_BOLD}:` +
        `x=w-tw-14:y=h-${barHeight}+${Math.round(barHeight / 2 - (fontSize - 3) / 2)}`,
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
    await execFileAsync('ffmpeg', [
      '-y', '-i', inputPath,
      '-vf', mainFilter,
      '-r', '30', '-vsync', 'cfr',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
      '-movflags', '+faststart',
      preConcatPath,
      // Raised from 240s — the worker now stays running continuously
      // (fly.toml min_machines_running=1) instead of being at risk of
      // getting stopped mid-job, so there's no longer a reason to cut
      // this off tightly. This is just a safety ceiling against a
      // genuinely hung process, not a budget to encode within.
    ], { timeout: 600_000, maxBuffer: 1024 * 1024 * 20 })

    // 3. End card (Layer 3) — 1.5s orange bumper with the real logo,
    // rendered with a matching silent audio track so the concat step
    // below doesn't choke on mismatched stream layouts.
    const logoSize = Math.round(Math.min(width, height) * 0.25)
    const fontSizeEnd = Math.max(20, Math.round(height * 0.035))
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', `color=c=0xFE3D07:size=${width}x${height}:duration=1.5:rate=30`,
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-i', LOGO_PATH,
      '-filter_complex',
      `[2:v]scale=${logoSize}:${logoSize}[logo];` +
      `[0:v][logo]overlay=(W-w)/2:(H-h)/2-${Math.round(fontSizeEnd * 0.8)}[bg];` +
      `[bg]drawtext=text='I was there...':fontsize=${fontSizeEnd}:fontcolor=white@0.92:fontfile=${FONT_ITALIC}:` +
        `x=(w-text_w)/2:y=(h/2)+${Math.round(logoSize / 2)}+${Math.round(fontSizeEnd * 0.3)}[t1];` +
      `[t1]drawtext=text='vozit.app':fontsize=${Math.round(fontSizeEnd * 0.6)}:fontcolor=white@0.4:fontfile=${FONT_REGULAR}:` +
        `x=(w-text_w)/2:y=(h/2)+${Math.round(logoSize / 2)}+${Math.round(fontSizeEnd * 1.8)}[vout]`,
      '-map', '[vout]', '-map', '1:a',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
      '-shortest', '-t', '1.5',
      endCardPath,
    ], { timeout: 60_000, maxBuffer: 1024 * 1024 * 20 })

    // 4. Concatenate main + end card
    // Confirmed via a direct byte-level check of an uploaded file (ftyp
    // immediately followed by mdat, no moov in the first 64KB — "Jerry
    // reported "disabled and cannot be played back""): -movflags
    // +faststart on the two inputs above doesn't carry through the
    // concat step. -c copy re-muxes into a brand-new container, and
    // FFmpeg's MP4 muxer defaults to writing moov (the index every
    // player needs before it can start playback) at the END of the file
    // unless this output is ALSO told to use +faststart — so despite
    // both inputs being correctly fast-started, the final concatenated
    // file that actually gets uploaded wasn't.
    await fs.writeFile(concatListPath, `file '${preConcatPath}'\nfile '${endCardPath}'\n`)
    await execFileAsync('ffmpeg', [
      '-y', '-f', 'concat', '-safe', '0', '-i', concatListPath,
      '-c', 'copy', '-movflags', '+faststart',
      outputPath,
    ], { timeout: 60_000 })

    // 5. Upload to Supabase Storage (public bucket) and hand back the URL.
    const fileBuffer = await fs.readFile(outputPath)
    const storagePath = `watermarked/${reportId}.mp4`
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
