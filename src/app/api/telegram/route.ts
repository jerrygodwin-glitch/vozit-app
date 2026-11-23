// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { captureError } from '@/lib/monitoring'
import { sendMessage, getFile, extractVideoMetadata, parseMp4Duration, TELEGRAM_FILE_SIZE_LIMIT } from '@/lib/telegram-bot'
import {
  T, BotLanguage, languageFromChoice, detectLanguage, translateToEnglish,
  validateVideoDuration, createReportFromBot, createAccountFromBot, uploadVideoToMux,
  generateBotLoginLink,
} from '@/lib/bot-common'

// Telegram webhook endpoint — lets reporters in conflict zones or on low
// bandwidth submit a full report entirely through a chat conversation
// instead of the website. A single stateless HTTP call per message is all
// Telegram gives a webhook, so all conversation progress lives in the
// `telegram_sessions` table (see supabase_migration_telegram_bot.sql),
// keyed by chat_id, and is read/written on every request.

type SessionStep =
  | 'awaiting_language' | 'awaiting_name' | 'awaiting_username' | 'awaiting_email'
  | 'awaiting_video' | 'awaiting_description' | 'awaiting_location' | 'awaiting_when'

interface SessionData {
  language?: BotLanguage
  name?: string
  username?: string
  email?: string
  pendingVideo?: {
    muxUploadId: string
    durationSeconds: number
    fileSizeBytes: number
    mimeType: string
    originalFilename?: string
    submissionChannel: 'telegram'
    metadataQuality: 'full' | 'partial'
    caption?: string
    rawCaption?: string
    rawLanguage?: string
  }
  description?: string
  locationLat?: number
  locationLng?: number
}

async function getSession(admin: any, chatId: string): Promise<{ step: SessionStep | null; data: SessionData }> {
  const { data } = await admin.from('telegram_sessions').select('step, data').eq('chat_id', chatId).single()
  if (!data) return { step: null, data: {} }
  return { step: data.step, data: data.data || {} }
}

async function saveSession(admin: any, chatId: string, step: SessionStep | null, data: SessionData) {
  await admin.from('telegram_sessions').upsert({
    chat_id: chatId, step, data, updated_at: new Date().toISOString(),
  }, { onConflict: 'chat_id' })
}

async function clearSession(admin: any, chatId: string) {
  await admin.from('telegram_sessions').delete().eq('chat_id', chatId)
}

async function findUserByTelegramId(admin: any, telegramId: string) {
  const { data } = await admin.from('users').select('id, username, telegram_language, email').eq('telegram_id', telegramId).single()
  return data || null
}

function t(lang: BotLanguage | undefined, key: string, ...args: any[]): string {
  const dict = T[lang || 'en']
  const entry = dict[key] ?? T.en[key]
  return typeof entry === 'function' ? entry(...args) : entry
}

// Handles a freshly-received video or document message: validates its
// duration (using Telegram's own field when present, otherwise parsing the
// MP4/MOV container directly — see telegram-bot.ts for why), downloads it,
// and pushes it to Mux. Returns the data to stash on the session, or sends
// the appropriate rejection message itself and returns null.
async function receiveVideo(chatId: string, lang: BotLanguage | undefined, message: any) {
  const isDocument = !!message.document
  const media = message.video || message.document
  const meta = extractVideoMetadata(message)
  if (!meta) return null

  if (meta.fileSizeBytes && meta.fileSizeBytes > TELEGRAM_FILE_SIZE_LIMIT) {
    await sendMessage(chatId, t(lang, 'fileTooLarge'))
    return null
  }

  const file = await getFile(media.file_id, meta.fileSizeBytes)
  if (!file) {
    await sendMessage(chatId, t(lang, 'genericError'))
    return null
  }
  if ('tooLarge' in file) {
    await sendMessage(chatId, t(lang, 'fileTooLarge'))
    return null
  }

  let durationSeconds = meta.durationSeconds
  if (durationSeconds == null) durationSeconds = parseMp4Duration(file.buffer)
  if (durationSeconds == null) {
    // Still unknown — don't silently accept an un-validatable video; Mux's
    // own webhook will record the true duration regardless, but the 61-90s
    // rule is meant to be enforced up front, same as the website.
    await sendMessage(chatId, t(lang, 'genericError'))
    return null
  }

  const durationCheck = validateVideoDuration(durationSeconds)
  if (durationCheck === 'too_short') {
    await sendMessage(chatId, t(lang, 'tooShort', Math.round(durationSeconds)))
    return null
  }
  if (durationCheck === 'too_long') {
    await sendMessage(chatId, t(lang, 'tooLong', Math.round(durationSeconds)))
    return null
  }

  if (!isDocument) {
    await sendMessage(chatId, t(lang, 'sentAsVideoWarning'))
  }

  const uploadResult = await uploadVideoToMux(file.buffer, file.mimeType)
  if ('error' in uploadResult) {
    await sendMessage(chatId, t(lang, 'genericError'))
    return null
  }

  return {
    muxUploadId: uploadResult.uploadId,
    durationSeconds,
    fileSizeBytes: file.fileSize,
    mimeType: file.mimeType,
    originalFilename: meta.originalFilename,
    submissionChannel: 'telegram' as const,
    metadataQuality: (isDocument ? 'full' : 'partial') as const,
    caption: message.caption || '',
  }
}

