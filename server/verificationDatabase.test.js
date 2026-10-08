import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {createHash,randomUUID} from 'node:crypto'
import {beforeAll,afterAll,describe,it,expect} from 'vitest'
import {signProof} from './verificationSignature.js'
import {fixtureSigningSecret} from '../src/test/verificationFixtures.js'

let db
const a='00000000-0000-4000-8000-00000000000a',b='00000000-0000-4000-8000-00000000000b',token='a'.repeat(43)
const hash=s=>createHash('sha256').update(s).digest('hex')
beforeAll(async()=>{
  db=new PGlite()
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;insert into auth.users values ('${a}'),('${b}');`)
  for(const file of ['202610060001_nom_accounts.sql','20261006234854_nom_visit_verification.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
},30000)
afterAll(async()=>{await db?.close()})
async function asUser(id,fn){await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`);try{return await fn()}finally{await db.exec('reset role')}}
function proof({id=randomUUID(),visitId=randomUUID(),userId=null,method='location',nonce=null,date='2026-10-06T12:00:00Z',dish='lort-cha'}={}){
  const row={id,visit_id:visitId,user_id:userId,subject_hash:hash('test-subject'),claim_hash:hash(token),dish_id:dish,restaurant_id:'google:trusted-place',country_code:'KH',
    method,verified_at:date,distance_meters:method==='location'?42:null,accuracy_meters:method==='location'?8:null,receipt_confidence:method==='receipt'?.99:null,
    qr_nonce:nonce,evidence_hash:method==='receipt'?hash('receipt-'+id):null,image_hash:method==='receipt'?hash('image-'+id):null,version:1}
  return {...row,...signProof(row,fixtureSigningSecret)}
}
async function issue(p){return (await db.query('select public.issue_nom_visit_verification($1::jsonb) as result',[JSON.stringify(p)])).rows[0].result}
function meal(p){return {id:p.visit_id,dish_id:p.dish_id,restaurant_id:p.restaurant_id,country_code:p.country_code,started_at:p.verified_at,completed_at:p.verified_at,local_day:p.verified_at.slice(0,10),verified:true,
  verification_id:p.id,verification_status:'verified',verification_method:p.method,verification_source:'nom-server',verification_checked_at:p.verified_at,verification_version:1,
  feedback_reaction:'loved',feedback_observations:[],feedback_note:'Fixture'} }
