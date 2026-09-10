// @ts-nocheck
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { BRAND } from '@/lib/logo'

interface Props {
  onVideoReady: (blob: Blob, metadata: {
    duration: number
    gps?: { lat: number; lng: number }
    capturedAt: string
    hasAudio: boolean
    source: 'live' | 'upload'
  }) => void
  maxDuration?: number
}

// 5W teleprompter prompts — timed coaching during recording
// Translations of "I was there" for the sign-off prompt
const SIGN_OFFS = [
  'I was there',          // English
  'Yo estuve ahí',        // Spanish
  'J\'étais là',           // French
  'كنت هناك',             // Arabic
  'Я був там',            // Ukrainian
  'Eu estava lá',         // Portuguese
  'मैं वहाँ था',              // Hindi
  '我在那里',              // Chinese
  'Nilikuwa pale',        // Swahili
]

const PROMPTS = [
  { startSec: 0,  endSec: 5,  label: '', text: 'Recording... show what\'s happening', color: '#fff' },
  { startSec: 5,  endSec: 15, label: 'WHO', text: 'Tell us who is involved', color: '#B53D0F' },
  { startSec: 15, endSec: 30, label: 'WHAT', text: 'Describe what is happening', color: '#1565C0' },
  { startSec: 30, endSec: 45, label: 'WHERE', text: 'Say where you are', color: '#085041' },
  { startSec: 45, endSec: 55, label: 'WHEN', text: 'When did this start?', color: '#854F0B' },
  { startSec: 55, endSec: 70, label: 'WHY', text: 'Why is this happening?', color: '#993556' },
  { startSec: 70, endSec: 82, label: '', text: 'Wrap up — anything else important?', color: '#fff' },
  { startSec: 82, endSec: 90, label: 'SIGN OFF', text: 'Say: "I was there" — your name, your city', color: '#FE3D07' },
]

