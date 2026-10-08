import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { signProof } from './verificationSignature.js'
import { fixtureSigningSecret } from '../src/test/verificationFixtures.js'
import { mealFromRow } from '../src/data/cloudState.js'
import { normalizeExperience } from '../src/data/persistedState.js'
import { isGoogleRestaurantId } from '../shared/nearbyRestaurants.js'

// No provider credentials or network. These roles mirror the account schema;
// hosted Supabase grants/event triggers still require separately approved QA.
const sql = name => readFileSync(new URL('../supabase/' + name, import.meta.url), 'utf8')
const migration = sql('migrations/20261006234854_nom_visit_verification.sql')
const a = randomUUID(), b = randomUUID(), token = 'a'.repeat(43), at = '2026-10-07T12:00:00.000Z'
const hash = value => createHash('sha256').update(value).digest('hex')
let db, legacyRows
async function base() {
  const local = new PGlite()
  await local.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;`)
  await local.exec(sql('migrations/202610060001_nom_accounts.sql'))
  await local.query('insert into auth.users values($1),($2)', [a,b])
  return local
}
async function asRole(local, role, userId, fn) {
  await local.exec(`set role ${role}`)
  await local.query("select set_config('request.jwt.claim.sub',$1,false)", [userId ?? ''])
  try { return await fn() } finally { await local.exec('reset role') }
}
function oldMeal(method = 'location-demo', restaurant = 'google:trusted-place') {
  return { user_id:a,id:randomUUID(),dish_id:'lort-cha',restaurant_id:restaurant,country_code:'KH',started_at:at,completed_at:at,
    local_day:at.slice(0,10),verification_method:method,verified:method!=='unverified',verification_source:'development',verification_checked_at:at,
    feedback_reaction:'loved',feedback_observations:['Savory'],feedback_note:'Original feedback survives' }
}
const insertMeal = (local, row) => {
  const columns=Object.keys(row)
  if(!columns.every(name=>/^[a-z_]+$/.test(name)))throw new Error('Invalid fixture column')
  // REST omits unspecified columns, letting PostgreSQL supply their defaults.
  return asRole(local,'authenticated',row.user_id,()=>local.query(`insert into public.meal_logs(${columns.join(',')}) select ${columns.join(',')} from jsonb_populate_record(null::public.meal_logs,$1::jsonb)`, [JSON.stringify(row)]))
}
async function rows(local, owner = a) {
  return JSON.parse(JSON.stringify((await local.query('select *,local_day::text as local_day from public.meal_logs where user_id=$1 order by id',[owner])).rows))
}
function proof(restaurant = 'google:trusted-place', extra = {}) {
  const p = { id:randomUUID(),visit_id:randomUUID(),user_id:null,subject_hash:hash(a),claim_hash:hash(token),dish_id:'lort-cha',restaurant_id:restaurant,
    country_code:'KH',method:'location',verified_at:at,distance_meters:0,accuracy_meters:8,receipt_confidence:null,qr_nonce:null,evidence_hash:null,image_hash:null,version:1,...extra }
  return {...p,...signProof(p,fixtureSigningSecret)}
}
const issue = (local,p) => asRole(local,'service_role',null,()=>local.query('select public.issue_nom_visit_verification($1::jsonb)',[JSON.stringify(p)]))
const claim = (local,p,owner=a) => asRole(local,'authenticated',owner,()=>local.query('select public.record_nom_verified_meal($1::jsonb,$2)',[JSON.stringify({ id:p.visit_id,
  dish_id:p.dish_id,restaurant_id:p.restaurant_id,country_code:p.country_code,started_at:at,verification_id:p.id,feedback_reaction:'loved',feedback_observations:[],feedback_note:'Real evidence' }),token]))

// Exact method/boolean rejection gates from Production HEAD c13329e's
// persistedState.normalizeLog. This freezes the compatibility contract, rather
// than letting future changes to the new reader silently weaken the test.
function productionReads(row) {
  return ['location-demo','qr-demo','receipt-demo','unverified'].includes(row.verification_method)
    && typeof row.verified === 'boolean' && row.verified === (row.verification_method !== 'unverified')
}
beforeAll(async()=>{
  db=await base()
  legacyRows=['location-demo','qr-demo','receipt-demo','unverified'].map(method=>oldMeal(method))
  for(const row of legacyRows) await insertMeal(db,row)
  await db.exec(migration)
},30000)
afterAll(async()=>{await db?.close()})

describe('schema-first compatibility and forward recovery (local PostgreSQL)',()=>{
  it('preserves all pre-existing IDs, timestamps and feedback without retroactive verification',async()=>{
    const migrated=await rows(db)
    for(const original of legacyRows){
      const row=migrated.find(item=>item.id===original.id)
      expect(row).toMatchObject({...original,verified:false,verification_method:'unverified',verification_source:'legacy',verification_status:'unverified',verification_id:null})
      expect(productionReads(row)).toBe(true)
      expect(productionReads({...row,verification_method:'none'})).toBe(false) // old defect
    }
    const state=normalizeExperience({logs:migrated.map(mealFromRow),openedBoxes:[],favorites:[]})
    expect(state.logs).toHaveLength(4);expect(state.progress.cambodia.meals).toBe(0)
    expect(state.logs.every(log=>log.verification.source==='legacy')).toBe(true)
  })
  it.each(['location-demo','qr-demo','receipt-demo','unverified'])('accepts old %s writes and safe history-only outbox box retries',async method=>{
    const old=oldMeal(method);await insertMeal(db,old)
    const stored=(await rows(db)).find(row=>row.id===old.id)
    expect(stored).toMatchObject({verified:false,verification_method:'unverified',verification_id:null,verification_source:'legacy'})
    expect(productionReads(stored)).toBe(true)
    const open=()=>db.query("insert into public.opened_boxes values($1,$2,$3,'cambodia','lumi',false,now()) on conflict(user_id,box_id) do nothing",[a,'box-'+old.id,old.id])
    await asRole(db,'authenticated',a,open);await asRole(db,'authenticated',a,open)
    expect((await db.query('select count(*)::int as n from public.opened_boxes where visit_id=$1',[old.id])).rows[0].n).toBe(1)
    const hydrated=normalizeExperience({logs:(await rows(db)).map(mealFromRow),openedBoxes:[{id:'box-'+old.id,visitId:old.id,countryId:'cambodia',collectibleId:'lumi',duplicate:false,openedAt:at}],favorites:['cambodia:lumi']})
    expect(hydrated.unlocks).toEqual({});expect(hydrated.favorites).toEqual([])
  })
  it('new verified and manual meals hydrate in both method contracts; unsigned modern claims fail',async()=>{
    const p=proof();await issue(db,p);await claim(db,p);await claim(db,p)
    const manual={...oldMeal(),verified:false,verification_method:'none',verification_source:'manual',verification_status:'unverified',verification_version:1}
    await insertMeal(db,manual)
    const stored=(await rows(db)).filter(row=>[p.visit_id,manual.id].includes(row.id))
    expect(stored).toHaveLength(2);expect(stored.every(productionReads)).toBe(true)
    const state=normalizeExperience({logs:stored.map(mealFromRow),openedBoxes:[],favorites:[]})
    expect(state.logs).toHaveLength(2);expect(state.logs.find(log=>log.id===p.visit_id).verification).toMatchObject({verified:true,method:'location',source:'nom-server'})
    expect(state.logs.find(log=>log.id===manual.id).verification).toMatchObject({verified:false,method:'none',source:'manual'})
    await expect(insertMeal(db,{...manual,id:randomUUID(),verified:true,verification_status:'verified',verification_method:'location'})).rejects.toThrow(/owned server evidence/)
    // Reusing one owned proof under a second event ID cannot earn another meal.
    await expect(insertMeal(db,{...manual,id:randomUUID(),verified:true,verification_status:'verified',verification_method:'location',verification_id:p.id})).rejects.toThrow(/owned server evidence/)
    expect((await rows(db)).filter(row=>row.verification_id===p.id)).toHaveLength(1)
    await expect(claim(db,p,b)).rejects.toThrow(/Invalid verification evidence/)
  })
  it.each([256,263])('supports %s-char restaurant IDs through issuance, claim and favorites',async length=>{
    const id='google:'+'x'.repeat(length-7),p=proof(id)
    expect(isGoogleRestaurantId(id)).toBe(true);await issue(db,p);await claim(db,p)
    expect((await rows(db)).find(row=>row.id===p.visit_id).restaurant_id).toBe(id)
    await asRole(db,'authenticated',a,()=>db.query('insert into public.restaurant_favorites(user_id,restaurant_id) values($1,$2)',[a,id]))
    expect(normalizeExperience({logs:[mealFromRow((await rows(db)).find(row=>row.id===p.visit_id))],openedBoxes:[],favorites:[]}).logs).toHaveLength(1)
  })
  it('rejects 264-char IDs consistently before ledger, meal and favorite persistence',async()=>{
    const id='google:'+'x'.repeat(257)
    expect(isGoogleRestaurantId(id)).toBe(false)
    await expect(issue(db,proof(id))).rejects.toThrow(/check constraint/)
    await expect(insertMeal(db,{...oldMeal('unverified',id),verification_version:1,verification_status:'unverified'})).rejects.toThrow(/check constraint/)
    await asRole(db,'authenticated',a,()=>expect(db.query('insert into public.restaurant_favorites(user_id,restaurant_id) values($1,$2)',[a,id])).rejects.toThrow(/check constraint/))
  })
  it('refuses to promote an existing legacy event or renormalize real evidence on a successful rerun',async()=>{
    const old=legacyRows[0],p=proof(old.restaurant_id,{visit_id:old.id})
    await issue(db,p);await expect(claim(db,p)).rejects.toThrow(/Meal already logged/)
    expect((await rows(db)).find(row=>row.id===old.id)).toMatchObject({verified:false,verification_id:null,verification_source:'legacy'})
    const before=await rows(db)
    expect(before.some(row=>row.verified)).toBe(true)
    await expect(db.exec(migration)).rejects.toThrow(/already applied or partial schema/)
    await db.exec('rollback');expect(await rows(db)).toEqual(before)
  })
  it('a failed migration rolls back schema and normalization, then retries cleanly',async()=>{
    const local=await base(),old=oldMeal()
    try{
      await insertMeal(local,old)
      await expect(local.exec(migration.replace('commit;',()=>"do $$ begin raise exception 'Injected failure before commit'; end $$; commit;"))).rejects.toThrow(/Injected failure/)
      await local.exec('rollback')
      expect((await local.query("select to_regclass('public.visit_verifications') as ledger,to_regnamespace('nom_private') as private")).rows[0]).toEqual({ledger:null,private:null})
      expect((await rows(local))[0]).toMatchObject(old)
      expect((await local.query("select pg_get_constraintdef(oid) as def from pg_constraint where conname='meal_logs_restaurant_id_check'")).rows[0].def).toContain('256')
      await local.exec(migration)
      expect((await rows(local))[0]).toMatchObject({id:old.id,verified:false,verification_source:'legacy',verification_method:'unverified'})
      const before=await rows(local)
      await expect(local.exec(migration)).rejects.toThrow(/already applied or partial schema/)
      await local.exec('rollback');expect(await rows(local)).toEqual(before)
    }finally{await local.close()}
  },30000)
  it('refuses a pre-existing partial schema instead of masking or overwriting it',async()=>{
    const local=await base()
    try{
      await local.exec('create schema nom_private;create table nom_private.operator_marker(id int);insert into nom_private.operator_marker values(1)')
      await expect(local.exec(migration)).rejects.toThrow(/partial schema/)
      await local.exec('rollback')
      expect((await local.query('select id from nom_private.operator_marker')).rows).toEqual([{id:1}])
      expect((await local.query("select to_regclass('public.visit_verifications') as ledger")).rows[0].ledger).toBeNull()
    }finally{await local.close()}
  },30000)
  it('pause is repeatable, denies readiness/issuance, preserves existing claims and replay, then resumes',async()=>{
    const owner=randomUUID(),nonce=randomUUID(),p=proof('google:trusted-place',{user_id:owner,method:'qr',qr_nonce:nonce})
    await db.query('insert into auth.users values($1)',[owner]);await issue(db,p)
    const archived={...oldMeal(),user_id:owner};await insertMeal(db,archived)
    await asRole(db,'authenticated',owner,async()=>{
      await db.query("insert into public.profiles(id,display_name) values($1,'Disposable')",[owner])
      await db.query("insert into public.dish_favorites(user_id,dish_id) values($1,'lort-cha')",[owner])
      await db.query("insert into public.restaurant_favorites(user_id,restaurant_id) values($1,'google:trusted-place')",[owner])
      await db.query("insert into public.recent_dish_views(user_id,dish_id,viewed_at) values($1,'lort-cha',now())",[owner])
      await db.query("insert into public.opened_boxes values($1,$2,$3,'cambodia','ziggy',false,now())",[owner,'box-'+archived.id,archived.id])
      await db.query("insert into public.collectible_favorites(user_id,country_id,collectible_id) values($1,'cambodia','ziggy')",[owner])
    })
    const fingerprint=(await db.query("select fingerprint from nom_private.verification_redemptions where kind='qr' and fingerprint=$1",[hash(nonce)])).rows
    for(let i=0;i<2;i++)await db.exec(sql('recovery/nom_visit_verification_pause.sql'))
    await asRole(db,'service_role',null,()=>expect(db.query('select id from public.visit_verifications limit 1')).rejects.toThrow(/permission denied/))
    await expect(issue(db,proof())).rejects.toThrow(/permission denied/)
    await claim(db,p,owner);await claim(db,p,owner)
    await db.query('delete from auth.users where id=$1',[owner])
    expect((await rows(db,owner))).toEqual([])
    for(const table of ['profiles','dish_favorites','restaurant_favorites','recent_dish_views','opened_boxes','collectible_favorites']){
      expect((await db.query(`select * from public.${table} where ${table==='profiles'?'id':'user_id'}=$1`,[owner])).rows).toEqual([])
    }
    expect((await db.query('select id from public.visit_verifications where user_id=$1',[owner])).rows).toEqual([])
    expect((await db.query("select fingerprint from nom_private.verification_redemptions where kind='qr' and fingerprint=$1",[hash(nonce)])).rows).toEqual(fingerprint)
    for(let i=0;i<2;i++)await db.exec(sql('recovery/nom_visit_verification_resume.sql'))
    await asRole(db,'service_role',null,()=>db.query('select id from public.visit_verifications limit 1'))
    const replay=await issue(db,proof('google:trusted-place',{method:'qr',qr_nonce:nonce}))
    expect(replay.rows[0].issue_nom_visit_verification).toEqual({result:'already_used'})
    const fresh=proof();await issue(db,fresh);await claim(db,fresh)
  })
})
