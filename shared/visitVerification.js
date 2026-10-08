import { ed25519 } from '@noble/curves/ed25519.js'
export const VERIFICATION_VERSION = 1
export const LOCATION_DEFAULTS = Object.freeze({ radiusMeters: 150, maxAccuracyMeters: 100, maxAccuracyAllowanceMeters: 30, maxAgeMs: 30_000, sampleCount: 3, sampleTimeoutMs: 4000 })
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const VERIFICATION_METHODS = ['location', 'qr', 'receipt', 'none']

export function manualVerification(at = new Date().toISOString()) {
  return { status: 'unverified', verified: false, method: 'none', source: 'manual', checkedAt: at, version: VERIFICATION_VERSION }
}

// Signed-in rewards are additionally enforced by the database proof ledger.
// A naked boolean or a legacy development result is never an eligible event.
export function rewardEligible(log) {
  const v = log?.verification
  const structural = Boolean(v?.verified && v.status === 'verified' && ['location', 'qr', 'receipt'].includes(v.method)
    && v.source === 'nom-server' && v.version === VERIFICATION_VERSION && UUID.test(v.id ?? '')
    && v.visitId === log.id && v.restaurantId === log.restaurantId && v.dishId === log.dishId
    && v.countryCode === log.countryCode && Number.isFinite(Date.parse(v.checkedAt)))
  if(!structural)return false
  try {
    const key=import.meta.env.VITE_NOM_VERIFICATION_PUBLIC_KEY
    if(!/^[a-f0-9]{64}$/.test(key??'')||typeof v.proof!=='string'||v.proof.length>2000||!/^[a-f0-9]{128}$/.test(v.signature??''))return false
    const hex=s=>Uint8Array.from(s.match(/../g),v=>parseInt(v,16))
    if(!ed25519.verify(hex(v.signature),new TextEncoder().encode(v.proof),hex(key)))return false
    const p=JSON.parse(v.proof)
    return ['id','visitId','dishId','restaurantId','countryCode','method','version'].every(k=>p[k]===v[k])
      && Date.parse(p.checkedAt)===Date.parse(v.checkedAt)
      && ['distanceMeters','accuracyMeters','confidence'].every(k=>(p[k]??null)===(v[k]??null))
  }catch{return false}
}

export function normalizeVerification(value, log) {
  if (!value || typeof value !== 'object') return null
  const safe = manualVerification(Number.isFinite(Date.parse(value.checkedAt)) ? value.checkedAt : log.startedAt)
  if (value.source === 'legacy' || ['location-demo', 'qr-demo', 'receipt-demo', 'unverified'].includes(value.method)) safe.source = 'legacy'
  if (['rejected', 'pending'].includes(value.status)) safe.status = value.status
  if (!rewardEligible({ ...log, verification: value })) return safe
  return { status: 'verified', verified: true, method: value.method, source: 'nom-server', version: VERIFICATION_VERSION,
    id: value.id, visitId: log.id, dishId: log.dishId, restaurantId: log.restaurantId, countryCode: log.countryCode,
    proof:value.proof,signature:value.signature,
    checkedAt: new Date(value.checkedAt).toISOString(), distanceMeters: Number.isFinite(value.distanceMeters) ? Math.max(0, value.distanceMeters) : null,
    accuracyMeters: Number.isFinite(value.accuracyMeters) ? Math.max(0, value.accuracyMeters) : null,
    confidence: Number.isFinite(value.confidence) ? value.confidence : null,
    ...(typeof value.claimToken === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value.claimToken) ? { claimToken: value.claimToken } : {}) }
}
