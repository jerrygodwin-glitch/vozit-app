// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { translateReportContent } from '@/lib/translate'

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

  const { data: cached } = await supabase
    .from('report_translations')
    .select('title, who, what, where_text, why, transcript')
    .eq('report_id', reportId)
    .eq('lang', lang)
    .single()
  if (cached) return NextResponse.json({ ok: true, translation: cached, cached: true })

  const { data: report } = await supabase
    .from('reports')
    .select('title, who, what, where_text, why, transcript')
    .eq('id', reportId)
    .single()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

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
