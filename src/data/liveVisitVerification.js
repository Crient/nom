import { LOCATION_DEFAULTS, normalizeVerification } from '../../shared/visitVerification'

export async function collectFreshLocation({ geolocation = globalThis.navigator?.geolocation, permissions = globalThis.navigator?.permissions,
  now = Date.now, signal, onPermission } = {}) {
  if(!geolocation)return {result:'location_unavailable'}
  let permission
  try { permission = await permissions?.query({ name: 'geolocation' }) } catch { /* Permissions API is optional. */ }
  if(signal?.aborted)return {result:'cancelled'}
  onPermission?.(permission?.state ?? 'unknown')
  if(permission?.state==='denied')return {result:'permission_denied'}
  const samples=[];let last='location_unavailable'
  for(let i=0;i<LOCATION_DEFAULTS.sampleCount;i++){
    if(signal?.aborted)return {result:'cancelled'}
    const sample=await new Promise(resolve=>{
      let settled=false,timer
      const done=value=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);permission?.removeEventListener?.('change',changed);resolve(value)}
      const startTimer=()=>{clearTimeout(timer);timer=setTimeout(()=>done({error:'timeout'}),LOCATION_DEFAULTS.sampleTimeoutMs)}
      const changed=()=>{
        onPermission?.(permission.state)
        if(permission.state==='denied')done({error:'permission_denied'})
        else if(permission.state==='granted')startTimer()
      }
      const cancel=()=>done({error:'cancelled'});signal?.addEventListener('abort',cancel,{once:true})
      permission?.addEventListener?.('change',changed)
      // Permission prompt time is not acquisition time. Wait for the user's
      // answer; cancellation/fallback remains available while it is unresolved.
      // Without the Permissions API, the browser's native timeout excludes
      // permission waiting. A JS watchdog is safe only after a known grant.
      if(permission?.state==='granted')startTimer()
      try{geolocation.getCurrentPosition(p=>done({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp}),
        e=>done({error:e.code===1?'permission_denied':e.code===3?'timeout':'location_unavailable'}),
        {enableHighAccuracy:true,maximumAge:0,timeout:LOCATION_DEFAULTS.sampleTimeoutMs})}catch{done({error:'location_unavailable'})}
    })
    if(sample.error){last=sample.error;if(['permission_denied','cancelled'].includes(last))return {result:last}}
    else if(Number.isFinite(sample.timestamp)&&sample.timestamp<=now()+2000&&now()-sample.timestamp<=LOCATION_DEFAULTS.maxAgeMs)samples.push(sample)
  }
  if(!samples.length)return {result:last}
  if(samples.every(s=>s.accuracy>LOCATION_DEFAULTS.maxAccuracyMeters))return {result:'poor_accuracy'}
  return {result:'samples',samples}
}

async function boundedRequest(fetchImpl,url,options,timeoutMs) {
  const controller=new AbortController(),cancel=()=>controller.abort()
  if(options.signal?.aborted)controller.abort()
  options.signal?.addEventListener('abort',cancel,{once:true})
  const timer=setTimeout(cancel,timeoutMs)
  try{return await fetchImpl(url,{...options,signal:controller.signal})}
  finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel)}
}

export function createVisitVerificationApi({fetchImpl=globalThis.fetch,getToken=async()=>null,timeoutMs=20_000}={}) {
  return {
    async capabilities(signal){try{const r=await boundedRequest(fetchImpl,'/api/visit-verification',{credentials:'same-origin',cache:'no-store',signal},5000);return r.ok?await r.json():{}}catch{return {}}},
    async verify(visit,method,evidence={},signal){
      try{
        const token=await getToken(),r=await boundedRequest(fetchImpl,'/api/visit-verification',{method:'POST',credentials:'same-origin',cache:'no-store',signal,
          headers:{'Content-Type':'application/json','X-Nom-Verification':'1',...(token?{Authorization:`Bearer ${token}`}:{})},
          body:JSON.stringify({visitId:visit.id,dishId:visit.dishId,restaurantId:visit.restaurantId,method,...evidence})},timeoutMs)
        const data=await r.json()
        if(data.result==='verified'){
          const verification=normalizeVerification(data.verification,visit)
          if(!verification?.verified||!verification.claimToken)return {result:'server_error'}
          return {result:'verified',verification}
        }
        return {result:data.result??'server_error'}
      }catch(error){return {result:error.name==='AbortError'?(signal?.aborted?'cancelled':'timeout'):error.code==='sign_in_required'?'sign_in_required':'server_error'}}
    },
  }
}

export async function receiptUpload(file) {
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2000000)throw new Error('Choose a JPEG, PNG or WebP receipt smaller than 2 MB.')
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('The receipt could not be read. Please try again.'));reader.onload=()=>resolve({type:file.type,base64:String(reader.result).split(',')[1]});reader.readAsDataURL(file)})
}
