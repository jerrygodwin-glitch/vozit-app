// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { generate5Ws, storeAnalysis, type AnalysisInput } from '@/lib/ai-5w-analysis'

// POST — trigger AI analysis for a report
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { report_id, title, notes, who, what, where_text, when_happened, why, gps, playback_id, duration, captured_at } = body

    if (!report_id && !title) return NextResponse.json({ error: 'report_id or title required' }, { status: 400 })

    // If report_id provided, fetch existing data
    let transcript = ''
    let reportData: any = null
    if (report_id) {
      const { data } = await supabase
        .from('reports')
        .select('title, who, what, where_text, when_happened, why, location_name, location_lat, location_lng, playback_id, duration, created_at')
        .eq('id', report_id)
        .eq('user_id', user.id)
        .single()
      reportData = data
    }

    // Build analysis input from all available sources
    const input: AnalysisInput = {
      title: title || reportData?.title || '',
      reporterNotes: notes || '',
      reporterWho: who || reportData?.who || '',
      reporterWhat: what || reportData?.what || '',
      reporterWhere: where_text || reportData?.where_text || reportData?.location_name || '',
      reporterWhen: when_happened || reportData?.when_happened || '',
      reporterWhy: why || reportData?.why || '',
      playbackId: playback_id || reportData?.playback_id || '',
      duration: duration || reportData?.duration || 0,
      capturedAt: captured_at || reportData?.created_at || new Date().toISOString(),
      gps: gps || (reportData?.location_lat ? { lat: reportData.location_lat, lng: reportData.location_lng } : undefined),
    }

    // Run AI analysis
    const result = await generate5Ws(input)

    // Store analysis if report exists
    if (report_id) {
      await storeAnalysis(supabase, report_id, result)
    }

    return NextResponse.json({ ok: true, analysis: result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — fetch existing AI analysis for a report
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const reportId = url.searchParams.get('report_id')
    if (!reportId) return NextResponse.json({ error: 'report_id required' }, { status: 400 })

    const { data } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({ ok: true, analysis: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