async function claim(p,owner=a,claimToken=token){return asUser(owner,()=>db.query('select public.record_nom_verified_meal($1::jsonb,$2::text)',[JSON.stringify(meal(p)),claimToken]))}
describe('PostgreSQL verification migration, real triggers/RLS/RPCs (local)',()=>{
  it('creates RLS and denies client issuance/rate-budget mutation',async()=>{
    expect((await db.query("select relrowsecurity from pg_class where relname='visit_verifications'")).rows[0].relrowsecurity).toBe(true)
    await asUser(a,async()=>{
      await expect(db.query('select public.issue_nom_visit_verification($1::jsonb)',[JSON.stringify(proof())])).rejects.toThrow(/permission denied/)
      await expect(db.query('select public.consume_nom_verification_budget($1)',[hash('abuse')])).rejects.toThrow(/permission denied/)
      await expect(db.query("select claim_hash from public.visit_verifications")).rejects.toThrow(/permission denied/)
    })
  })
  it('rejects arbitrary verified flags/direct REST writes without owned proof',async()=>{
    const p=proof();await issue(p)
    await asUser(a,async()=>await expect(db.query(`insert into public.meal_logs(user_id,id,dish_id,restaurant_id,country_code,started_at,completed_at,local_day,verification_method,verified,verification_source,verification_checked_at,feedback_reaction,verification_status,verification_id)
      values($1,$2,'lort-cha','google:trusted-place','KH',now(),now(),current_date,'location',true,'nom-server',now(),'loved','verified',$3)`,[a,p.visit_id,p.id])).rejects.toThrow(/owned server evidence/))
  })
  it('adopts legitimate Guest evidence, persists signature metadata and is retry-idempotent',async()=>{
    const p=proof();await issue(p);await claim(p);await claim(p)
    const rows=(await asUser(a,()=>db.query('select * from public.meal_logs where id=$1',[p.visit_id]))).rows
    expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({verified:true,verification_status:'verified',verification_method:'location-demo',verification_id:p.id,verification_signature:p.signature,verification_distance_meters:42})
    await expect(claim(p,b)).rejects.toThrow(/Invalid verification evidence/)
    expect((await asUser(b,()=>db.query('select id from public.visit_verifications where id=$1',[p.id]))).rows).toHaveLength(0)
  })
  it('rejects missing/null/wrong claims and mismatched restaurant/dish',async()=>{
    const p=proof();await issue(p)
    await expect(claim(p,a,null)).rejects.toThrow(/Invalid verification claim/)
    await expect(claim(p,a,'b'.repeat(43))).rejects.toThrow(/Invalid verification evidence/)
    const payload={...meal(p),restaurant_id:'google:forged'}
    await asUser(a,async()=>await expect(db.query('select public.record_nom_verified_meal($1::jsonb,$2)',[JSON.stringify(payload),token])).rejects.toThrow(/Invalid verification evidence/))
  })
  it('overrides forged timestamps/days/metadata with server values',async()=>{
    const p=proof({userId:b});await issue(p)
    const payload={...meal(p),local_day:'2099-01-01',completed_at:'2099-01-01T00:00:00Z',verification_distance_meters:0,verification_method:'receipt'}
    await asUser(b,()=>db.query('select public.record_nom_verified_meal($1::jsonb,$2)',[JSON.stringify(payload),token]))
    const row=(await db.query('select *,local_day::text as local_day from public.meal_logs where id=$1',[p.visit_id])).rows[0]
    expect(row.local_day).toContain('2026-10-06');expect(row.verification_method).toBe('location-demo');expect(row.verification_distance_meters).toBe(42)
  })
  it('enforces QR nonce and receipt/image replay rules atomically',async()=>{
    const nonce=randomUUID(),q=proof({method:'qr',nonce});expect((await issue(q)).record.id).toBe(q.id)
    expect((await issue(proof({method:'qr',nonce}))).result).toBe('already_used')
    const r=proof({method:'receipt'});await issue(r)
    expect((await issue({...proof({method:'receipt'}),evidence_hash:r.evidence_hash})).result).toBe('already_used')
    expect((await issue({...proof({method:'receipt'}),image_hash:r.image_hash})).result).toBe('already_used')
  })
  it('manual logs write history but cannot open a verified reward box',async()=>{
    const id=randomUUID()
    await asUser(b,()=>db.query(`insert into public.meal_logs(user_id,id,dish_id,restaurant_id,country_code,started_at,completed_at,local_day,verification_method,verified,verification_source,verification_checked_at,feedback_reaction)
      values($1,$2,'fish-amok','google:trusted-place','KH',now(),now(),current_date,'none',false,'manual',now(),'loved')`,[b,id]))
    await asUser(b,async()=>await expect(db.query("insert into public.opened_boxes(user_id,box_id,visit_id,country_id,collectible_id,duplicate,opened_at) values($1,$2,$3,'cambodia','lumi',false,now())",[b,'box-'+id,id])).rejects.toThrow(/verified country meal/))
  })
  it('counts only distinct verified dish/day events and protects reward choice',async()=>{
    const owned=(await db.query('select id from public.meal_logs where user_id=$1 and verified',[a])).rows[0]
    await asUser(a,async()=>await expect(db.query("insert into public.opened_boxes(user_id,box_id,visit_id,country_id,collectible_id,duplicate,opened_at) values($1,$2,$3,'cambodia','lumi',false,now())",[a,'box-'+owned.id,owned.id])).rejects.toThrow(/No verified box credit/))
    const last=[]
    for(const dish of ['num-banh-chok','fish-amok']){const p=proof({dish});await issue(p);await claim(p);last.push(p)}
    const p=last[1];await asUser(a,()=>db.query("insert into public.opened_boxes(user_id,box_id,visit_id,country_id,collectible_id,duplicate,opened_at) values($1,$2,$3,'cambodia','lumi',true,now())",[a,'box-'+p.visit_id,p.visit_id]))
    expect((await db.query('select collectible_id,duplicate from public.opened_boxes where user_id=$1',[a])).rows).toEqual([{collectible_id:'ziggy',duplicate:false}])
    // More logs of the same dish/day do not create more box credit.
    const repeat=proof({dish:'fish-amok'});await issue(repeat);await claim(repeat)
    await asUser(a,async()=>await expect(db.query("insert into public.opened_boxes(user_id,box_id,visit_id,country_id,collectible_id,duplicate,opened_at) values($1,$2,$3,'cambodia','kiko',false,now())",[a,'box-'+repeat.visit_id,repeat.visit_id])).rejects.toThrow(/No verified box credit/))
  })
  it('protects anonymous data access and retains own-row account isolation',async()=>{
    await db.exec('set role anon');try{await expect(db.query('select id from public.visit_verifications')).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
    const rows=(await asUser(b,()=>db.query('select user_id from public.meal_logs'))).rows;expect(rows.every(r=>r.user_id===b)).toBe(true)
  })
  it('uses a durable rate budget shared across handler instances',async()=>{
    const subject=hash('budget');for(let i=0;i<6;i++)expect((await db.query('select public.consume_nom_verification_budget($1) as ok',[subject])).rows[0].ok).toBe(true)
    expect((await db.query('select public.consume_nom_verification_budget($1) as ok',[subject])).rows[0].ok).toBe(false)
  })
  it('keeps replay prevention after disposable account deletion without retaining its identity',async()=>{
    const owner=randomUUID(),nonce=randomUUID()
    await db.query('insert into auth.users values($1)',[owner])
    const q=proof({method:'qr',nonce,userId:owner}),r=proof({method:'receipt',userId:owner})
    await issue(q);await issue(r);await claim(q,owner);await claim(r,owner)
    await db.query('delete from auth.users where id=$1',[owner])
    expect((await db.query('select id from public.visit_verifications where user_id=$1',[owner])).rows).toHaveLength(0)
    expect((await db.query('select id from public.meal_logs where user_id=$1',[owner])).rows).toHaveLength(0)
    expect((await issue(proof({method:'qr',nonce}))).result).toBe('already_used')
    expect((await issue({...proof({method:'receipt'}),image_hash:r.image_hash})).result).toBe('already_used')
    await asUser(a,async()=>await expect(db.query('select * from nom_private.verification_redemptions')).rejects.toThrow(/permission denied/))
  })
})
