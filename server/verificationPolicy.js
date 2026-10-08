import { LOCATION_DEFAULTS } from '../shared/visitVerification.js'
import { haversineMiles, validCoordinates } from '../shared/nearbyRestaurants.js'

const bounded = (v, fallback, low, high) => Number.isFinite(Number(v)) && Number(v) >= low && Number(v) <= high ? Number(v) : fallback
export function locationPolicy(env = process.env) {
  return { ...LOCATION_DEFAULTS, radiusMeters: bounded(env.NOM_VISIT_RADIUS_METERS, 150, 50, 250),
    maxAccuracyMeters: bounded(env.NOM_VISIT_MAX_ACCURACY_METERS, 100, 10, 100),
    maxAccuracyAllowanceMeters: bounded(env.NOM_VISIT_ACCURACY_ALLOWANCE_METERS, 30, 0, 30) }
}
export function verifyLocation(samples, restaurant, now = Date.now(), policy = LOCATION_DEFAULTS) {
  if (!validCoordinates(restaurant)) return { result: 'location_unavailable' }
  if (!Array.isArray(samples) || !samples.length || samples.length > 3) return { result: 'location_unavailable' }
  const fresh = samples.filter(s => validCoordinates(s) && Number.isFinite(s.accuracy) && s.accuracy >= 0
    && Number.isFinite(s.timestamp) && s.timestamp <= now + 2000 && now - s.timestamp <= policy.maxAgeMs)
  if (!fresh.length) return { result: 'location_unavailable' }
  const best = [...fresh].sort((a, b) => a.accuracy - b.accuracy)[0]
  if (best.accuracy > policy.maxAccuracyMeters) return { result: 'poor_accuracy' }
  const distance = haversineMiles(best, restaurant) * 1609.344
  const allowance = Math.min(best.accuracy / 2, policy.maxAccuracyAllowanceMeters)
  return { result: distance <= policy.radiusMeters + allowance ? 'verified' : 'too_far',
    distanceMeters: Math.round(distance), accuracyMeters: Math.round(best.accuracy) }
}

export const normalizedMerchant = value => typeof value === 'string' ? value.normalize('NFKD').replace(/\p{M}/gu, '')
  .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim() : ''
export function receiptPolicy(env = process.env) {
  return { maxAgeHours: bounded(env.NOM_RECEIPT_MAX_AGE_HOURS, 72, 1, 72), minimumConfidence: 0.85 }
}
export function verifyReceipt(ocr, restaurant, now = Date.now(), policy = receiptPolicy()) {
  if (!ocr || !Number.isFinite(ocr.confidence) || ocr.confidence > 1 || ocr.confidence < policy.minimumConfidence || typeof ocr.text !== 'string' || ocr.text.length > 100000) return { result: 'could_not_verify' }
  const text = normalizedMerchant(ocr.text), name = normalizedMerchant(restaurant.name), address = normalizedMerchant(restaurant.address)
  if (name.length < 5 || !(` ${text} `).includes(` ${name} `)) return { result: 'wrong_restaurant' }
  // Require branch/address evidence, not merely a chain's merchant name.
  const addressTokens = address.split(' ').filter(t => t.length >= 3 || /^\d+$/.test(t))
  if (addressTokens.length < 3 || !addressTokens.some(t => /^\d+$/.test(t) && (` ${text} `).includes(` ${t} `))
    || addressTokens.filter(t => (` ${text} `).includes(` ${t} `)).length < Math.min(4, addressTokens.length)) return { result: 'wrong_restaurant' }
  const dates = new Set()
  for (const m of ocr.text.matchAll(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/g)) dates.add(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`)
  for (const m of ocr.text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g)) dates.add(`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`)
  if (dates.size !== 1) return { result: 'could_not_verify' }
  const date = [...dates][0], timestamp = Date.parse(date+'T00:00:00Z')
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0,10) !== date || timestamp > now || now - timestamp > policy.maxAgeHours * 3600000) return { result: 'old_receipt' }
  return { result: 'verified', confidence: ocr.confidence }
}
