// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

// POST — receive voice-over audio to merge with video
// The audio is stored temporarily and merged during the
// Mux upload pipeline using FFmpeg on the worker
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const audioFile = formData.get('voice_over') as File | null
    const reportId = formData.get('report_id') as string | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Store voice-over audio in Supabase Storage
    const audioBuffer = await audioFile.arrayBuffer()
    const fileName = `voice-overs/${user.id}/${reportId || Date.now()}.webm`

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/webm',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // If report exists, mark it for voice-over merge
    if (reportId) {
      await supabase.from('reports').update({
        voice_over_path: fileName,
        has_voice_over: true,
      }).eq('id', reportId).eq('user_id', user.id)
    }

    return NextResponse.json({
      ok: true,
      voiceOverPath: fileName,
      message: 'Voice-over uploaded. Will be merged with video during processing.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