// Finishes a report once every piece (video, description, location/when) is
// in hand. Creates the Supabase report row via the same auto-moderation
// pipeline the website uses (createReportFromBot — see bot-common.ts for
// why this is NOT a 'pending_review'/manual-review concept) and lets the
// existing /api/mux-webhook pipeline take it from there (AI 5W analysis,
// video moderation, watermarking, auto-distribution) exactly like a website
// upload, once Mux finishes processing the video.
async function finalizeReport(admin: any, chatId: string, userId: string, lang: BotLanguage | undefined, data: SessionData) {
  const pv = data.pendingVideo!
  const descriptionEn = data.description
    ? await translateToEnglish(data.description, data.pendingVideo?.rawLanguage || lang || 'en')
    : ''

  const result = await createReportFromBot({
    userId,
    title: descriptionEn.slice(0, 80) || 'VozIt report via Telegram',
    what: descriptionEn,
    // No separate free-text "where" answer is collected in this flow (the
    // location share covers it) — createReportFromBot already falls back
    // to a plain "lat, lng" string when locationLat/Lng are set and no
    // locationName/whereText is given, same fallback the website uses.
    locationLat: data.locationLat ?? null,
    locationLng: data.locationLng ?? null,
    whenHappened: undefined,
    muxUploadId: pv.muxUploadId,
    submissionChannel: 'telegram',
    metadataQuality: pv.metadataQuality,
    reportedTimestamp: data.whenText,
    deviceInfo: pv.mimeType,
    originalFilename: pv.originalFilename,
    reportMetadata: { fileSizeBytes: pv.fileSizeBytes, durationSeconds: pv.durationSeconds, telegramCaption: pv.caption },
  } as any)

  await clearSession(admin, chatId)

  if ('error' in result) {
    await sendMessage(chatId, t(lang, 'genericError'))
    return
  }
  if (result.status === 'published') await sendMessage(chatId, t(lang, 'processing'))
  else if (result.status === 'flagged') await sendMessage(chatId, t(lang, 'reportFlagged'))
  else await sendMessage(chatId, t(lang, 'reportRemoved'))
}

