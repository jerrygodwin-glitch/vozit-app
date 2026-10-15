// @ts-nocheck
// Lazy Mux initialization — only loads when called
let muxClient: any = null

function getMux() {
  if (!muxClient) {
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      throw new Error('Mux credentials not configured')
    }
    const Mux = require('@mux/mux-node').default || require('@mux/mux-node')
    muxClient = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
    })
  }
  return muxClient
}

// corsOrigin should be the actual incoming request's own Origin header,
// not a separately-configured env var — Mux only accepts an upload from
// whatever single origin it was told to expect, and a hardcoded/stale
// value (e.g. an old preview URL, or one that just doesn't exactly match
// the live domain) silently breaks every upload with no readable error,
// just a CORS rejection the browser reports as "server responded with 0."
// Deriving it from the request itself removes that whole class of bug.
export async function createMuxUpload(corsOrigin?: string): Promise<{ uploadId: string; uploadUrl: string }> {
  const mux = getMux()
  const upload = await mux.video.uploads.create({
    new_asset_settings: {
      playback_policy: ['public'],
      encoding_tier: 'baseline',
      // The watermark worker downloads a plain MP4 rendition to run FFmpeg
      // on — Mux only generates a streaming (HLS) rendition by default,
      // so every watermark job was 404ing on the very first step. The
      // older mp4_support:'standard' shortcut (which would've produced
      // stream.mux.com/{id}/high.mp4) is deprecated and actively rejected
      // on this account's plan ("not allowed on basic assets") — Mux's
      // current replacement is static_renditions, which instead produces
      // stream.mux.com/{id}/highest.mp4 (see matching URL in
      // watermark-worker/server.js).
      static_renditions: [{ resolution: 'highest' }],
    },
    cors_origin: corsOrigin || process.env.NEXT_PUBLIC_APP_URL || '*',
  })
  return { uploadId: upload.id, uploadUrl: upload.url }
}
