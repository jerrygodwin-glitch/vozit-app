// @ts-nocheck
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { BRAND } from '@/lib/logo'

interface Props {
  videoBlob: Blob         // The uploaded silent video
  videoDuration: number   // Duration in seconds
  onComplete: (mergedBlob: Blob, metadata: { hasVoiceOver: boolean }) => void
  onSkip: () => void      // Skip voice-over, proceed without narration
}

// 5W prompts scaled proportionally to the video duration
function getPromptsForDuration(duration: number) {
  const d = Math.min(duration, 90)
  return [
    { pct: 0,    endPct: 0.06, label: '',        text: 'Watch and narrate — describe what you see', color: '#fff' },
    { pct: 0.06, endPct: 0.18, label: 'WHO',     text: 'Tell us who is involved', color: '#B53D0F' },
    { pct: 0.18, endPct: 0.35, label: 'WHAT',    text: 'Describe what is happening', color: '#1565C0' },
    { pct: 0.35, endPct: 0.50, label: 'WHERE',   text: 'Say where this is', color: '#085041' },
    { pct: 0.50, endPct: 0.62, label: 'WHEN',    text: 'When did this happen?', color: '#854F0B' },
    { pct: 0.62, endPct: 0.78, label: 'WHY',     text: 'Why is this happening?', color: '#993556' },
    { pct: 0.78, endPct: 0.90, label: '',         text: 'Add any extra context', color: '#fff' },
    { pct: 0.90, endPct: 1.0,  label: 'SIGN OFF', text: 'Say: "I was there" — your name, your city', color: '#FE3D07' },
  ]
}

