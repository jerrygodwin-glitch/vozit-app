// @ts-nocheck
// Content integrity: SHA-256 hashing + EXIF stripping
// Creates an immutable content hash for each upload
// Strips personal EXIF data while preserving GPS for verification

export async function generateContentHash(fileBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// EXIF fields to STRIP (personal data)
const STRIP_FIELDS = [
  'Make', 'Model', 'Software', 'Artist', 'Copyright',
  'ImageDescription', 'UserComment', 'OwnerName',
  'BodySerialNumber', 'LensSerialNumber', 'CameraSerialNumber',
  'SerialNumber', 'InternalSerialNumber', 'MacAddress',
]

// EXIF fields to KEEP (verification data)
const KEEP_FIELDS = [
  'GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'GPSTimeStamp', 'GPSDateStamp',
  'DateTimeOriginal', 'CreateDate', 'ModifyDate',
  'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight',
  'Duration', 'VideoFrameRate', 'CompressorName',
]

export interface ContentMetadata {
  sha256: string
  fileSize: number
  mimeType: string
  gps?: { lat: number; lng: number; alt?: number }
  capturedAt?: string
  dimensions?: { width: number; height: number }
  strippedFields: string[]
}

// Extract safe metadata and strip personal fields
export function extractSafeMetadata(rawExif: Record<string, any>): {
  safe: Record<string, any>
  stripped: string[]
} {
  const safe: Record<string, any> = {}
  const stripped: string[] = []

  for (const [key, value] of Object.entries(rawExif)) {
    if (STRIP_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      stripped.push(key)
    } else {
      safe[key] = value
    }
  }

  return { safe, stripped }
}

// Verify content hasn't been tampered with
export async function verifyContentHash(fileBuffer: ArrayBuffer, expectedHash: string): Promise<boolean> {
  const actualHash = await generateContentHash(fileBuffer)
  return actualHash === expectedHash
}

// Check for duplicate content (same video submitted twice)
export async function checkDuplicateContent(supabase: any, hash: string): Promise<{
  isDuplicate: boolean
  existingReportId?: string
}> {
  const { data } = await supabase
    .from('reports')
    .select('id')
    .eq('content_hash', hash)
    .limit(1)

  if (data?.length) {
    return { isDuplicate: true, existingReportId: data[0].id }
  }
  return { isDuplicate: false }
}
