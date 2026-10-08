import {createHmac,createPrivateKey,createPublicKey,sign} from 'node:crypto'
export function proofKey(secret) {
  if(!secret?.startsWith('sb_secret_'))throw new Error('Verification unavailable')
  const seed=createHmac('sha256',secret).update('nom/visit-proof/ed25519/v1').digest()
  return createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),seed]),format:'der',type:'pkcs8'})
}
export function verificationPublicKey(secret) {return createPublicKey(proofKey(secret)).export({format:'der',type:'spki'}).subarray(-32).toString('hex')}
export function signProof(row,secret) {
  const proof=JSON.stringify({id:row.id,visitId:row.visit_id,dishId:row.dish_id,restaurantId:row.restaurant_id,countryCode:row.country_code,
    method:row.method,checkedAt:new Date(row.verified_at).toISOString(),version:1,distanceMeters:row.distance_meters,accuracyMeters:row.accuracy_meters,confidence:row.receipt_confidence})
  return {proof,signature:sign(null,Buffer.from(proof),proofKey(secret)).toString('hex')}
}