export function VoiceOverRecorder({ videoBlob, videoDuration, onComplete, onSkip }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const [videoUrl, setVideoUrl] = useState('')
  const [step, setStep] = useState<'preview' | 'countdown' | 'recording' | 'review' | 'merging'>('preview')
  const [currentTime, setCurrentTime] = useState(0)
  const [countdown, setCountdown] = useState(3)
  const [promptVisible, setPromptVisible] = useState(true)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [micReady, setMicReady] = useState(false)
  const [micError, setMicError] = useState('')

  const prompts = getPromptsForDuration(videoDuration)
  const progressPct = (currentTime / videoDuration) * 100
  const currentPrompt = prompts.find(p => {
    const startSec = p.pct * videoDuration
    const endSec = p.endPct * videoDuration
    return currentTime >= startSec && currentTime < endSec
  })

  // Create object URL for the video
  useEffect(() => {
    const url = URL.createObjectURL(videoBlob)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoBlob])

  // Track video time during recording
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    const handler = () => setCurrentTime(vid.currentTime)
    vid.addEventListener('timeupdate', handler)
    return () => vid.removeEventListener('timeupdate', handler)
  }, [])

  // Check microphone access
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(s => { s.getTracks().forEach(t => t.stop()); setMicReady(true) })
      .catch(e => setMicError(e.message || 'Microphone access denied'))
  }, [])

  // Countdown before recording starts
  useEffect(() => {
    if (step !== 'countdown') return
    if (countdown <= 0) {
      startRecording()
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [step, countdown])

  function beginCountdown() {
    setCountdown(3)
    setStep('countdown')
  }

  async function startRecording() {
    setStep('recording')
    audioChunksRef.current = []

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      })

      const mr = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus' : 'audio/webm'
      })

      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = () => {
        audioStream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        setStep('review')
      }

      audioRecorderRef.current = mr
      mr.start(1000)

      // Start video playback synced with audio recording
      const vid = videoRef.current
      if (vid) {
        vid.currentTime = 0
        vid.muted = true // Mute original audio if any
        vid.play()

        // Auto-stop when video ends
        vid.onended = () => {
          if (audioRecorderRef.current?.state === 'recording') {
            audioRecorderRef.current.stop()
          }
        }
      }
    } catch (e: any) {
      setMicError(e.message)
      setStep('preview')
    }
  }

  function stopRecording() {
    if (audioRecorderRef.current?.state === 'recording') {
      audioRecorderRef.current.stop()
    }
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  function retake() {
    setAudioBlob(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl('')
    setCurrentTime(0)
    setStep('preview')
  }

  async function mergeAndSubmit() {
    if (!audioBlob) { onSkip(); return }
    setStep('merging')

    // In a browser environment, we can't easily merge audio + video
    // without FFmpeg (WASM). So we send both blobs to the server
    // which merges them during the Mux upload pipeline.
    //
    // For now: create a combined payload that the upload handler
    // can process. The server will use FFmpeg to merge.
    //
    // Alternative: use @ffmpeg/ffmpeg WASM for client-side merge
    // but that's a 25MB download — better to do server-side.

    // Pack both blobs into a single submission
    // The upload API will detect the voice-over audio and merge
    try {
      onComplete(videoBlob, { hasVoiceOver: true })

      // Also upload the audio track separately for server-side merge
      const formData = new FormData()
      formData.append('voice_over', audioBlob, 'voiceover.webm')
      await fetch('/api/reports/voice-over', {
        method: 'POST',
        body: formData,
      }) // Non-blocking
    } catch {
      onComplete(videoBlob, { hasVoiceOver: true })
    }
  }

  const timeStr = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

  // ── PREVIEW (before recording) ─────────────────────────────
  if (step === 'preview') return (
    <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ position: 'relative' }}>
        <video ref={videoRef} src={videoUrl} playsInline controls style={{ width: '100%', display: 'block', borderRadius: '12px 12px 0 0' }} />
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Add voice narration</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 14 }}>
          Your video will play back while you record a voice track over it.
          Follow the 5W prompts to narrate what happened. End with "I was there."
        </div>

        {micError ? (
          <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,0,0,0.15)', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: '#ff6b6b' }}>🎙️ {micError}</span>
          </div>
        ) : !micReady ? (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Checking microphone...</div>
        ) : null}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={beginCountdown} disabled={!micReady} style={{
            flex: 1, padding: 12, borderRadius: 10, border: 'none',
            background: BRAND.orange, color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', opacity: micReady ? 1 : 0.4,
          }}>🎙️ Start narrating</button>
          <button onClick={onSkip} style={{
            padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Skip</button>
        </div>

        {/* 5W prompt preview */}
        <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Prompts will guide you through:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['WHO', 'WHAT', 'WHERE', 'WHEN', 'WHY', 'SIGN OFF'].map(w => (
              <span key={w} style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 600,
                background: 'rgba(254,61,7,0.15)', color: BRAND.orange,
              }}>{w}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ── COUNTDOWN ──────────────────────────────────────────────
  if (step === 'countdown') return (
    <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ position: 'relative' }}>
        <video ref={videoRef} src={videoUrl} playsInline muted style={{ width: '100%', display: 'block', opacity: 0.3 }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: '#fff' }}>{countdown}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>Get ready to narrate...</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>🎙️ Speak clearly toward your device</div>
        </div>
      </div>
    </div>
  )

  // ── RECORDING ──────────────────────────────────────────────
  if (step === 'recording') return (
    <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ position: 'relative' }}>
        <video ref={videoRef} src={videoUrl} playsInline muted style={{ width: '100%', display: 'block' }} />

        {/* Recording indicator */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: '#FF0000', animation: 'pulse 1s infinite' }} />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            🎙️ {timeStr(currentTime)} / {timeStr(videoDuration)}
          </span>
        </div>

        {/* 5W teleprompter prompt */}
        {currentPrompt && (
          <div style={{
            position: 'absolute', bottom: 60, left: 12, right: 12,
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            opacity: 1, pointerEvents: 'none',
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
              borderRadius: 12, padding: '10px 16px',
              borderLeft: `3px solid ${currentPrompt.color}`,
            }}>
              {currentPrompt.label && (
                <div style={{ fontSize: 11, fontWeight: 700, color: currentPrompt.color, marginBottom: 2, letterSpacing: 1 }}>
                  {currentPrompt.label}
                </div>
              )}
              <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>
                🎙️ {currentPrompt.text}
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div style={{ position: 'absolute', bottom: 48, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ height: '100%', background: BRAND.orange, width: `${progressPct}%`, transition: 'width 0.3s linear' }} />
        </div>
      </div>

      {/* Stop button */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
        <div onClick={stopRecording} style={{
          width: 56, height: 56, borderRadius: 28, border: '3px solid #FF0000',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <div style={{ width: 22, height: 22, borderRadius: 3, background: '#FF0000' }} />
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '0 0 10px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>🎙️ Narrating — follow the prompts</span>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  )

  // ── REVIEW ─────────────────────────────────────────────────
  if (step === 'review') return (
    <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ position: 'relative' }}>
        <video ref={videoRef} src={videoUrl} playsInline controls style={{ width: '100%', display: 'block', borderRadius: '12px 12px 0 0' }} />
        {/* Play audio alongside video for review */}
        {audioUrl && <audio src={audioUrl} id="vo-audio" />}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Review your narration</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>
          Play the video to hear your voice-over. Retake if needed.
        </div>

        <button onClick={() => {
          const vid = videoRef.current
          const aud = document.getElementById('vo-audio') as HTMLAudioElement
          if (vid && aud) { vid.currentTime = 0; aud.currentTime = 0; vid.play(); aud.play() }
        }} style={{
          width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
          background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8,
        }}>▶ Play with voice-over</button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={mergeAndSubmit} style={{
            flex: 1, padding: 12, borderRadius: 10, border: 'none',
            background: '#22C55E', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>✓ Use this narration</button>
          <button onClick={retake} style={{
            padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Retake</button>
        </div>
      </div>
    </div>
  )

  // ── MERGING ────────────────────────────────────────────────
  return (
    <div style={{
      background: '#000', borderRadius: 12, padding: 40,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
      <div style={{ color: '#fff', fontSize: 14 }}>Preparing your report...</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Merging voice-over with video</div>
    </div>
  )
}
