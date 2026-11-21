// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { translateUIStrings } from '@/lib/translate'
import { captureError } from '@/lib/monitoring'

// Stable, non-cryptographic hash of the English source strings — just
// enough to notice "the source copy changed since this was cached" and
// re-translate, without needing any manual cache-busting when a page's
// wording is edited later.
function hashStrings(strings: Record<string, string>): string {
  const json = JSON.stringify(strings, Object.keys(strings).sort())
  let h = 0
  for (let i = 0; i < json.length; i++) {
    h = (Math.imul(31, h) + json.charCodeAt(i)) | 0
  }
  return h.toString(36)
}

// POST /api/translate-ui — translates a page's static UI copy into a
// reporter's chosen language, for the handful of pages (payouts, settings)
// a Telegram-bot reporter gets sent to who may never otherwise see an
// English screen. Cached per (pageKey, lang) in ui_translation_cache so
// repeat visits — by anyone — don't re-call Claude; the cache only misses
// when the source English copy itself changes.
export async function POST(req: NextRequest) {
  try {
    const { pageKey, lang, strings } = await req.json()
    if (!pageKey || !lang || !strings || typeof strings !== 'object') {
      return NextResponse.json({ error: 'pageKey, lang, and strings are required' }, { status: 400 })
    }

    // English needs no translation call or cache row at all.
    if (lang === 'en') return NextResponse.json({ translated: strings })

    const admin = createAdminClient()
    const hash = hashStrings(strings)

    const { data: cached } = await admin
      .from('ui_translation_cache')
      .select('translated, content_hash')
      .eq('page_key', pageKey)
      .eq('lang', lang)
      .single()

    if (cached && cached.content_hash === hash) {
      return NextResponse.json({ translated: cached.translated })
    }

    const translated = await translateUIStrings(strings, lang)
    // Translation failed — fall back to the English source rather than
    // leaving the page without any copy at all.
    if (!translated) return NextResponse.json({ translated: strings })

    await admin.from('ui_translation_cache').upsert({
      page_key: pageKey, lang, content_hash: hash, translated, updated_at: new Date().toISOString(),
    }, { onConflict: 'page_key,lang' })

    return NextResponse.json({ translated })
  } catch (e: any) {
    captureError(e, { route: 'POST /api/translate-ui' })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
