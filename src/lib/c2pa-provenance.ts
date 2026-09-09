// @ts-nocheck
// C2PA (Coalition for Content Provenance and Authenticity) Integration
// Establishes a provenance chain for each report:
//   capture → upload → moderation → publish
// Uses Content Credentials to prove content is authentic and unmodified
// https://c2pa.org / https://contentauthenticity.org

export interface ProvenanceManifest {
  version: '2.0'
  claimGenerator: string
  contentHash: string
  assertions: ProvenanceAssertion[]
  signedAt: string
  manifestId: string
}

export interface ProvenanceAssertion {
  label: string
  data: Record<string, any>
  timestamp: string
}

// Create initial provenance manifest at upload time
export function createCaptureManifest(params: {
  contentHash: string
  capturedAt: string
  gps?: { lat: number; lng: number; alt?: number }
  deviceInfo?: { platform: string; userAgent: string }
  duration?: number
}): ProvenanceManifest {
  const manifestId = `urn:vozit:manifest:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  const assertions: ProvenanceAssertion[] = [
    {
      label: 'c2pa.actions',
      data: {
        actions: [{
          action: 'c2pa.created',
          softwareAgent: 'VozIt Citizen Journalism Platform',
          when: params.capturedAt,
        }],
      },
      timestamp: params.capturedAt,
    },
    {
      label: 'c2pa.hash.data',
      data: {
        exclusions: [],
        name: 'sha256',
        hash: params.contentHash,
        pad: '',
      },
      timestamp: params.capturedAt,
    },
  ]

  // GPS assertion
  if (params.gps) {
    assertions.push({
      label: 'stds.exif',
      data: {
        'exif:GPSLatitude': params.gps.lat,
        'exif:GPSLongitude': params.gps.lng,
        ...(params.gps.alt ? { 'exif:GPSAltitude': params.gps.alt } : {}),
        'exif:GPSTimeStamp': params.capturedAt,
      },
      timestamp: params.capturedAt,
    })
  }

  // Device assertion (stripped of identifying info)
  if (params.deviceInfo) {
    assertions.push({
      label: 'stds.schema-org.CreativeWork',
      data: {
        '@type': 'CreativeWork',
        'author': { '@type': 'Organization', 'name': 'VozIt Reporter' },
        'encodingFormat': 'video/mp4',
        ...(params.duration ? { 'duration': `PT${params.duration}S` } : {}),
      },
      timestamp: params.capturedAt,
    })
  }

  return {
    version: '2.0',
    claimGenerator: 'VozIt/1.0',
    contentHash: params.contentHash,
    assertions,
    signedAt: new Date().toISOString(),
    manifestId,
  }
}

// Add moderation assertion to provenance chain
export function addModerationAssertion(
  manifest: ProvenanceManifest,
  moderationResult: {
    passed: boolean
    severity: string
    scanId: string
    scannedAt: string
  }
): ProvenanceManifest {
  return {
    ...manifest,
    assertions: [
      ...manifest.assertions,
      {
        label: 'c2pa.actions',
        data: {
          actions: [{
            action: 'c2pa.reviewed',
            softwareAgent: 'VozIt Content Moderation (Hive AI)',
            parameters: {
              result: moderationResult.passed ? 'approved' : 'flagged',
              severity: moderationResult.severity,
              scanReference: moderationResult.scanId,
            },
            when: moderationResult.scannedAt,
          }],
        },
        timestamp: moderationResult.scannedAt,
      },
    ],
  }
}

// Add publication assertion
export function addPublishAssertion(manifest: ProvenanceManifest, publishedAt: string): ProvenanceManifest {
  return {
    ...manifest,
    assertions: [
      ...manifest.assertions,
      {
        label: 'c2pa.actions',
        data: {
          actions: [{
            action: 'c2pa.published',
            softwareAgent: 'VozIt Platform',
            when: publishedAt,
          }],
        },
        timestamp: publishedAt,
      },
    ],
  }
}

// Add vote/credibility assertion (periodic snapshot)
export function addCredibilityAssertion(
  manifest: ProvenanceManifest,
  credibility: { upvotes: number; downvotes: number; pct: number; snapshotAt: string }
): ProvenanceManifest {
  return {
    ...manifest,
    assertions: [
      ...manifest.assertions,
      {
        label: 'vozit.credibility',
        data: {
          upvotes: credibility.upvotes,
          downvotes: credibility.downvotes,
          credibilityPercent: credibility.pct,
          method: 'community_weighted_vote',
        },
        timestamp: credibility.snapshotAt,
      },
    ],
  }
}

// Sign manifest with platform key (uses Web Crypto API)
export async function signManifest(manifest: ProvenanceManifest): Promise<{
  manifest: ProvenanceManifest
  signature: string
}> {
  const manifestJson = JSON.stringify(manifest)
  const encoder = new TextEncoder()
  const data = encoder.encode(manifestJson)

  // Use HMAC with platform secret for signing
  // In production, would use proper X.509 certificate chain
  const signingKey = process.env.C2PA_SIGNING_KEY || process.env.VOZIT_PLATFORM_SECRET || 'vozit-dev-key'
  const keyData = encoder.encode(signingKey)

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data)
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  return { manifest, signature }
}

// Verify a manifest signature
export async function verifyManifestSignature(
  manifest: ProvenanceManifest, signature: string
): Promise<boolean> {
  const { signature: expectedSig } = await signManifest(manifest)
  return signature === expectedSig
}

// Store provenance chain in database
export async function storeProvenance(
  supabase: any, reportId: string, manifest: ProvenanceManifest, signature: string
) {
  await supabase.from('provenance').upsert({
    report_id: reportId,
    manifest_id: manifest.manifestId,
    manifest: manifest,
    signature,
    content_hash: manifest.contentHash,
    assertion_count: manifest.assertions.length,
    created_at: manifest.signedAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'report_id' })
}

// Get provenance chain for a report (public — viewers can verify)
export async function getProvenance(supabase: any, reportId: string) {
  const { data } = await supabase
    .from('provenance')
    .select('manifest_id, manifest, signature, content_hash, assertion_count, updated_at')
    .eq('report_id', reportId)
    .single()
  return data
}
