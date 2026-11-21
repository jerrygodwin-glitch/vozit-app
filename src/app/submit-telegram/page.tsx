'use client'
import { useState } from 'react'
import { Top } from '@/lib/ui'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'uk', label: 'Українська' },
  { code: 'pt', label: 'Português' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'ru', label: 'Русский' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'fa', label: 'فارسی' },
]

const STEPS: Record<string, string[]> = {
  en: [
    'Open Telegram and start a chat with @VozItReporterBot.',
    'Pick your language when the bot asks.',
    'First time? The bot sets up your account — name, username, email.',
    'Send your video as a FILE (tap the paperclip → File), not as a video message — this preserves quality and location data.',
    'Your video must be 61–90 seconds, following the 5Ws: who, what, where, when, why. End with "I was there" — your name, your city.',
    'Answer the bot\'s follow-up questions (description, location, when you recorded it) and you\'re done.',
  ],
}

export default function SubmitTelegramPage() {
  const [lang, setLang] = useState('en')
  const steps = STEPS[lang] || STEPS.en

  return (
    <div className="page"><Top />
      <div className="container">
        <a href="/upload" style={{ fontSize: 13, color: '#0a8fe8', marginBottom: 16, display: 'block' }}>← Back</a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: '#f7f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#26A5E4"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
          </span>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Submit via Telegram</h1>
            <div style={{ fontSize: 13, color: '#666' }}>@VozItReporterBot</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 1.6 }}>
          In a conflict zone, on low bandwidth, or just don't want to use the website? Submit your whole report —
          video, description, location — through a Telegram chat instead.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className="btn"
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 13,
                border: lang === l.code ? '1px solid #FE3D07' : '1px solid #ddd',
                background: lang === l.code ? '#FE3D07' : '#fff',
                color: lang === l.code ? '#fff' : '#1a1a1a',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>How it works</div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#1a1a1a', lineHeight: 1.8 }}>
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>

        <div className="card" style={{ marginBottom: 20, background: '#f0e8d8' }}>
          <div style={{ fontSize: 13, color: '#1a1a1a' }}>
            💡 Sending as a <strong>file</strong> (not a video message) preserves the original quality and keeps the
            data VozIt uses to verify your report — Telegram's regular "video message" option re-compresses and
            strips most of that.
          </div>
        </div>

        <a href="https://t.me/VozItReporterBot" target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
          <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15 }}>
            Open Telegram
          </button>
        </a>
      </div>
    </div>
  )
}
