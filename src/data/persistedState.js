import records from './catalog/records.json'
import taxonomy from './catalog/taxonomy.json'
import { mockRestaurants } from './mockRestaurants'
import { restaurantServesDish } from './mockRestaurantMenus'
import { collectibleDefinitions, collectionCountries, collectibleKey } from './collectionDefinitions'
import { createExperienceState, experienceReducer } from './experienceState'
import { REPAIRED_STATE } from './localPersistence'
import { feedbackObservations, feedbackReactions } from './mealFeedback'

export const EMPTY_DISCOVERY = { foodType: null, flavors: [], adventurousness: null, region: null }
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const uniqueKnown = (value, allowed) => Array.isArray(value) ? [...new Set(value.filter(item => typeof item === 'string' && allowed.includes(item)))] : []
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && validDate(`${value}T00:00:00Z`) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value)
const markRepaired = result => { Object.defineProperty(result, REPAIRED_STATE, { value: true }); return result }

export function normalizeDiscovery(value) {
  if (!object(value)) throw new Error('Invalid discovery data')
  const result = {
    foodType: [...taxonomy.foodTypes, 'anything'].includes(value.foodType) ? value.foodType : null,
    flavors: uniqueKnown(value.flavors, taxonomy.preferenceFlavors).slice(0, 2),
    adventurousness: ['familiar', 'different', 'adventurous', 'surprise-me'].includes(value.adventurousness) ? value.adventurousness : null,
    region: [...taxonomy.regions, 'surprise-me'].includes(value.region) ? value.region : null,
  }
  return JSON.stringify(result) === JSON.stringify({ foodType: value.foodType, flavors: value.flavors, adventurousness: value.adventurousness, region: value.region }) ? result : markRepaired(result)
}

export function normalizeFavorites(value) {
  if (!object(value)) throw new Error('Invalid favorites data')
  const result = { dishIds: uniqueKnown(value.dishIds ?? value.favoriteIds, records.map(dish => dish.id)),
    restaurantIds: uniqueKnown(value.restaurantIds, mockRestaurants.map(restaurant => restaurant.id)) }
  return JSON.stringify(result) === JSON.stringify({ dishIds: value.dishIds ?? value.favoriteIds, restaurantIds: value.restaurantIds }) ? result : markRepaired(result)
}

function normalizeLog(value) {
  if (!object(value) || !validId(value.id) || !validDate(value.completedAt) || !validDate(value.startedAt) || !validDay(value.day)) return null
  const dish = records.find(item => item.id === value.dishId)
  const restaurant = mockRestaurants.find(item => item.id === value.restaurantId)
  if (!dish || !restaurant || !restaurantServesDish(restaurant, dish.id)) return null
  if (!object(value.verification) || typeof value.verification.verified !== 'boolean' || !['location-demo', 'qr-demo', 'receipt-demo', 'unverified'].includes(value.verification.method)) return null
  if (value.verification.verified !== (value.verification.method !== 'unverified')) return null
  if (!object(value.feedback) || !feedbackReactions.some(reaction => reaction.id === value.feedback.reaction)) return null
  const result = {
    id: value.id, dishId: dish.id, restaurantId: restaurant.id, countryCode: dish.countryCode,
    startedAt: value.startedAt, completedAt: value.completedAt, day: value.day,
    verification: { verified: value.verification.verified, method: value.verification.method, source: 'development', checkedAt: validDate(value.verification.checkedAt) ? value.verification.checkedAt : value.startedAt },
    feedback: { reaction: value.feedback.reaction, observations: uniqueKnown(value.feedback.observations, feedbackObservations), note: typeof value.feedback.note === 'string' ? value.feedback.note.slice(0, 1000) : '' },
  }
  return result.countryCode !== value.countryCode || JSON.stringify(result.feedback) !== JSON.stringify(value.feedback) || result.verification.checkedAt !== value.verification.checkedAt ? markRepaired(result) : result
}

/** Persist events, not competing progress/unlock snapshots. Rehydrate through the
 * same domain reducer so refresh cannot add daily credit or duplicate a reward.
 * Legacy snapshots are accepted via their logs/boxes; invalid records are ignored.
 */
export function normalizeExperience(value) {
  if (!object(value) || !Array.isArray(value.logs)) throw new Error('Invalid experience data')
  let state = createExperienceState()
  let repaired = false
  const seen = new Set()
  for (const valueLog of value.logs) {
    const log = normalizeLog(valueLog)
    if (!log || seen.has(log.id)) { repaired = true; continue }
    if (log[REPAIRED_STATE]) repaired = true
    seen.add(log.id)
    state = experienceReducer(state, { type: 'start', draft: log })
    state = experienceReducer(state, { type: 'complete', id: log.id, at: log.completedAt, day: log.day })
  }
  const opened = Array.isArray(value.openedBoxes) ? value.openedBoxes : object(value.boxes) ? Object.values(value.boxes).filter(box => box?.status === 'opened') : []
  const validOpened = opened.filter(box => object(box) && validDate(box.openedAt))
  if (validOpened.length !== opened.length || ('openedBoxes' in value && !Array.isArray(value.openedBoxes))) repaired = true
  for (const box of validOpened.sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt))) {
    if (!state.boxes[box.id] || state.boxes[box.id].status === 'opened') { repaired = true; continue }
    state = experienceReducer(state, { type: 'begin-box', id: box.id })
    state = experienceReducer(state, { type: 'open-box', id: box.id, at: box.openedAt })
  }
  const allowedFavorites = collectionCountries.flatMap(country => collectibleDefinitions.map(item => collectibleKey(country.id, item.id))).filter(key => state.unlocks[key])
  const favorites = uniqueKnown(value.favorites, allowedFavorites)
  const result = { ...state, drafts: {}, favorites }
  return repaired || !Array.isArray(value.favorites) || favorites.length !== value.favorites.length ? markRepaired(result) : result
}

export function serializeExperience(state) {
  return {
    logs: state.logs.map(({ returnState, ...log }) => log),
    openedBoxes: Object.values(state.boxes).filter(box => box.status === 'opened').map(box => ({ id: box.id, openedAt: box.openedAt })),
    favorites: state.favorites,
  }
}
