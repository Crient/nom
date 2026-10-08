import { createClient } from '@supabase/supabase-js'

const checked = result => { if (result.error) throw new Error('Verification storage unavailable'); return result.data }
export function createVerificationRepository(client) {
  return {
    async ready() { const r = await client.from('visit_verifications').select('id').limit(1); return !r.error },
    async user(token) { const r=await client.auth.getUser(token); if(r.error||!r.data.user) throw Object.assign(new Error('Sign in required'),{code:'sign_in_required'});return r.data.user.id },
    async budget(subject) { return checked(await client.rpc('consume_nom_verification_budget',{p_subject:subject})) === true },
    async find(visitId) { return checked(await client.from('visit_verifications').select('*').eq('visit_id',visitId).maybeSingle()) },
    async grant(row) { return checked(await client.rpc('issue_nom_visit_verification',{p_record:row})) },
  }
}
export function verificationClient(config) {
  if (config.url?.replace(/\/$/,'') !== 'https://iwamwxsosrhxsdcsuoiu.supabase.co' || !config.secret?.startsWith('sb_secret_')) return null
  return createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
}
