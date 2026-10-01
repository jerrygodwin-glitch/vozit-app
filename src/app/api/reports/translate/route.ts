// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { translateReportContent } from '@/lib/translate'
import { rateLimit, RATE_LIMITS } from '@/lib/security'

// GET /api/reports/translate?report_id=X&lang=es — on-demand, cached
// translation of a report's title/5Ws/transcript into the VIEWER's own
// language. Never touches the original fields — this is purely a
// read-side view for someone who doesn't share the reporter's language.
// Writes go through the admin client since this is a shared cache, not
// user-owned data — any viewer benefits from a translation someone else
// already triggered.
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const reportId = searchParams.get('report_id')
  const lang = (searchParams.get('lang') || '').toLowerCase().slice(0, 5)
  if (!reportId || !lang) return NextResponse.json({ error: 'report_id and lang required' }, { status: 400 })
  // Real ISO 639-1 shape only (e.g. "es", "pt-br") — also closes a minor
  // prompt-injection surface, since lang gets interpolated directly into
  // the translation system prompt.
  if (!/^[a-z]{2}(-[a-z]{2})?$/.test(lang)) {
    return NextResponse.json({ error: 'lang must look like an ISO 639-1 code, e.g. "es" or "pt-br"' }, { status: 400 })
  }

  // Each uncached request is a real paid API call — rate-limit per
  // requester (not just per report), so looping distinct lang codes or
  // report IDs can't be used to run up translation costs for free.
  const { data: { user } } = await supabase.auth.getUser()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limitKey = user ? `translate:${user.id}` : `translate:ip:${ip}`
  const limit = await rateLimit(limitKey, RATE_LIMITS.translate.max, RATE_LIMITS.translate.window, supabase)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many translation requests. Please slow down.' }, { status: 429 })
  }

  // RLS-gated, checked BEFORE the cache — a report that's since been
  // removed (status no longer 'published', and this viewer isn't its
  // owner) comes back null here, so a previously-cached translation of it
  // can never be served after the fact. Content moderation applies to
  // translations too, not just the original fields.
  const { data: report } = await supabase
    .from('reports')
    .select('title, who, what, where_text, why, transcript')
    .eq('id', reportId)
    .single()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const { data: cached } = await supabase
    .from('report_translations')
    .select('title, who, what, where_text, why, transcript')
    .eq('report_id', reportId)
    .eq('lang', lang)
    .single()
  if (cached) return NextResponse.json({ ok: true, translation: cached, cached: true })

  const translated = await translateReportContent({
    title: report.title || '',
    who: report.who || '',
    what: report.what || '',
    where_text: report.where_text || '',
    why: report.why || '',
    transcript: report.transcript || '',
  }, lang)
  if (!translated) return NextResponse.json({ error: 'Translation unavailable right now' }, { status: 503 })

  const admin = createAdminClient()
  await admin.from('report_translations').upsert({
    report_id: reportId, lang, ...translated,
  }, { onConflict: 'report_id,lang' })

  return NextResponse.json({ ok: true, translation: translated, cached: false })
}
export const dynamic = 'force-dynamic'