export async function POST(req: NextRequest) {
  try {
    // Telegram lets a webhook be registered with a secret_token (via
    // setWebhook) that it then echoes back on every call as this header —
    // optional here (only enforced once configured), same pattern as this
    // codebase's Mux webhook signature check, so it doesn't block initial
    // setup/testing before Jerry has registered one.
    if (process.env.TELEGRAM_WEBHOOK_SECRET) {
      const got = req.headers.get('x-telegram-bot-api-secret-token')
      if (got !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'invalid secret token' }, { status: 401 })
      }
    } else if (process.env.NODE_ENV === 'production') {
      // Fails closed in production — a missing secret must never silently
      // skip verification, only local/dev setup gets that pass.
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const update = await req.json()
    const message = update.message
    if (!message) return NextResponse.json({ ok: true })

    const chatId = String(message.chat.id)
    const telegramId = String(message.from?.id || '')
    const admin = createAdminClient()

    const { step, data } = await getSession(admin, chatId)
    const existingUser = await findUserByTelegramId(admin, telegramId)
    // A returning reporter's session (and the language choice in it) is
    // cleared the moment their previous report finishes — without this
    // fallback they'd silently get English again on every new conversation
    // despite having picked another language before, since nothing else
    // remembers that choice across separate reports.
    let lang: BotLanguage | undefined = data.language || existingUser?.telegram_language

    // ── A location share, whenever it arrives while we're waiting for one ──
    if (message.location && step === 'awaiting_location') {
      const newData = { ...data, locationLat: message.location.latitude, locationLng: message.location.longitude }
      await saveSession(admin, chatId, 'awaiting_when', newData)
      await sendMessage(chatId, t(lang, 'askWhen'))
      return NextResponse.json({ ok: true })
    }

    // ── A video or file, whenever it arrives ──────────────────────────────
    if (message.video || message.document) {
      const received = await receiveVideo(chatId, lang, message)
      if (!received) return NextResponse.json({ ok: true }) // rejection message already sent

      if (!lang && received.caption) {
        const detected = await detectLanguage(received.caption)
        received.rawLanguage = detected
      }

      if (existingUser) {
        // Returning reporter — straight into description/location/when.
        await sendMessage(chatId, t(lang, 'returningGreeting', existingUser.username))
        if (received.caption) {
          await saveSession(admin, chatId, 'awaiting_location', { ...data, pendingVideo: received, description: received.caption })
          await sendMessage(chatId, t(lang, 'askLocation'))
        } else {
          await saveSession(admin, chatId, 'awaiting_description', { ...data, pendingVideo: received })
          await sendMessage(chatId, t(lang, 'askDescription'))
        }
        return NextResponse.json({ ok: true })
      }

      // First-time reporter — stash the video, run the language → name →
      // username → email flow, and come back to finish it once the account
      // exists (see the awaiting_email branch below).
      await saveSession(admin, chatId, 'awaiting_language', { ...data, pendingVideo: received })
      await sendMessage(chatId, t(lang, 'chooseLanguage'))
      return NextResponse.json({ ok: true })
    }

    const text: string = message.text || ''

    // ── /payouts and /profile — always available, regardless of step ──
    // These hand an existing reporter a fresh one-time sign-in link to the
    // website (see generateBotLoginLink in bot-common.ts), so "visit the
    // payouts page" never means "log in with a password you don't have."
    // Always available rather than only right after signup, since an
    // expired link's whole recovery path is just asking again.
    const commandMatch = text.trim().match(/^\/(payouts|profile)\b/i)
    if (commandMatch && existingUser) {
      const isPayouts = commandMatch[1].toLowerCase() === 'payouts'
      if (!existingUser.email) {
        await sendMessage(chatId, t(lang, 'linkGenFailed'))
        return NextResponse.json({ ok: true })
      }
      const linkResult = await generateBotLoginLink({
        email: existingUser.email,
        redirectPath: isPayouts ? '/payouts' : '/settings',
      })
      if ('error' in linkResult) {
        await sendMessage(chatId, t(lang, 'linkGenFailed'))
      } else {
        await sendMessage(chatId, isPayouts ? t(lang, 'payoutsLinkMsg', linkResult.url) : t(lang, 'settingsLinkMsg', linkResult.url))
      }
      return NextResponse.json({ ok: true })
    }

    switch (step) {
      case 'awaiting_language': {
        const chosen = languageFromChoice(text)
        if (!chosen) {
          await sendMessage(chatId, t(lang, 'chooseLanguage'))
          return NextResponse.json({ ok: true })
        }
        lang = chosen
        if (existingUser) {
          await saveSession(admin, chatId, data.pendingVideo ? 'awaiting_description' : 'awaiting_video', { ...data, language: chosen })
          await sendMessage(chatId, data.pendingVideo ? t(lang, 'askDescription') : t(lang, 'noVideoYet'))
        } else {
          await saveSession(admin, chatId, 'awaiting_name', { ...data, language: chosen })
          await sendMessage(chatId, t(lang, 'welcome'))
        }
        return NextResponse.json({ ok: true })
      }

      case 'awaiting_name': {
        await saveSession(admin, chatId, 'awaiting_username', { ...data, name: text.trim().slice(0, 100) })
        await sendMessage(chatId, t(lang, 'askUsername'))
        return NextResponse.json({ ok: true })
      }

      case 'awaiting_username': {
        await saveSession(admin, chatId, 'awaiting_email', { ...data, username: text.trim().slice(0, 30) })
        await sendMessage(chatId, t(lang, 'askEmail'))
        return NextResponse.json({ ok: true })
      }

      case 'awaiting_email': {
        const email = text.trim().slice(0, 254)
        const accountResult = await createAccountFromBot({
          email, username: data.username || '', displayName: data.name || data.username || 'VozIt reporter', telegramId,
          language: lang,
        })
        if ('error' in accountResult) {
          await sendMessage(chatId, t(lang, 'accountCreateFailed'))
          return NextResponse.json({ ok: true })
        }
        // Degrades to a plain-text mention (no live link) only if link
        // generation itself fails — never blocks account creation on it.
        const linkResult = await generateBotLoginLink({ email, redirectPath: '/payouts' })
        const payoutsLink = 'url' in linkResult ? linkResult.url : 'https://www.vozit.net/payouts'
        await sendMessage(chatId, t(lang, 'accountCreated', data.username, payoutsLink))

        if (data.pendingVideo) {
          if (data.pendingVideo.caption) {
            await saveSession(admin, chatId, 'awaiting_location', { ...data, email, description: data.pendingVideo.caption })
            await sendMessage(chatId, t(lang, 'askLocation'))
          } else {
            await saveSession(admin, chatId, 'awaiting_description', { ...data, email })
            await sendMessage(chatId, t(lang, 'askDescription'))
          }
        } else {
          await saveSession(admin, chatId, 'awaiting_video', { ...data, email })
          await sendMessage(chatId, t(lang, 'noVideoYet'))
        }
        return NextResponse.json({ ok: true })
      }

      case 'awaiting_description': {
        await saveSession(admin, chatId, 'awaiting_location', { ...data, description: text.trim().slice(0, 2000) })
        await sendMessage(chatId, t(lang, 'askLocation'))
        return NextResponse.json({ ok: true })
      }

      case 'awaiting_location': {
        // A text reply here (instead of an actual location share) is taken
        // as "not sharing it" — forcing the issue would be a real problem
        // for a reporter in a conflict zone who has good reason not to,
        // and credibilityModifier() already accounts for this (-3, not a
        // hard block) rather than treating it as required.
        await sendMessage(chatId, t(lang, 'credibilityTip'))
        await saveSession(admin, chatId, 'awaiting_when', data)
        await sendMessage(chatId, t(lang, 'askWhen'))
        return NextResponse.json({ ok: true })
      }

      case 'awaiting_when': {
        const userId = existingUser?.id
        if (!userId) {
          // Shouldn't happen (account is created before this step is ever
          // reachable), but never silently drop a video if it does.
          await sendMessage(chatId, t(lang, 'genericError'))
          await clearSession(admin, chatId)
          return NextResponse.json({ ok: true })
        }
        await finalizeReport(admin, chatId, userId, lang, { ...data, whenText: text.trim().slice(0, 200) } as any)
        return NextResponse.json({ ok: true })
      }

      default: {
        if (existingUser) {
          await sendMessage(chatId, t(lang, 'noVideoYet'))
        } else {
          await saveSession(admin, chatId, 'awaiting_language', {})
          await sendMessage(chatId, t(lang, 'chooseLanguage'))
        }
        return NextResponse.json({ ok: true })
      }
    }
  } catch (e: any) {
    // Always 200 back to Telegram even on an internal failure — a non-2xx
    // response makes Telegram retry the same update repeatedly, which would
    // just replay whatever caused the error in the first place.
    captureError(e, { route: 'POST /api/telegram' })
    return NextResponse.json({ ok: true })
  }
}
export const dynamic = 'force-dynamic'
export const maxDuration = 60
