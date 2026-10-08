import { createHmac, timingSafeEqual } from 'node:crypto'
import { UUID } from '../shared/visitVerification.js'
import { isGoogleRestaurantId } from '../shared/nearbyRestaurants.js'

export function verificationSigningKey(secret) {
  if (typeof secret !== 'string' || !secret.startsWith('sb_secret_')) throw new Error('Verification unavailable')
  return createHmac('sha256', secret).update('nom/restaurant-verification/v1').digest()
}
export function signRestaurantQr(payload, key) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `nomqr1.${body}.${createHmac('sha256', key).update(body).digest('base64url')}`
}
export function validateRestaurantQr(token, restaurantId, key, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 2048) return { result: 'invalid_code' }
  const [type, body, signature, extra] = token.split('.')
  if (type !== 'nomqr1' || !body || !signature || extra) return { result: 'invalid_code' }
  const actual = Buffer.from(signature,'base64url'), expected = createHmac('sha256',key).update(body).digest()
  if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) return { result: 'invalid_code' }
  let payload
  try { payload = JSON.parse(Buffer.from(body,'base64url').toString()) } catch { return { result: 'invalid_code' } }
  if (!isGoogleRestaurantId(payload.restaurantId) || !UUID.test(payload.nonce ?? '') || !Number.isSafeInteger(payload.issuedAt) || !Number.isSafeInteger(payload.expiresAt)
    || payload.expiresAt <= payload.issuedAt || payload.expiresAt - payload.issuedAt > 120 || payload.issuedAt * 1000 > now + 2000) return { result: 'invalid_code' }
  if (payload.expiresAt * 1000 <= now) return { result: 'expired_code' }
  if (payload.restaurantId !== restaurantId) return { result: 'wrong_restaurant' }
  return { result: 'verified', nonce: payload.nonce }
}
