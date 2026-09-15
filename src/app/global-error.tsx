'use client'
import { useEffect } from 'react'
import { captureError } from '@/lib/monitoring'

// Next.js renders this in place of the whole app if something crashes while
// rendering — without it, a crash just shows a blank/unbranded error page
// with no report of what happened.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error, { boundary: 'global-error', digest: error.digest })
  }, [error])

  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f0ebe4' }}>
          <div style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>We've logged the error. Please try again.</p>
            <button onClick={() => reset()} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#FE3D07', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
