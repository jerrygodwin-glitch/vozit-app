import { NextResponse } from 'next/server'

// Confirms the server itself is responding, independent of any particular
// page's rendering — listed in middleware.ts's PUBLIC set (API routes never
// hit the auth redirect anyway, but it's listed explicitly for clarity).
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: Date.now() })
}
export const dynamic = 'force-dynamic'
