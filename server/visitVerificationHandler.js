import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { UUID } from '../shared/visitVerification.js'
import { isGoogleRestaurantId } from '../shared/nearbyRestaurants.js'
import { readBody } from './nearbyRestaurantsHandler.js'
import { getVerificationRestaurant } from './verificationRestaurantProvider.js'
import { verifyLocation, locationPolicy, verifyReceipt, receiptPolicy, normalizedMerchant } from './verificationPolicy.js'
import { createReceiptOcrProvider, decodeReceiptUpload } from './receiptOcrProvider.js'
import { validateRestaurantQr, verificationSigningKey } from './restaurantQr.js'
import { createVerificationRepository, verificationClient } from './verificationRepository.js'
import { signProof } from './verificationSignature.js'

const catalog = new Map(JSON.parse(readFileSync(new URL('../src/data/catalog/records.json',import.meta.url),'utf8')).map(d=>[d.id,d]))
const hash = value => createHash('sha256').update(value).digest('hex')
const claimToken = (id,key) => createHmac('sha256',key).update('claim:'+id).digest('base64url')
const configFromEnv = () => ({url:process.env.VITE_SUPABASE_URL,secret:process.env.SUPABASE_SECRET_KEY,placesKey:process.env.GOOGLE_PLACES_API_KEY,
  ocrKey:process.env.NOM_RECEIPT_OCR_API_KEY,qrPartners:(process.env.NOM_QR_PARTICIPATING_PLACES ?? '').split(',').filter(Boolean),env:process.env})
function validOrigin(req) {
  try { const u=new URL(req.headers.origin);return ['http:','https:'].includes(u.protocol)&&u.host===req.headers.host
    && req.headers['x-nom-verification']==='1'&&!['cross-site','same-site'].includes(req.headers['sec-fetch-site']) } catch {return false}
}
function guestSubject(req,res,key) {
  const token=(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nom_visit='))?.slice(10)
  const [id,tag]=token?.split('.')??[]
  if(UUID.test(id??'')&&typeof tag==='string') {const expected=createHmac('sha256',key).update('guest:'+id).digest();const actual=Buffer.from(tag,'base64url');if(actual.length===expected.length&&timingSafeEqual(actual,expected))return 'guest:'+id}
  const fresh=randomUUID(), signed=createHmac('sha256',key).update('guest:'+fresh).digest('base64url')
  res.setHeader('Set-Cookie',`nom_visit=${fresh}.${signed}; HttpOnly; SameSite=Strict; Path=/api/visit-verification; Max-Age=31536000${req.headers.origin?.startsWith('https:')?'; Secure':''}`)
  return 'guest:'+fresh
}
function responseVerification(row,key) {
  return {status:'verified',verified:true,source:'nom-server',version:1,method:row.method,id:row.id,visitId:row.visit_id,
    dishId:row.dish_id,restaurantId:row.restaurant_id,countryCode:row.country_code,checkedAt:row.verified_at,
    distanceMeters:row.distance_meters,accuracyMeters:row.accuracy_meters,confidence:row.receipt_confidence,
    proof:row.proof,signature:row.signature,claimToken:claimToken(row.id,key)}
}
export function createVisitVerificationHandler({getConfig=configFromEnv,repositoryFactory=createVerificationRepository,
  restaurantProvider=getVerificationRestaurant,ocrFactory=createReceiptOcrProvider,now=Date.now}={}) {
  return async (req,res)=>{
    res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff')
    const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data))}
    if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return send(405,{result:'server_error'})}
    if(req.method==='POST'&&!validOrigin(req))return send(403,{result:'server_error'})
    try {
      const config=getConfig(),client=verificationClient(config),repo=client?repositoryFactory(client):null
      const ready=repo&&await repo.ready()
      if(req.method==='GET')return send(200,{location:!!(ready&&config.placesKey),receipt:!!(ready&&config.placesKey&&config.ocrKey),qr:!!(ready&&config.placesKey&&config.qrPartners?.length),version:1})
      if(!ready)return send(503,{result:'server_error'})
      if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??''))return send(415,{result:'upload_error'})
      const body=await readBody(req,2900000)
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['visitId','dishId','restaurantId','method','samples','qrToken','receipt'].includes(k))
        ||!UUID.test(body.visitId??'')||!catalog.has(body.dishId)||!isGoogleRestaurantId(body.restaurantId)||!['location','qr','receipt'].includes(body.method))return send(400,{result:'server_error'})
      const key=verificationSigningKey(config.secret),authorization=req.headers.authorization
      let userId=null
      if(authorization!==undefined){const token=/^Bearer ([^\s]{1,8192})$/.exec(authorization)?.[1];if(!token)return send(401,{result:'sign_in_required'});userId=await repo.user(token)}
      const subject=userId?'user:'+userId:guestSubject(req,res,key),subjectHash=hash(subject)
      const old=await repo.find(body.visitId)
      if(old){if(old.subject_hash!==subjectHash||old.restaurant_id!==body.restaurantId||old.dish_id!==body.dishId)return send(409,{result:'already_used'});return send(200,{result:'verified',verification:responseVerification(old,key)})}
      if(!await repo.budget(subjectHash))return send(429,{result:'rate_limited'})
      if(body.method==='qr'&&!config.qrPartners?.includes(body.restaurantId))return send(503,{result:'method_unavailable'})
      if(body.method==='receipt'&&!config.ocrKey)return send(503,{result:'provider_not_configured'})
      const restaurant=await restaurantProvider(body.restaurantId,config.placesKey)
      let decision,evidenceHash=null,nonce=null,imageHash=null
      if(body.method==='location')decision=verifyLocation(body.samples,restaurant,now(),locationPolicy(config.env))
      if(body.method==='qr'){decision=validateRestaurantQr(body.qrToken,body.restaurantId,key,now());nonce=decision.nonce??null}
      if(body.method==='receipt'){
        const image=decodeReceiptUpload(body.receipt);imageHash=hash(image)
        const ocr=await ocrFactory({apiKey:config.ocrKey}).analyze(image.toString('base64'))
        decision=verifyReceipt(ocr,restaurant,now(),receiptPolicy(config.env));evidenceHash=hash(body.restaurantId+':'+normalizedMerchant(ocr.text))
      }
      if(decision.result!=='verified')return send(200,{result:decision.result})
      const at=new Date(now()).toISOString(),row={id:randomUUID(),visit_id:body.visitId,user_id:userId,subject_hash:subjectHash,
        dish_id:body.dishId,restaurant_id:body.restaurantId,country_code:catalog.get(body.dishId).countryCode,
        method:body.method,verified_at:at,distance_meters:decision.distanceMeters??null,accuracy_meters:decision.accuracyMeters??null,
        receipt_confidence:decision.confidence??null,qr_nonce:nonce,evidence_hash:evidenceHash,image_hash:imageHash,version:1}
      row.claim_hash=hash(claimToken(row.id,key))
      Object.assign(row,signProof(row,config.secret))
      const granted=await repo.grant(row)
      if(granted?.result==='already_used')return send(409,{result:'already_used'})
      const stored=granted?.record
      if(!stored||stored.subject_hash!==subjectHash||stored.visit_id!==body.visitId)return send(503,{result:'server_error'})
      return send(200,{result:'verified',verification:responseVerification(stored,key)})
    }catch(error){return send(error.code==='sign_in_required'?401:error.code==='upload_error'?400:503,
      {result:['provider_not_configured','provider_error','upload_error','sign_in_required'].includes(error.code)?error.code:'server_error'})}
  }
}
