import { EMPTY_ACTIVITY, EMPTY_DISCOVERY, normalizeActivity, normalizeExperience, normalizeFavorites, serializeExperience } from './persistedState'
import { createExperienceState } from './experienceState'
import { isUserMeal, meaningfulName } from './identityStorage'

export const TABLES = ['profiles', 'dish_favorites', 'restaurant_favorites', 'recent_dish_views', 'meal_logs', 'opened_boxes', 'collectible_favorites']

export function defaultJourney() {
  return { discovery: { ...EMPTY_DISCOVERY, flavors: [] }, favorites: { dishIds: [], restaurantIds: [] },
    activity: { ...EMPTY_ACTIVITY, recentDishes: [] }, experience: createExperienceState() }
}

export function mealToRow(log) {
  return { id: log.id, dish_id: log.dishId, restaurant_id: log.restaurantId, country_code: log.countryCode,
    started_at: log.startedAt, completed_at: log.completedAt, local_day: log.day,
    verification_method: log.verification.method, verified: log.verification.verified,
    verification_source: log.verification.source ?? null, verification_checked_at: log.verification.checkedAt ?? null,
    verification_status:log.verification.status,verification_id:log.verification.id??null,
    verification_distance_meters:log.verification.distanceMeters??null,verification_accuracy_meters:log.verification.accuracyMeters??null,
    receipt_confidence:log.verification.confidence??null,verification_version:log.verification.version??1,
    verification_proof:log.verification.proof??null,verification_signature:log.verification.signature??null,
    ...(log.verification.claimToken?{verification_claim_token:log.verification.claimToken}:{}),
    feedback_reaction: log.feedback.reaction, feedback_observations: log.feedback.observations, feedback_note: log.feedback.note }
}

export function boxToRow(box) {
  return { box_id: box.id, visit_id: box.visitId, country_id: box.countryId,
    collectible_id: box.collectibleId, duplicate: box.duplicate, opened_at: box.openedAt }
}

/** Only the historical, evidence-free wire contract is downgraded. Never turn
 * a malformed modern proof into an accepted verification or strip extra fields. */
export function normalizeLegacyMealPayload(payload) {
  if (!payload || typeof payload.verified !== 'boolean'
    || !['location-demo', 'qr-demo', 'receipt-demo', 'unverified'].includes(payload.verification_method)
    || ['verification_id', 'verification_proof', 'verification_signature', 'verification_claim_token'].some(key => payload[key] != null)) return payload
  return { ...payload, verified: false, verification_method: 'none', verification_status: 'unverified',
    verification_source: 'legacy', verification_version: 1, verification_id: null,
    verification_distance_meters: null, verification_accuracy_meters: null, receipt_confidence: null,
    verification_proof: null, verification_signature: null }
}

export function mealFromRow(row) {
  return { id: row.id, dishId: row.dish_id, restaurantId: row.restaurant_id, countryCode: row.country_code,
    startedAt: row.started_at, completedAt: row.completed_at, day: row.local_day,
    verification: { verified: row.verified, status:row.verification_status??'unverified',method: ({'location-demo':'location','qr-demo':'qr','receipt-demo':'receipt','unverified':'none'})[row.verification_method]??row.verification_method, source: row.verification_source ?? 'legacy', checkedAt: row.verification_checked_at,
      version:row.verification_version??1,id:row.verification_id,visitId:row.id,dishId:row.dish_id,restaurantId:row.restaurant_id,countryCode:row.country_code,
      distanceMeters:row.verification_distance_meters??null,accuracyMeters:row.verification_accuracy_meters??null,confidence:row.receipt_confidence??null,
      proof:row.verification_proof,signature:row.verification_signature },
    feedback: { reaction: row.feedback_reaction, observations: row.feedback_observations, note: row.feedback_note } }
}