export function CameraRecorder({ onVideoReady, maxDuration = 90 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [currentPrompt, setCurrentPrompt] = useState<typeof PROMPTS[0] | null>(null)
  const [promptVisible, setPromptVisible] = useState(false)
  const [mode, setMode] = useState<'camera' | 'upload'>('camera')
  const [uploading, setUploading] = useState(false)

  // Get GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}, { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  // Initialize camera
  useEffect(() => {
    if (mode !== 'camera') return
    let mounted = true
    async function init() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        })
        if (!mounted) { s.getTracks().forEach(t => t.stop()); return }
        setStream(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.muted = true
          await videoRef.current.play()
        }
        setCameraReady(true)
      } catch (e: any) {
        setCameraError(e.message || 'Camera access denied')
      }
    }
    init()
    return () => { mounted = false; stream?.getTracks().forEach(t => t.stop()) }
  }, [mode])

  // Update 5W prompts during recording
  useEffect(() => {
    if (!recording) { setCurrentPrompt(null); setPromptVisible(false); return }
    const prompt = PROMPTS.find(p => elapsed >= p.startSec && elapsed < p.endSec)
    if (prompt && prompt !== currentPrompt) {
      setPromptVisible(false)
      setTimeout(() => { setCurrentPrompt(prompt); setPromptVisible(true) }, 200)
    }
  }, [elapsed, recording])

  // Start recording
  function startRecording() {
    if (!stream) return
    chunksRef.current = []
    const mr = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm',
    })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      onVideoReady(blob, {
        duration: elapsed,
        gps: gps || undefined,
        capturedAt: new Date().toISOString(),
        hasAudio: true,
        source: 'live',
      })
    }
    mr.start(1000)
    mediaRecorderRef.current = mr
    setRecording(true)
    setElapsed(0)

    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1
        if (next >= maxDuration) { stopRecording(); return prev }
        return next
      })
    }, 1000)
  }

  // Stop recording
  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
  }

  // Handle file upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { alert('Please select a video file'); return }

    setUploading(true)

    // Get video duration
    const duration = await new Promise<number>((resolve) => {
      const vid = document.createElement('video')
      vid.preload = 'metadata'
      vid.onloadedmetadata = () => { resolve(vid.duration); URL.revokeObjectURL(vid.src) }
      vid.src = URL.createObjectURL(file)
    })

    if (duration > maxDuration + 5) {
      alert(`Video is ${Math.round(duration)}s — max is ${maxDuration}s. Please trim it first.`)
      setUploading(false)
      return
    }

    onVideoReady(file, {
      duration: Math.round(Math.min(duration, maxDuration)),
      gps: gps || undefined,
      capturedAt: new Date().toISOString(),
      hasAudio: true, // assume true — AI will detect
      source: 'upload',
    })
    setUploading(false)
  }

  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`
  const remaining = maxDuration - elapsed
  const progressPct = (elapsed / maxDuration) * 100

  return (
    <div style={{ flex: 1, background: '#000', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* Camera / upload toggle */}
      <div style={{ position: 'absolute', top: 12, left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'center', gap: 4 }}>
        <button onClick={() => setMode('camera')} style={{
          padding: '6px 16px', borderRadius: 16, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          background: mode === 'camera' ? 'rgba(254,61,7,0.9)' : 'rgba(255,255,255,0.15)', color: '#fff',
        }}>🎥 Record</button>
        <button onClick={() => setMode('upload')} style={{
          padding: '6px 16px', borderRadius: 16, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          background: mode === 'upload' ? 'rgba(254,61,7,0.9)' : 'rgba(255,255,255,0.15)', color: '#fff',
        }}>📁 Upload</button>
      </div>

      {mode === 'camera' ? (
        <>
          {/* Camera preview */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

            {!cameraReady && !cameraError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: 40 }}>📷</div>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Starting camera...</p>
                </div>
              </div>
            )}

            {cameraError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#fff', textAlign: 'center', padding: 20 }}>
                  <div style={{ fontSize: 32 }}>⚠️</div>
                  <p style={{ fontSize: 13, marginTop: 8 }}>{cameraError}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Try uploading a video instead</p>
                </div>
              </div>
            )}

            {/* Recording indicator + timer */}
            {recording && (
              <div style={{ position: 'absolute', top: 48, left: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: '#FF0000', animation: 'pulse 1s infinite' }} />
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{timeStr}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>/ {Math.floor(maxDuration / 60)}:{(maxDuration % 60).toString().padStart(2, '0')}</span>
              </div>
            )}

            {/* GPS indicator */}
            {gps && (
              <div style={{ position: 'absolute', top: 48, right: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>📍 GPS</span>
              </div>
            )}

            {/* 5W TELEPROMPTER PROMPT — the signature VozIt feature */}
            {recording && currentPrompt && (
              <div style={{
                position: 'absolute', bottom: 80, left: 16, right: 16,
                transition: 'opacity 0.4s ease, transform 0.4s ease',
                opacity: promptVisible ? 1 : 0,
                transform: promptVisible ? 'translateY(0)' : 'translateY(8px)',
                pointerEvents: 'none',
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                  borderRadius: 12, padding: '10px 16px',
                  borderLeft: `3px solid ${currentPrompt.color}`,
                }}>
                  {currentPrompt.label && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: currentPrompt.color, marginBottom: 2, letterSpacing: 1 }}>
                      {currentPrompt.label}
                    </div>
                  )}
                  <div style={{ fontSize: 15, color: '#fff', fontWeight: 500 }}>
                    🎙️ {currentPrompt.text}
                  </div>
                </div>
              </div>
            )}

            {/* Progress bar */}
            {recording && (
              <div style={{ position: 'absolute', bottom: 70, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)' }}>
                <div style={{ height: '100%', background: remaining < 15 ? '#FF0000' : BRAND.orange, width: `${progressPct}%`, transition: 'width 1s linear' }} />
              </div>
            )}
          </div>

          {/* Record button */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0', background: '#000' }}>
            <div
              onClick={recording ? stopRecording : startRecording}
              style={{
                width: 72, height: 72, borderRadius: 36,
                border: `3px solid ${recording ? '#FF0000' : BRAND.orange}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {recording ? (
                <div style={{ width: 28, height: 28, borderRadius: 4, background: '#FF0000' }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: 26, background: BRAND.orange }} />
              )}
            </div>
          </div>

          {/* Helper text */}
          <div style={{ textAlign: 'center', padding: '0 0 12px', background: '#000' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {recording ? '🎙️ Narrate using the prompts above' : `${maxDuration}s max · Narrate the 5Ws · Sign off with 'I was there'`}
            </span>
          </div>
        </>
      ) : (
        /* UPLOAD MODE */
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 340 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Upload a video</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 20, lineHeight: 1.5 }}>
              MP4, MOV, or WebM · {maxDuration}s maximum
              <br />Dashcam, drone, security camera, or phone footage
            </div>

            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} style={{ display: 'none' }} />

            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
              padding: '14px 32px', borderRadius: 12, border: 'none',
              background: BRAND.orange, color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', opacity: uploading ? 0.5 : 1,
            }}>
              {uploading ? 'Processing...' : 'Choose video file'}
            </button>

            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>
              GPS and timestamp will be extracted if available
            </div>

            {/* Drag & drop zone (web) */}
            <div
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = BRAND.orange }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
              onDrop={e => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file && fileInputRef.current) {
                  const dt = new DataTransfer()
                  dt.items.add(file)
                  fileInputRef.current.files = dt.files
                  fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
                }
              }}
              style={{
                marginTop: 20, padding: 24, borderRadius: 12,
                border: '2px dashed rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.25)', fontSize: 12,
                transition: 'border-color 0.2s',
              }}
            >
              or drag & drop here
            </div>
          </div>
        </div>
      )}

      {/* Pulse animation for recording indicator */}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  )
}
