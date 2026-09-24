// @ts-nocheck
// Recorded video survives a crash/refresh/accidental tab close via
// IndexedDB (blobs don't fit sanely in localStorage). Text fields (title,
// notes, 5Ws) are small enough to just use localStorage directly.
const DB_NAME = 'vozit-drafts'
const STORE = 'video'
const KEY = 'current'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveDraftVideo(blob: Blob, meta: Record<string, any>): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ blob, meta, savedAt: Date.now() }, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch { /* best-effort — never block the actual recording flow on this */ }
}

export async function getDraftVideo(): Promise<{ blob: Blob; meta: Record<string, any>; savedAt: number } | null> {
  try {
    const db = await openDb()
    const result = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return result
  } catch { return null }
}

export async function clearDraftVideo(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch { /* best-effort */ }
}

const TEXT_DRAFT_KEY = 'vozit-draft-fields'

export function saveDraftFields(fields: Record<string, any>) {
  try { localStorage.setItem(TEXT_DRAFT_KEY, JSON.stringify(fields)) } catch {}
}
export function getDraftFields(): Record<string, any> | null {
  try { const raw = localStorage.getItem(TEXT_DRAFT_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
export function clearDraftFields() {
  try { localStorage.removeItem(TEXT_DRAFT_KEY) } catch {}
}
