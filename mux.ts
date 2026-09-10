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

export async function createMuxUpload(): Promise<{ uploadId: string; uploadUrl: string }> {
  const mux = getMux()
  const upload = await mux.video.uploads.create({
    new_asset_settings: {
      playback_policy: ['public'],
      encoding_tier: 'baseline',
    },
    cors_origin: process.env.NEXT_PUBLIC_APP_URL || '*',
  })
  return { uploadId: upload.id, uploadUrl: upload.url }
}
