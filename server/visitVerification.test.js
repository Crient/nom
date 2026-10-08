import {describe,it,expect,vi} from 'vitest'
import {randomUUID} from 'node:crypto'
import {verifyLocation,verifyReceipt,locationPolicy} from './verificationPolicy.js'
import {signRestaurantQr,validateRestaurantQr,verificationSigningKey} from './restaurantQr.js'
import {createVisitVerificationHandler} from './visitVerificationHandler.js'
import {createReceiptOcrProvider,decodeReceiptUpload} from './receiptOcrProvider.js'
import {getVerificationRestaurant} from './verificationRestaurantProvider.js'
import {collectFreshLocation,createVisitVerificationApi} from '../src/data/liveVisitVerification.js'
import {fixtureSigningSecret} from '../src/test/verificationFixtures.js'

const now=Date.parse('2026-10-06T12:00:00Z'),venue={id:'google:trusted-place',name:'The Elephant Walk South End',address:'1415 Washington Street Boston MA 02118',latitude:42.340,longitude:-71.069}
const sample=(override={})=>({latitude:venue.latitude,longitude:venue.longitude,accuracy:8,timestamp:now,...override})
describe('Real location evidence',()=>{
  it('accepts an accurate fresh point inside the geofence',()=>expect(verifyLocation([sample()],venue,now)).toMatchObject({result:'verified',distanceMeters:0}))
  it('rejects a point outside the geofence',()=>expect(verifyLocation([sample({latitude:42.35})],venue,now).result).toBe('too_far'))
  it('rejects stale and future evidence',()=>{expect(verifyLocation([sample({timestamp:now-31000})],venue,now).result).toBe('location_unavailable');expect(verifyLocation([sample({timestamp:now+3000})],venue,now).result).toBe('location_unavailable')})
  it('rejects poor accuracy instead of expanding the radius',()=>expect(verifyLocation([sample({accuracy:1000})],venue,now).result).toBe('poor_accuracy'))
  it('selects the best fresh sample and caps configurable geofence/accuracy',()=>{expect(verifyLocation([sample({accuracy:99,latitude:42.35}),sample({accuracy:5})],venue,now).result).toBe('verified');expect(locationPolicy({NOM_VISIT_RADIUS_METERS:999999}).radiusMeters).toBe(150)})
  it.each([[1,'permission_denied'],[2,'location_unavailable'],[3,'timeout']])('handles browser permission/unavailable/timeout %s',async(code,result)=>{
    const geolocation={getCurrentPosition:vi.fn((_,fail)=>fail({code}))};expect((await collectFreshLocation({geolocation})).result).toBe(result)
  })
  it('requests high accuracy and no cached coordinates on every sample',async()=>{const geo={getCurrentPosition:vi.fn(ok=>ok({coords:{latitude:42,longitude:-71,accuracy:10},timestamp:now}))};const r=await collectFreshLocation({geolocation:geo,now:()=>now});expect(r.samples).toHaveLength(3);for(const args of geo.getCurrentPosition.mock.calls)expect(args[2]).toMatchObject({enableHighAccuracy:true,maximumAge:0})})
  it('drops stale browser samples and reports poor accuracy',async()=>{const geo={getCurrentPosition:ok=>ok({coords:{latitude:42,longitude:-71,accuracy:999},timestamp:now})};expect((await collectFreshLocation({geolocation:geo,now:()=>now})).result).toBe('poor_accuracy');expect((await collectFreshLocation({geolocation:geo,now:()=>now+31000})).result).toBe('location_unavailable')})
})
describe('Signed restaurant QR',()=>{
  const key=verificationSigningKey(fixtureSigningSecret),payload={restaurantId:venue.id,issuedAt:now/1000,expiresAt:now/1000+90,nonce:randomUUID()}
  it('accepts a valid server-signed restaurant token',()=>expect(validateRestaurantQr(signRestaurantQr(payload,key),venue.id,key,now).result).toBe('verified'))
  it('rejects invalid signatures/arbitrary contents',()=>{expect(validateRestaurantQr('https://arbitrary.example',venue.id,key,now).result).toBe('invalid_code');expect(validateRestaurantQr(signRestaurantQr(payload,Buffer.alloc(32)),venue.id,key,now).result).toBe('invalid_code')})
  it('rejects expired and wrong-restaurant tokens',()=>{const token=signRestaurantQr(payload,key);expect(validateRestaurantQr(token,venue.id,key,now+91000).result).toBe('expired_code');expect(validateRestaurantQr(token,'google:other',key,now).result).toBe('wrong_restaurant')})
})
describe('Receipt confidence and merchant/branch/date checks',()=>{
  const text='The Elephant Walk South End\n1415 Washington Street Boston MA 02118\n2026-10-06\nTOTAL $42.00'
  it('accepts matching merchant, address, recent date and confidence',()=>expect(verifyReceipt({text,confidence:.98},venue,now).result).toBe('verified'))
  it('rejects another restaurant or branch',()=>{expect(verifyReceipt({text:text.replace('Elephant Walk','Another Place'),confidence:.98},venue,now).result).toBe('wrong_restaurant');expect(verifyReceipt({text:text.replace('1415 Washington','12 Main'),confidence:.98},venue,now).result).toBe('wrong_restaurant')})
  it('rejects old receipts, low confidence and unreadable OCR',()=>{expect(verifyReceipt({text:text.replace('2026-10-06','2026-10-01'),confidence:.98},venue,now).result).toBe('old_receipt');expect(verifyReceipt({text,confidence:.4},venue,now).result).toBe('could_not_verify');expect(verifyReceipt({text:'',confidence:0},venue,now).result).toBe('could_not_verify')})
  it('never substitutes simulated OCR when no provider is configured',async()=>expect(createReceiptOcrProvider().analyze('image')).rejects.toMatchObject({code:'provider_not_configured'}))
  it('returns provider failure without forwarding raw errors or credentials',async()=>expect(createReceiptOcrProvider({apiKey:'test-only',fetchImpl:async()=>{throw new Error('secret upstream error')}}).analyze('image')).rejects.toMatchObject({code:'provider_error'}))
  it('rejects forged MIME types and oversized uploads',()=>{expect(()=>decodeReceiptUpload({type:'image/jpeg',base64:Buffer.from('not an image').toString('base64')})).toThrow();expect(()=>decodeReceiptUpload({type:'image/png',base64:'a'.repeat(2800001)})).toThrow()})
  it('parses real Vision OCR response confidence without retaining raw images',async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({responses:[{fullTextAnnotation:{text,pages:[{blocks:[{paragraphs:[{words:[{confidence:.9},{confidence:1}]}]}]}]}}]})}));const r=await createReceiptOcrProvider({apiKey:'test-only',fetchImpl}).analyze('image');expect(r).toEqual({text,confidence:.95});expect(fetchImpl.mock.calls[0][0]).not.toContain('test-only');expect(r).not.toHaveProperty('image')
  })
})
function harness({ready=true,ocrKey=null,qrPartners=[],restaurantProvider=async()=>venue}={}){
  const records=new Map(),repo={ready:async()=>ready,user:async()=>randomUUID(),budget:async()=>true,find:async id=>records.get(id),grant:async row=>{records.set(row.visit_id,row);return {record:row}}}
  const handler=createVisitVerificationHandler({getConfig:()=>({url:'https://iwamwxsosrhxsdcsuoiu.supabase.co',secret:fixtureSigningSecret,placesKey:'test-only',ocrKey,qrPartners}),repositoryFactory:()=>repo,restaurantProvider,now:()=>now})
  async function invoke(body,method='POST',headers={}){const req={method,headers:{host:'nom.test',origin:'https://nom.test','x-nom-verification':'1','content-type':'application/json',...headers},body};const res={headers:{},setHeader(k,v){this.headers[k]=v},end(text){this.body=JSON.parse(text)}};await handler(req,res);return res}
  return {invoke,records,repo}
}
describe('Protected verification endpoint',()=>{
  it('times out a stalled verification request and distinguishes deliberate cancellation',async()=>{
    const fetchImpl=(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('Aborted'),{name:'AbortError'})),{once:true}))
    const api=createVisitVerificationApi({fetchImpl,timeoutMs:1})
    expect((await api.verify({id:randomUUID()},'location')).result).toBe('timeout')
    const controller=new AbortController(),pending=api.verify({id:randomUUID()},'location',{},controller.signal)
    await Promise.resolve();controller.abort()
    expect((await pending).result).toBe('cancelled')
  })
  it('does not silently downgrade a changed authenticated session to Guest',async()=>{
    const fetchImpl=vi.fn(),api=createVisitVerificationApi({fetchImpl,getToken:async()=>{throw Object.assign(new Error('Changed'),{code:'sign_in_required'})}})
    expect((await api.verify({id:randomUUID()},'location')).result).toBe('sign_in_required')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  const input=()=>({visitId:randomUUID(),dishId:'lort-cha',restaurantId:venue.id,method:'location',samples:[sample()]})
  it('issues signed, bound verification metadata without retaining coordinates',async()=>{const {invoke,records}=harness();const r=await invoke(input());expect(r.statusCode).toBe(200);expect(r.body.verification).toMatchObject({verified:true,source:'nom-server',method:'location',distanceMeters:0});expect(r.body.verification.signature).toHaveLength(128);expect(JSON.stringify([...records.values()])).not.toMatch(/latitude|longitude|samples/);expect(r.headers['Set-Cookie']).toContain('HttpOnly')})
  it('rejects forged restaurant coordinates in the request',async()=>{const r=await harness().invoke({...input(),restaurantLatitude:42,restaurantLongitude:-71});expect(r.statusCode).toBe(400)})
  it('uses trusted server-fetched coordinates rather than selected-client coordinates',async()=>{const r=await harness({restaurantProvider:async()=>({...venue,latitude:0,longitude:0})}).invoke(input());expect(r.body.result).toBe('too_far')})
  it('fails closed on storage/server failure and missing OCR',async()=>{expect((await harness({ready:false}).invoke(input())).body.result).toBe('server_error');expect((await harness().invoke({...input(),method:'receipt'})).body.result).toBe('provider_not_configured');expect((await harness({restaurantProvider:async()=>{throw new Error('failure')}}).invoke(input())).body.result).toBe('server_error')})
  it('hides QR until participating restaurants are configured',async()=>{const h=harness();expect((await h.invoke(null,'GET')).body.qr).toBe(false);expect((await h.invoke({...input(),method:'qr'})).body.result).toBe('method_unavailable')})
  it('enforces same-origin requests and persistent request budgets',async()=>{const h=harness();expect((await h.invoke(input(),'POST',{origin:'https://attacker.test'})).statusCode).toBe(403);h.repo.budget=async()=>false;expect((await h.invoke(input())).statusCode).toBe(429)})
  it('is idempotent for an identical visit and identity cookie',async()=>{const h=harness(),body=input(),first=await h.invoke(body);const cookie=first.headers['Set-Cookie'].split(';')[0];const second=await h.invoke(body,'POST',{cookie});expect(second.body.verification.id).toBe(first.body.verification.id);expect(h.records.size).toBe(1)})
  it('refuses another Guest adopting the same visit ID',async()=>{const h=harness(),body=input();await h.invoke(body);expect((await h.invoke(body)).statusCode).toBe(409)})
  it('fails browser-side when the server invents a verified boolean without a signed proof',async()=>{const api=createVisitVerificationApi({fetchImpl:async()=>({json:async()=>({result:'verified',verification:{verified:true}})})});expect((await api.verify({id:randomUUID()},'location')).result).toBe('server_error')})
  it('never trusts mismatched Google Place IDs or client-supplied venue data',async()=>{const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({id:'another-place',location:{latitude:42,longitude:-71}})}));await expect(getVerificationRestaurant(venue.id,'test-only',fetchImpl)).rejects.toThrow();expect(fetchImpl.mock.calls[0][1].headers['X-Goog-FieldMask']).toContain('location')})
})
