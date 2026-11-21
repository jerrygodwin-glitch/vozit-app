// @ts-nocheck
// Telegram-specific Bot API helpers. Shared cross-channel logic (templates,
// language detection, report creation) lives in bot-common.ts instead.
import { captureError } from './monitoring'

const API_BASE = 'https://api.telegram.org'

// Telegram's standard (non-self-hosted) Bot API refuses to let a bot
// download any file over 20MB via getFile, regardless of how it was sent —
// this is a hard platform limit, not something VozIt's code controls. A
// 61-90s video sent as a true, uncompressed FILE (which the bot explicitly
// asks reporters to do, for metadata/quality reasons) can easily exceed
// this, which is a real tension worth knowing about: the more a reporter
// follows the "send as File" instruction, the more likely they are to hit
// this ceiling. There is no code-side fix short of running a self-hosted
// Bot API server (a real infrastructure change, not in scope here).
export const TELEGRAM_FILE_SIZE_LIMIT = 20 * 1024 * 1024

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN not configured')
  return t
}

export async function sendMessage(chatId: string | number, text: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/bot${token()}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch (e) {
    captureError(e, { fn: 'telegram sendMessage', chatId })
  }
}

export interface TelegramFile {
  buffer: Buffer
  mimeType: string
  fileSize: number
}

// Downloads a file from Telegram's servers by file_id. Returns null (and
// sends nothing itself — the caller decides what to tell the reporter) if
// the file is over Telegram's 20MB bot-download limit, or if the download
// otherwise fails.
export async function getFile(fileId: string, declaredSize?: number): Promise<TelegramFile | { tooLarge: true } | null> {
  if (declaredSize && declaredSize > TELEGRAM_FILE_SIZE_LIMIT) return { tooLarge: true }

  try {
    const metaRes = await fetch(`${API_BASE}/bot${token()}/getFile?file_id=${encodeURIComponent(fileId)}`)
    const meta = await metaRes.json()
    if (!meta.ok || !meta.result?.file_path) return null
    if (meta.result.file_size && meta.result.file_size > TELEGRAM_FILE_SIZE_LIMIT) return { tooLarge: true }

    const fileRes = await fetch(`${API_BASE}/file/bot${token()}/${meta.result.file_path}`)
    if (!fileRes.ok) return null
    const arrayBuffer = await fileRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = meta.result.file_path.split('.').pop()?.toLowerCase()
    const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4'
    return { buffer, mimeType, fileSize: buffer.length }
  } catch (e) {
    captureError(e, { fn: 'telegram getFile', fileId })
    return null
  }
}

export interface ExtractedVideoMetadata {
  // null, not 0, when Telegram's message object didn't report a duration —
  // true for every message.document (file) submission, since Telegram only
  // includes `duration` on the compressed message.video type. Treating that
  // as 0 would reject every single "send as File" submission as "too
  // short," which is exactly the submission method the bot asks reporters
  // to use. Callers must fall back to parseMp4Duration() on the downloaded
  // bytes when this is null.
  durationSeconds: number | null
  width?: number
  height?: number
  fileSizeBytes?: number
  mimeType?: string
  originalFilename?: string
}

// Reads whatever metadata Telegram itself already reports on the message
// object (message.video or message.document). Real device-level GPS/EXIF
// extraction from arbitrary video bytes needs a binary tool (ffprobe/
// exiftool) that isn't installed in this serverless environment, and
// Telegram's own API doesn't expose that data even for "sent as file"
// uploads. "metadata_quality: full" (see bot-common.ts's
// credibilityModifier) reflects that the ORIGINAL FILE BYTES were preserved
// un-recompressed, not that GPS/EXIF was actually read out of them — the
// location data VozIt actually stores for a bot submission comes from the
// reporter's explicit Telegram location share (message.location), asked for
// separately in the webhook flow, same as any other channel that can't read
// a phone's own sensors directly.
export function extractVideoMetadata(message: any): ExtractedVideoMetadata | null {
  const media = message.video || message.document
  if (!media) return null
  return {
    durationSeconds: message.video?.duration ?? null,
    width: media.width,
    height: media.height,
    fileSizeBytes: media.file_size,
    mimeType: media.mime_type,
    originalFilename: message.document?.file_name,
  }
}

// Reads a video's real duration directly out of its own MP4/MOV container
// (the 'moov' -> 'mvhd' box, per ISO/IEC 14496-12) — needed because
// Telegram's Bot API simply doesn't report duration for files sent as a
// document. Pure buffer parsing, no binary dependency; returns null rather
// than throwing on anything malformed/unexpected, since this runs on
// arbitrary user-uploaded bytes in a public webhook.
export function parseMp4Duration(buf: Buffer): number | null {
  try {
    function readBoxHeader(start: number): { type: string; size: number; headerSize: number } | null {
      if (start + 8 > buf.length) return null
      let size = buf.readUInt32BE(start)
      const type = buf.toString('ascii', start + 4, start + 8)
      let headerSize = 8
      if (size === 1) {
        if (start + 16 > buf.length) return null
        size = Number(buf.readBigUInt64BE(start + 8))
        headerSize = 16
      } else if (size === 0) {
        size = buf.length - start
      }
      if (size <= 0) return null
      return { type, size, headerSize }
    }
    function findBox(type: string, rangeStart: number, rangeEnd: number) {
      let pos = rangeStart
      while (pos < rangeEnd) {
        const box = readBoxHeader(pos)
        if (!box) break
        if (box.type === type) return { start: pos, ...box }
        pos += box.size
      }
      return null
    }
    const moov = findBox('moov', 0, buf.length)
    if (!moov) return null
    const mvhd = findBox('mvhd', moov.start + moov.headerSize, moov.start + moov.size)
    if (!mvhd) return null
    const payloadStart = mvhd.start + mvhd.headerSize
    const version = buf.readUInt8(payloadStart)
    let timescale: number, duration: number
    if (version === 1) {
      timescale = buf.readUInt32BE(payloadStart + 20)
      duration = Number(buf.readBigUInt64BE(payloadStart + 24))
    } else {
      timescale = buf.readUInt32BE(payloadStart + 12)
      duration = buf.readUInt32BE(payloadStart + 16)
    }
    if (!timescale) return null
    return duration / timescale
  } catch {
    return null
  }
}
