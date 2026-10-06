import { LEGACY_STORAGE_KEYS, STORAGE_KEYS, readLocalState } from './localPersistence'
import { EMPTY_ACTIVITY, EMPTY_DISCOVERY, normalizeActivity, normalizeDiscovery, normalizeExperience, normalizeFavorites } from './persistedState'
import { createExperienceState } from './experienceState'

export function identityCacheKey(userId) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(userId)) throw new Error('Invalid account identity')
  return `nom.v2.user.${userId}.cache`
}

/** Copy once, retaining original bytes. Partial copies safely resume without
 * overwriting an already existing Guest scope or a newer schema envelope. */
export function migrateLegacyGuestStorage() {
  try {
    const storage = globalThis.localStorage
    if (!storage) return false
    if (storage.getItem('nom.v2.guest.legacy-migrated') === 'true') return true
    for (const [section, oldKey] of Object.entries(LEGACY_STORAGE_KEYS)) {
      const current = STORAGE_KEYS[section], original = storage.getItem(oldKey)
      if (storage.getItem(current) === null && original !== null) storage.setItem(current, original)
    }
    storage.setItem('nom.v2.guest.legacy-migrated', 'true')
    return true
  } catch { return false }
}

export function readGuestSection(section, normalize, fallback) {
  migrateLegacyGuestStorage()
  let key = STORAGE_KEYS[section]
  try {
    if (globalThis.localStorage?.getItem(key) === null && globalThis.localStorage?.getItem(LEGACY_STORAGE_KEYS[section]) !== null) key = LEGACY_STORAGE_KEYS[section]
  } catch { /* Normal reader handles disabled storage. */ }
  return readLocalState(key, normalize, fallback)
}

export function readGuestJourney() {
  return {
    discovery: readGuestSection('discovery', normalizeDiscovery, () => ({ ...EMPTY_DISCOVERY })),
    favorites: readGuestSection('favorites', normalizeFavorites, () => ({ dishIds: [], restaurantIds: [] })),
    activity: readGuestSection('activity', normalizeActivity, () => ({ ...EMPTY_ACTIVITY, recentDishes: [] })),
    experience: readGuestSection('experience', normalizeExperience, createExperienceState),
  }
}

export const meaningfulName = name => typeof name === 'string' && Boolean(name.trim()) && !['explorer', 'guest', 'nom explorer'].includes(name.trim().toLowerCase())
export const isUserMeal = log => log && typeof log.id === 'string' && !/^qa-/i.test(log.id) && !['qa-preview', 'demo-seed'].includes(log.verification?.source)

export function meaningfulGuestData(data) {
  return Boolean(meaningfulName(data.activity.displayName) || data.activity.recentDishes.length
    || data.favorites.dishIds.length || data.favorites.restaurantIds.length
    || data.experience.logs.some(isUserMeal) || data.experience.favorites.length
    || Object.values(data.experience.boxes).some(box => box.status === 'opened' && data.experience.logs.some(log => isUserMeal(log) && log.id === box.visitId)))
}

export function guestJourneyFingerprint(data) {
  const source = JSON.stringify({ name: meaningfulName(data.activity.displayName) ? data.activity.displayName : null,
    favorites: data.favorites, views: data.activity.recentDishes, logs: data.experience.logs.filter(isUserMeal),
    opened: Object.values(data.experience.boxes).filter(box => box.status === 'opened'), collectibles: data.experience.favorites })
  let first = 2166136261, second = 5381
  for (const char of source) { first = Math.imul(first ^ char.charCodeAt(0), 16777619); second = Math.imul(second, 33) ^ char.charCodeAt(0) }
  return `${(first >>> 0).toString(16)}-${(second >>> 0).toString(16)}`
}

export function clearAccountCache(userId) {
  const key = identityCacheKey(userId)
  try {
    const storage = globalThis.localStorage
    for (const item of Object.keys(storage ?? {})) if (item === key || item.startsWith(`${key}.recovery.`) || item.startsWith(`${key}.outbox.`)) storage.removeItem(item)
    return true
  } catch { return false }
}
