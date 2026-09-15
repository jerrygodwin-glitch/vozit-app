// @ts-nocheck
// Error monitoring — deliberately minimal integration. Rather than wiring
// Sentry into next.config.js/instrumentation.ts (which would touch the
// build pipeline and risks breaking deploys if misconfigured), this just
// calls the SDK's plain JS API from inside the try/catch blocks the app
// already has everywhere. Safe no-op if NEXT_PUBLIC_SENTRY_DSN isn't set.
import * as Sentry from '@sentry/nextjs'

let initialized = false

function ensureInit() {
  if (initialized) return
  initialized = true
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  })
}

// Report a caught error, with optional context (route name, user id, etc.)
export function captureError(error: unknown, context?: Record<string, any>) {
  console.error(error)
  try {
    ensureInit()
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
    Sentry.captureException(error, context ? { extra: context } : undefined)
  } catch {
    // Never let monitoring itself break the request
  }
}

// Report something that isn't a thrown error but is still worth knowing about
// (e.g. a webhook signature that failed verification).
export function captureMessage(message: string, context?: Record<string, any>) {
  console.warn(message, context || '')
  try {
    ensureInit()
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
    Sentry.captureMessage(message, context ? { extra: context } : undefined)
  } catch {
    // Never let monitoring itself break the request
  }
}
