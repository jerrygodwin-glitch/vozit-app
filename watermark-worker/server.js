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
  if (!WORKER_SECRET || req.headers['x-worker-secret'] !== WORKER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!supabase) {
    return res.status(500).json({ error: 'Worker missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' })
  }

  const { reportId, playbackId, username, tier, duration } = req.body || {}
  const width = Number(req.body?.width) || 1920
  const height = Number(req.body?.height) || 1080
  const videoDuration = Number(duration) || 90

  if (!reportId || !playbackId) {
    return res.status(400).json({ error: 'reportId and playbackId required' })
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
    const sourceUrl = `https://stream.mux.com/${playbackId}/high.mp4`
    const videoRes = await fetch(sourceUrl)
    if (!videoRes.ok) throw new Error(`Could not fetch source video from Mux (${videoRes.status})`)
    await fs.writeFile(inputPath, Buffer.from(await videoRes.arrayBuffer()))

    // Strip anything that could break out of an FFmpeg drawtext filter
    // string (colons, quotes, commas, backslashes all have special meaning
    // there) — usernames are already sanitized at registration, but the
    // worker shouldn't trust that alone.
    const safeUsername = String(username || 'reporter').replace(/['":,\\]/g, '').slice(0, 40)
    const tierLabel = `★ ${TIER_LABELS[tier] || 'Starter'}`

    // 2. Bottom bar (Layer 1) + drifting stamp (Layer 2), applied to the
    // main video as one filter chain.
    const barHeight = Math.max(36, Math.round(height * 0.05))
    const fontSize = Math.max(14, Math.round(height * 0.02))

    const positions = [
      { x: 'iw*0.08', y: 'ih*0.15' }, { x: 'iw-text_w-iw*0.10', y: 'ih*0.22' },
      { x: 'iw*0.15', y: 'ih*0.40' }, { x: 'iw-text_w-iw*0.06', y: 'ih*0.45' },
      { x: 'iw*0.40', y: 'ih*0.12' }, { x: 'iw*0.30', y: 'ih*0.38' },
      { x: 'iw-text_w-iw*0.22', y: 'ih*0.18' },
    ]
    const stampFilters = []
    for (let t = 0; t < videoDuration; t += 4) {
      const pos = positions[Math.floor(t / 4) % positions.length]
      const tEnd = Math.min(t + 4, videoDuration)
      stampFilters.push(
        `drawtext=text='VozIt! — I was there...':fontsize=${fontSize}:fontcolor=white@0.50:` +
        `fontfile=${FONT_REGULAR}:x=${pos.x}:y=${pos.y}:enable='between(t\\,${t}\\,${tEnd})'`
      )
    }

    const mainFilter = [
      `drawbox=x=0:y=ih-${barHeight}:w=iw:h=${barHeight}:color=black@0.55:t=fill`,
      `drawtext=text='VozIt!':fontsize=${fontSize}:fontcolor=0xFE3D07:fontfile=${FONT_BOLD}:` +
        `x=14:y=ih-${barHeight}+${Math.round(barHeight / 2 - fontSize / 2)}`,
      `drawtext=text='\\· @${safeUsername} \\· I was there...':fontsize=${fontSize - 1}:fontcolor=white@0.82:` +
        `fontfile=${FONT_REGULAR}:x=14+tw+10:y=ih-${barHeight}+${Math.round(barHeight / 2 - fontSize / 2)}`,
      `drawtext=text='${tierLabel}':fontsize=${fontSize - 3}:fontcolor=white@0.9:fontfile=${FONT_BOLD}:` +
        `x=iw-tw-14:y=ih-${barHeight}+${Math.round(barHeight / 2 - (fontSize - 3) / 2)}`,
      ...stampFilters,
    ].join(',')

    await execFileAsync('ffmpeg', [
      '-y', '-i', inputPath,
      '-vf', mainFilter,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
      '-movflags', '+faststart',
      preConcatPath,
    ], { timeout: 240_000, maxBuffer: 1024 * 1024 * 20 })

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
    await fs.writeFile(concatListPath, `file '${preConcatPath}'\nfile '${endCardPath}'\n`)
    await execFileAsync('ffmpeg', [
      '-y', '-f', 'concat', '-safe', '0', '-i', concatListPath,
      '-c', 'copy',
      outputPath,
    ], { timeout: 60_000 })

    // 5. Upload to Supabase Storage (public bucket) and hand back the URL
    // — the caller (mux-webhook.ts) is what actually updates the report row.
    const fileBuffer = await fs.readFile(outputPath)
    const storagePath = `watermarked/${reportId}.mp4`
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, { contentType: 'video/mp4', upsert: true })
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath)

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
