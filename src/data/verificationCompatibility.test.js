// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { identityCacheKey, migrateVerificationAccountStorage, readGuestJourney, clearAccountCache } from './identityStorage'
import { STORAGE_KEYS, writeLocalState } from './localPersistence'
import { serializeExperience, normalizeExperience } from './persistedState'
import { defaultJourney, mealToRow } from './cloudState'
import { createJourneyStore, normalizeAccountCache } from './syncEngine'
import { createCloudRepository } from './cloudRepository'
import { meal, mockSupabase, USER_A, USER_B } from '../test/accountFixtures'
import { earnedJourney } from '../test/earnedJourney'

const stores=[]
afterEach(()=>{for(const store of stores)store.stop();stores.length=0})
function legacyLog(id='old-visit') {
  const log=meal(id)
  return {...log,verification:{verified:true,method:'location-demo',source:'development',checkedAt:log.completedAt}}
}
function oldOperation(id='old-operation',visitId='old-visit') {
  const row=mealToRow(legacyLog(visitId))
  for(const key of Object.keys(row))if(key.startsWith('verification_')&&!['verification_method','verification_source','verification_checked_at'].includes(key))delete row[key]
  delete row.receipt_confidence
  return {id,clock:4,kind:'meal',target:visitId,payload:row}
}
const account=(sdk,online=()=>false)=>{
  const store=createJourneyStore({user:USER_A,repository:createCloudRepository(sdk,USER_A.id),online})
  stores.push(store);return store
}
const snapshot=(logs=[],outbox=[])=>({data:{...defaultJourney(),experience:{logs,openedBoxes:[],favorites:[]}},outbox,guestDecision:null})
const previous=id=>identityCacheKey(id).replace('nom.v3.','nom.v2.')

