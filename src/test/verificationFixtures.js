import { createHash } from 'node:crypto'
import { signProof, verificationPublicKey } from '../../server/verificationSignature.js'
export const fixtureSigningSecret = ['sb','secret','local-verification-test-only'].join('_')
export const fixturePublicKey = verificationPublicKey(fixtureSigningSecret)
export function verifiedFixture({id='visit-1',dishId='lort-cha',restaurantId='preview-thmor-da',countryCode='KH',at='2026-10-03T12:00:00.000Z',method='location'}={}) {
  const proofId='00000000-0000-4000-8000-'+createHash('sha256').update(id).digest('hex').slice(0,12)
  const row={id:proofId,visit_id:id,dish_id:dishId,restaurant_id:restaurantId,country_code:countryCode,method,verified_at:at,distance_meters:method==='location'?42:null,
    accuracy_meters:method==='location'?10:null,receipt_confidence:method==='receipt'?0.95:null}
  return {verified:true,status:'verified',method,source:'nom-server',version:1,id:proofId,visitId:id,dishId,restaurantId,countryCode,checkedAt:at,
    distanceMeters:row.distance_meters,accuracyMeters:row.accuracy_meters,confidence:row.receipt_confidence,claimToken:'a'.repeat(43),...signProof(row,fixtureSigningSecret)}
}
