/** Versioned, local-only development persistence. No credentials or navigation state. */
export const LEGACY_STORAGE_KEYS = {
  discovery: 'nom.v1.discovery', favorites: 'nom.v1.favorites', experience: 'nom.v1.experience', activity: 'nom.v1.activity',
}
export const STORAGE_KEYS = Object.fromEntries(Object.keys(LEGACY_STORAGE_KEYS).map(section => [section, `nom.v2.guest.${section}`]))
const VERSION = 1
const blockedWrites = new Set()
export const REPAIRED_STATE = Symbol('repaired-local-state')

function storage() {
  try { return globalThis.localStorage ?? null } catch { return null }
}

export function readLocalState(key, normalize, fallback) {
  const store = storage()
  if (!store) return fallback()
  let raw
  try {
    raw = store.getItem(key)
    if (raw === null) { blockedWrites.delete(key); return fallback() }
    const envelope = JSON.parse(raw)
    // A newer build's data remains untouched rather than being downgraded.
    if (envelope?.version > VERSION) { blockedWrites.add(key); return fallback() }
    const payload = envelope?.version === VERSION ? envelope.data : envelope
    const result = normalize(payload)
    if (result[REPAIRED_STATE] || envelope?.version !== VERSION) {
      // Keep the original when migrating or salvaging only valid records.
      try { store.setItem(`${key}.recovery.${Date.now()}`, raw) }
      catch { blockedWrites.add(key); return result }
    }
    blockedWrites.delete(key)
    return result
  } catch {
    // Preserve corrupt/stale source data before replacing it with safe defaults.
    try {
      if (raw !== undefined && raw !== null) store.setItem(`${key}.recovery.${Date.now()}`, raw)
      blockedWrites.delete(key)
    } catch { blockedWrites.add(key) }
    return fallback()
  }
}

export function writeLocalState(key, data) {
  if (blockedWrites.has(key)) return false
  try {
    const store = storage()
    if (!store) return false
    store.setItem(key, JSON.stringify({ version: VERSION, data }))
    return true
  } catch { return false } // Private mode, disabled storage, or full quota: keep working in memory.
}
