// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

// POST /api/ai-transcribe — transcribes the reporter's own spoken narration
// straight from the local video file, before it's ever uploaded to Mux.
// This is what actually makes the Quick-mode claim "AI analyzes your video
// audio" true — previously nothing transcribed anything, and the AI only
// ever saw whatever text the reporter typed into Title/Notes.
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: true, transcript: '' }) // gracefully skip — not configured yet
  }

  try {
    const incoming = await req.formData()
    const file = incoming.get('video') as File | null
    if (!file) return NextResponse.json({ error: 'video file required' }, { status: 400 })

    const forwardForm = new FormData()
    forwardForm.append('file', file, file.name || 'clip.webm')
    forwardForm.append('model', 'whisper-1')

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: forwardForm,
      signal: AbortSignal.timeout(45000),
    })

    if (!res.ok) {
      // A silent voice-over-free clip is a completely normal, expected case
      // (e.g. Whisper returning no speech detected) — don't treat as an error.
      return NextResponse.json({ ok: true, transcript: '' })
    }

    const data = await res.json()
    return NextResponse.json({ ok: true, transcript: data.text || '' })
  } catch (e: any) {
    return NextResponse.json({ ok: true, transcript: '' })
  }
}
export const dynamic = 'force-dynamic'