export function cloudRowsToJourney(rows) {
  const profile = rows.profiles[0] ?? null
  return {
    discovery: { ...EMPTY_DISCOVERY, flavors: [] },
    activity: normalizeActivity({ displayName: profile?.display_name ?? 'Explorer',
      recentDishes: rows.recent_dish_views.map(row => ({ dishId: row.dish_id, viewedAt: row.viewed_at })).sort((a, b) => Date.parse(b.viewedAt) - Date.parse(a.viewedAt)) }),
    favorites: normalizeFavorites({ dishIds: rows.dish_favorites.filter(row => row.is_active).map(row => row.dish_id),
      restaurantIds: rows.restaurant_favorites.filter(row => row.is_active).map(row => row.restaurant_id) }),
    experience: normalizeExperience({
      logs: rows.meal_logs.map(mealFromRow).filter(isUserMeal).sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.id.localeCompare(b.id)),
      openedBoxes: rows.opened_boxes.filter(row => !/^box-qa-/i.test(row.box_id)).map(row => ({ id: row.box_id, visitId: row.visit_id,
        countryId: row.country_id, collectibleId: row.collectible_id, duplicate: row.duplicate, openedAt: row.opened_at })),
      favorites: rows.collectible_favorites.filter(row => row.is_active).map(row => `${row.country_id}:${row.collectible_id}`),
    }),
  }
}

export function mergeJourneys(account, guest, identityName = 'Explorer') {
  const union = (a, b) => [...new Set([...a, ...b])]
  const views = new Map(account.activity.recentDishes.map(view => [view.dishId, view]))
  for (const view of guest.activity.recentDishes) if (!views.has(view.dishId) || Date.parse(views.get(view.dishId).viewedAt) < Date.parse(view.viewedAt)) views.set(view.dishId, view)
  const cloud = serializeExperience(account.experience), local = serializeExperience(guest.experience)
  const logs = new Map(cloud.logs.filter(isUserMeal).map(log => [log.id, log]))
  for (const log of local.logs.filter(isUserMeal)) if (!logs.has(log.id)) logs.set(log.id, log)
  const opened = new Map(cloud.openedBoxes.map(box => [box.id, box]))
  for (const box of local.openedBoxes) if (logs.has(box.visitId) && !opened.has(box.id)) opened.set(box.id, box)
  const experience = normalizeExperience({ logs: [...logs.values()].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.id.localeCompare(b.id)),
    openedBoxes: [...opened.values()], favorites: union(cloud.favorites, local.favorites) })
  return {
    discovery: account.discovery,
    activity: normalizeActivity({ displayName: meaningfulName(account.activity.displayName) ? account.activity.displayName
      : meaningfulName(guest.activity.displayName) ? guest.activity.displayName : identityName,
    recentDishes: [...views.values()].sort((a, b) => Date.parse(b.viewedAt) - Date.parse(a.viewedAt)) }),
    favorites: normalizeFavorites({ dishIds: union(account.favorites.dishIds, guest.favorites.dishIds), restaurantIds: union(account.favorites.restaurantIds, guest.favorites.restaurantIds) }),
    experience: { ...experience, drafts: account.experience.drafts },
  }
}

/** Generate only user-owned relationships and completed source events. No
 * discovery answers, derived counters, demo unlocks or Places payloads enter
 * a mutation. Calling this on an unchanged snapshot produces no work. */
export function journeyMutations(before, after) {
  const mutations = []
  const relation = (kind, key, previous, next) => {
    for (const id of new Set([...previous, ...next])) if (previous.includes(id) !== next.includes(id)) mutations.push({ kind, target: id, payload: { [key]: id, is_active: next.includes(id) } })
  }
  relation('dishFavorite', 'dish_id', before.favorites.dishIds, after.favorites.dishIds)
  relation('restaurantFavorite', 'restaurant_id', before.favorites.restaurantIds, after.favorites.restaurantIds)
  if (before.activity.displayName !== after.activity.displayName) mutations.push({ kind: 'profile', target: 'profile', payload: { display_name: after.activity.displayName } })
  for (const view of after.activity.recentDishes) {
    const old = before.activity.recentDishes.find(item => item.dishId === view.dishId)
    if (!old || Date.parse(old.viewedAt) < Date.parse(view.viewedAt)) mutations.push({ kind: 'dishView', target: view.dishId, payload: { dish_id: view.dishId, viewed_at: view.viewedAt } })
  }
  for (const log of after.experience.logs.filter(isUserMeal)) if (!before.experience.logs.some(item => item.id === log.id)) mutations.push({ kind: 'meal', target: log.id, payload: mealToRow(log) })
  for (const box of Object.values(after.experience.boxes)) {
    if (box.status === 'opened' && before.experience.boxes[box.id]?.status !== 'opened' && after.experience.logs.some(log => isUserMeal(log) && log.id === box.visitId)) mutations.push({ kind: 'openedBox', target: box.id, payload: boxToRow(box) })
  }
  relation('collectibleFavorite', 'collectible_key', before.experience.favorites, after.experience.favorites.filter(key => after.experience.unlocks[key]))
  return mutations
}