describe('verification-compatible local adoption and offline outboxes',()=>{
  it('copies pre-existing Guest history and keeps its original bytes, IDs and feedback',()=>{
    const log=legacyLog()
    writeLocalState('nom.v2.guest.experience',{logs:[log],openedBoxes:[],favorites:[]})
    localStorage.setItem('nom.v2.guest.legacy-migrated','true')
    const raw=localStorage.getItem('nom.v2.guest.experience'),state=readGuestJourney().experience
    expect(state.logs).toHaveLength(1);expect(state.logs[0]).toMatchObject({id:log.id,feedback:log.feedback,verification:{verified:false,method:'none',source:'legacy'}})
    expect(state.progress.cambodia.meals).toBe(0)
    expect(localStorage.getItem('nom.v2.guest.experience')).toBe(raw)
    expect(localStorage.getItem(STORAGE_KEYS.experience)).toBe(raw)
  })
  it('older Guest tabs cannot downgrade signed evidence; late distinct legacy visits are adopted',()=>{
    const signed=meal('shared-visit')
    writeLocalState(STORAGE_KEYS.experience,{logs:[signed],openedBoxes:[],favorites:[]})
    const raw=localStorage.getItem(STORAGE_KEYS.experience)
    writeLocalState('nom.v2.guest.experience',{logs:[legacyLog('shared-visit'),legacyLog('late-visit')],openedBoxes:[],favorites:[]})
    const state=readGuestJourney().experience
    expect(state.logs).toHaveLength(2)
    expect(state.logs.find(log=>log.id==='shared-visit').verification).toMatchObject({verified:true,id:signed.verification.id,claimToken:signed.verification.claimToken})
    expect(state.logs.find(log=>log.id==='late-visit').verification.verified).toBe(false)
    expect(localStorage.getItem(STORAGE_KEYS.experience)).toBe(raw)
  })
  it('explicit legacy Guest merge uploads unverified history once and hydrates on a second device',async()=>{
    const old=legacyLog('guest-history'),sdk=mockSupabase(USER_A)
    writeLocalState('nom.v2.guest.experience',{logs:[old],openedBoxes:[],favorites:[]})
    const raw=localStorage.getItem('nom.v2.guest.experience'),store=account(sdk,()=>true)
    await store.start();expect(store.getSnapshot().migrationPending).toBe(true)
    expect(sdk.rows.meal_logs).toEqual([])
    expect(await store.mergeGuest()).toBe(true);await store.mergeGuest()
    expect(sdk.rows.meal_logs).toHaveLength(1)
    expect(sdk.rows.meal_logs[0]).toMatchObject({id:old.id,verified:false,verification_method:'none',verification_source:'legacy',feedback_note:old.feedback.note})
    expect(localStorage.getItem('nom.v2.guest.experience')).toBe(raw)
    store.stop();localStorage.clear()
    const second=account(mockSupabase(USER_A,sdk.rows),()=>true);await second.start()
    expect(second.getSnapshot().data.experience.logs[0]).toMatchObject({id:old.id,feedback:old.feedback,verification:{verified:false,method:'none',source:'legacy'}})
    expect(second.getSnapshot().data.experience.progress.cambodia.meals).toBe(0)
  })
  it('legacy snapshot and durable outbox preserve operation IDs/order through failure, retry and refresh',async()=>{
    const old=previous(USER_A.id),operation=oldOperation(),sdk=mockSupabase(USER_A)
    writeLocalState(old,snapshot([legacyLog()],[operation]))
    writeLocalState(`${old}.outbox.operation.${operation.id}`,operation)
    const source=localStorage.getItem(old),journal=localStorage.getItem(`${old}.outbox.operation.${operation.id}`)
    const offline=account(sdk)
    expect(offline.getSnapshot().outboxCount).toBe(1)
    expect(offline.getSnapshot().data.experience.logs[0].verification).toMatchObject({verified:false,source:'legacy'})
    const adopted=normalizeAccountCache(JSON.parse(localStorage.getItem(old)).data).outbox[0]
    expect(adopted).toMatchObject({id:operation.id,clock:4,target:operation.target,payload:{verified:false,verification_method:'none',verification_source:'legacy'}})
    expect(localStorage.getItem(old)).toBe(source)
    expect(localStorage.getItem(`${old}.outbox.operation.${operation.id}`)).toBe(journal)
    expect(Object.keys(localStorage).some(key=>key.startsWith(`${identityCacheKey(USER_A.id)}.outbox.operation.${operation.id}.recovery.`))).toBe(true)
    offline.stop();sdk.fail=true
    const online=account(sdk,()=>true)
    expect(await online.start()).toBe(false);expect(online.getSnapshot().outboxCount).toBe(1)
    sdk.fail=false;expect(await online.retry()).toBe(true)
    expect(sdk.rows.meal_logs).toHaveLength(1)
    expect(sdk.rows.meal_logs[0]).toMatchObject({id:operation.target,user_id:USER_A.id,verified:false,verification_source:'legacy'})
    expect(sdk.rpc).not.toHaveBeenCalledWith('record_nom_verified_meal',expect.anything())
    online.stop();const reload=account(sdk,()=>true);await reload.start()
    expect(reload.getSnapshot().outboxCount).toBe(0);expect(sdk.rows.meal_logs).toHaveLength(1)
    expect(reload.getSnapshot().data.experience.logs).toHaveLength(1)
    expect(localStorage.getItem(old)).toBe(source)
  })
  it('adopts late old-tab journal entries, respects old ACKs and isolates accounts',async()=>{
    const old=previous(USER_A.id),sdk=mockSupabase(USER_A),store=account(sdk)
    await store.start()
    const late=oldOperation('late-operation','late-visit'),done=oldOperation('done-operation','done-visit')
    writeLocalState(`${old}.outbox.operation.${late.id}`,late)
    writeLocalState(`${old}.outbox.operation.${done.id}`,done)
    localStorage.setItem(`${old}.outbox.ack.${done.id}`,'1')
    writeLocalState(`${previous(USER_B.id)}.outbox.operation.other`,oldOperation('other','foreign-visit'))
    window.dispatchEvent(new StorageEvent('storage',{key:`${old}.outbox.operation.${late.id}`}))
    expect(store.getSnapshot().outboxCount).toBe(1)
    expect(store.getSnapshot().data.experience.logs.map(log=>log.id)).toEqual(['late-visit'])
    expect(localStorage.getItem(`${identityCacheKey(USER_A.id)}.outbox.ack.${done.id}`)).toBe('1')
    expect(localStorage.getItem(`${identityCacheKey(USER_B.id)}.outbox.operation.other`)).toBeNull()
  })
  it('never overwrites the new account snapshot or proof when copying legacy storage again',()=>{
    const current=identityCacheKey(USER_A.id),old=previous(USER_A.id)
    writeLocalState(current,snapshot([meal('signed')]))
    const raw=localStorage.getItem(current)
    writeLocalState(old,snapshot([legacyLog('signed')]))
    expect(migrateVerificationAccountStorage(USER_A.id)).toBe(true)
    expect(localStorage.getItem(current)).toBe(raw)
    expect(account(mockSupabase(USER_A)).getSnapshot().data.experience.logs[0].verification.verified).toBe(true)
  })
  it('legacy forged identity fields and malformed modern evidence are not silently adopted',()=>{
    const foreign=oldOperation(),modern=oldOperation('modern','modern-visit')
    foreign.payload.user_id=USER_B.id
    modern.payload.verification_id='00000000-0000-4000-8000-000000000001'
    modern.payload.verification_method='location';modern.payload.verification_status='verified'
    expect(normalizeAccountCache(snapshot([], [foreign,modern])).outbox).toEqual([])
  })
  it('deletion removes both cache generations for only this account, including ACKs/recovery',()=>{
    for(const id of [USER_A.id,USER_B.id])for(const key of [identityCacheKey(id),previous(id)]) {
      localStorage.setItem(key,'snapshot');localStorage.setItem(`${key}.outbox.ack.old`,'1');localStorage.setItem(`${key}.recovery.1`,'original')
    }
    writeLocalState(STORAGE_KEYS.experience,{logs:[legacyLog()],openedBoxes:[],favorites:[]})
    const guest=localStorage.getItem(STORAGE_KEYS.experience)
    expect(clearAccountCache(USER_A.id)).toBe(true)
    expect(Object.keys(localStorage).some(key=>key.includes(USER_A.id))).toBe(false)
    expect(Object.keys(localStorage).filter(key=>key.includes(USER_B.id))).toHaveLength(6)
    expect(localStorage.getItem(STORAGE_KEYS.experience)).toBe(guest)
    migrateVerificationAccountStorage(USER_A.id)
    expect(localStorage.getItem(identityCacheKey(USER_A.id))).toBeNull()
  })
  it('old openings do not consume signed local credits or recreate legacy unlocks on refresh',()=>{
    const signed=serializeExperience(earnedJourney(1,{opened:false})),old=legacyLog()
    const state=normalizeExperience({...signed,logs:[old,...signed.logs],openedBoxes:[{id:'box-'+old.id,visitId:old.id,countryId:'cambodia',collectibleId:'lumi',duplicate:false,openedAt:old.completedAt}]})
    expect(state.logs).toHaveLength(4);expect(state.progress.cambodia).toEqual({meals:3,count:0})
    expect(Object.values(state.boxes).filter(box=>box.status==='ready')).toHaveLength(1)
    expect(state.unlocks).toEqual({})
    const refreshed=normalizeExperience(serializeExperience(state))
    expect(refreshed.progress).toEqual(state.progress);expect(refreshed.boxes).toEqual(state.boxes)
  })
})
