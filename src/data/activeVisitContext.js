import records from './catalog/records.json'
import { mockRestaurants } from './mockRestaurants'
import { restaurantServesDish } from './mockRestaurantMenus'
import { isGoogleRestaurantId } from '../../shared/nearbyRestaurants.js'
import { UUID } from '../../shared/visitVerification'

export const ACTIVE_VISIT_MAX_AGE_MS = 6 * 60 * 60 * 1000
const MAX_ACTIVE_VISITS = 8
const name = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200) : ''

/** Recovery is routing context, never evidence. Explicit fields prevent GPS,
 * tokens, feedback, arbitrary router state and signed material entering storage. */
function context(value, now) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.status !== 'active'
    || value.completed === true || value.completedAt != null
    || typeof value.id !== 'string'
    || !(UUID.test(value.id) || /^visit-[0-9]{13}-[1-9][0-9]{0,8}$/.test(value.id))) return null
  const started = typeof value.startedAt === 'string' ? Date.parse(value.startedAt) : NaN
  if (!Number.isFinite(started) || started > now || now - started >= ACTIVE_VISIT_MAX_AGE_MS) return null
  const dish = records.find(dish => dish.id === value.dishId)
  const restaurant = mockRestaurants.find(restaurant => restaurant.id === value.restaurantId)
  if (!dish || value.countryCode !== dish.countryCode || !name(value.restaurantName)
    || (!isGoogleRestaurantId(value.restaurantId) && (!restaurant || !restaurantServesDish(restaurant, dish.id)))) return null
  return { id: value.id, dishId: dish.id, restaurantId: value.restaurantId, restaurantName: name(value.restaurantName),
    countryCode: dish.countryCode, startedAt: value.startedAt, status: 'active', surprise: value.surprise === true }
}

export function recoverActiveVisits(values, logs, now = Date.now()) {
  if (!Array.isArray(values)) return {}
  const completed = new Set(logs.map(log => log.id)), drafts = {}
  for (const value of values.slice(-MAX_ACTIVE_VISITS)) {
    const safe = context(value, now)
    if (!safe || completed.has(safe.id) || drafts[safe.id]) continue
    const { status, surprise, ...identifiers } = safe
    drafts[safe.id] = { ...identifiers, ...(surprise ? { returnState: { surprise: true } } : {}), verification: null, feedback: null }
  }
  return drafts
}

export function serializeActiveVisits(state, now = Date.now()) {
  if (state.qaOnly) return []
  const completed = new Set(state.logs.map(log => log.id))
  return Object.values(state.drafts).filter(draft => !completed.has(draft.id)
    && !['qa-preview', 'demo-seed'].includes(draft.verification?.source))
    .map(draft => context({ ...draft, status: 'active', restaurantName: draft.restaurantName ?? 'Selected restaurant',
      surprise: draft.returnState?.surprise === true }, now)).filter(Boolean)
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)).slice(-MAX_ACTIVE_VISITS)
}
