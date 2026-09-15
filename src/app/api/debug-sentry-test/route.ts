// @ts-nocheck
// Temporary route to confirm Sentry is wired up correctly. Safe to hit —
// it doesn't touch any data, it just fires one deliberate test error through
// the same reporting path real errors use. Remove after verifying.
import { NextResponse } from 'next/server'
import { captureError } from '@/lib/monitoring'

export async function GET() {
  const sentryConfigured = !!process.env.NEXT_PUBLIC_SENTRY_DSN

  const testError = new Error('VozIt Sentry test error — safe to ignore, triggered manually to verify monitoring is working')
  captureError(testError, { route: 'GET /api/debug-sentry-test', test: true })

  return NextResponse.json({
    ok: true,
    sentryConfigured,
    message: sentryConfigured
      ? 'Test error sent to Sentry. Check the Issues page in your Sentry project — it should appear within a few seconds.'
      : 'NEXT_PUBLIC_SENTRY_DSN is not set on this deployment, so nothing was actually sent to Sentry — the error was only logged to the server console.',
  })
}
export const dynamic = 'force-dynamic'
