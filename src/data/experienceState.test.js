import { describe, expect, it } from 'vitest'
import { createExperienceState, experienceReducer, hasCountedDish, visitDay } from './experienceState'
import {verifiedFixture} from '../test/verificationFixtures'
import {earnedJourney,appendVerified} from '../test/earnedJourney'
import { collectibleKey } from './collectionDefinitions'

function logged(state, { id = 'visit-1', dishId = 'lort-cha', restaurantId = 'preview-thmor-da', verified = true, reaction = 'loved', day = '2026-10-03' } = {}) {
  state = experienceReducer(state, { type: 'start', draft: { id, dishId, restaurantId, countryCode: 'KH' } })
  state = experienceReducer(state, { type: 'verify', id, verification: verified ? verifiedFixture({id,dishId,restaurantId,at:`${day}T12:00:00.000Z`}) : {verified:false,method:'none',source:'manual'} })
  state = experienceReducer(state, { type: 'feedback', id, feedback: { reaction, observations: ['Savory'], note: 'Tasty' } })
  return experienceReducer(state, { type: 'complete', id, day, at: `${day}T12:00:00.000Z` })
}

describe('Session visits, progress, and rewards', () => {
  it('credits a verified meal once, preserves a clean Guest baseline, and preserves canonical dish/restaurant and feedback', () => {
    const initial = createExperienceState(), state = logged(initial)
    expect(initial.progress.cambodia).toEqual({ meals: 0, count: 0 })
    expect(state.progress.cambodia).toEqual({ meals: 1, count: 1 })
    expect(state.logs[0]).toMatchObject({ dishId: 'lort-cha', restaurantId: 'preview-thmor-da', earnedProgress: true, feedback: { reaction: 'loved', observations: ['Savory'] } })
    expect(state.boxes).toEqual({})
    const repeated = experienceReducer(state, { type: 'complete', id: 'visit-1', day: '2026-10-03', at: '2026-10-03T13:00:00Z' })
    expect(repeated).toBe(state)
  })

  it('allows repeat logs while preventing a second daily credit across restaurants', () => {
    const first = logged(createExperienceState())
    const second = logged(first, { id: 'visit-2', restaurantId: 'preview-golden-monkey' })
    expect(second.logs).toHaveLength(2)
    expect(second.logs[1].earnedProgress).toBe(false)
    expect(second.progress.cambodia).toEqual({ meals: 1, count: 1 })
    expect(Object.keys(second.boxes)).toHaveLength(0)
    expect(hasCountedDish(second, 'lort-cha', '2026-10-03')).toBe(true)
  })

  it('permits a different dish on the same day and the same dish on another day', () => {
    let state = logged(createExperienceState())
    state = logged(state, { id: 'visit-2', dishId: 'num-banh-chok' })
    state = logged(state, { id: 'visit-3', day: '2026-10-04' })
    expect(state.logs.every(log => log.earnedProgress)).toBe(true)
    expect(state.progress.cambodia.count).toBe(0)
  })

  it('stores unverified meals without rewards and does not block later verification', () => {
    const unverified = logged(createExperienceState(), { verified: false })
    expect(unverified.logs[0].earnedProgress).toBe(false)
    expect(unverified.progress.cambodia).toEqual({ meals: 0, count: 0 })
    expect(Object.keys(unverified.boxes)).toHaveLength(0)
    const verified = logged(unverified, { id: 'visit-2' })
    expect(verified.logs[1].earnedProgress).toBe(true)
  })

  it('awards progress independently of the meal reaction', () => {
    const state = logged(createExperienceState(), { reaction: 'not-for-me' })
    expect(state.logs[0].earnedProgress).toBe(true)
    expect(Object.keys(state.boxes)).toHaveLength(0)
  })

  it('requires verification choice and feedback before completing a draft', () => {
    const state = experienceReducer(createExperienceState(), { type: 'start', draft: { id: 'incomplete' } })
    expect(experienceReducer(state, { type: 'complete', id: 'incomplete' })).toBe(state)
    expect(experienceReducer(state, { type: 'complete', id: 'missing' })).toBe(state)
  })

  it('opens an earned box exactly once, unlocks Ziggy, and favorites only unlocked rewards', () => {
    const key = collectibleKey('cambodia', 'ziggy')
    let state = logged(appendVerified(appendVerified(createExperienceState(),{id:'before-one',day:'2026-10-01'}),{id:'before-two',day:'2026-10-02'}))
    expect(state.unlocks[key]).toBeUndefined()
    expect(experienceReducer(state, { type: 'open-box', id: 'box-visit-1' })).toBe(state)
    expect(experienceReducer(state, { type: 'favorite', key })).toBe(state)
    state = experienceReducer(state, { type: 'begin-box', id: 'box-visit-1' })
    state = experienceReducer(state, { type: 'open-box', id: 'box-visit-1', at: '2026-10-03T12:05:00Z' })
    expect(state.unlocks[key]).toEqual({ discoveredAt: '2026-10-03T12:05:00Z', source: 'box-visit-1' })
    expect(state.boxes['box-visit-1']).toMatchObject({ status: 'opened', collectibleId: 'ziggy', duplicate: false })
    expect(experienceReducer(state, { type: 'open-box', id: 'box-visit-1', at: 'later' })).toBe(state)
    state = experienceReducer(state, { type: 'favorite', key })
    expect(state.favorites).toContain(key)
  })

  it('retains the discovery date when a completed collection receives a duplicate reward', () => {
    let state = earnedJourney(6)
    const first = state.unlocks['cambodia:ziggy'].discoveredAt
    for(let i=1;i<=3;i++) state=appendVerified(state,{id:`duplicate-${i}`,day:`2026-10-0${i}`})
    state = experienceReducer(state,{type:'begin-box',id:'box-duplicate-3'})
    state = experienceReducer(state,{type:'open-box',id:'box-duplicate-3',at:'2026-10-03T12:01:00Z'})
    expect(state.boxes['box-duplicate-3'].duplicate).toBe(true)
    expect(state.unlocks['cambodia:ziggy'].discoveredAt).toBe(first)
  })

  it('rejects a forged verified flag and a signature bound to a different restaurant', () => {
    const draft={id:'forged',dishId:'lort-cha',restaurantId:'preview-golden-monkey',countryCode:'KH',verification:verifiedFixture({id:'forged'}),feedback:{reaction:'loved'}}
    const state=experienceReducer(experienceReducer(createExperienceState(),{type:'start',draft}),{type:'complete',id:'forged',day:'2026-10-03',at:'2026-10-03T12:00:00Z'})
    expect(state.progress.cambodia.meals).toBe(0)
    expect(state.logs[0].earnedProgress).toBe(false)
  })

  it('derives daily credit from the signed UTC verification timestamp', () => {
    const state=logged(createExperienceState(),{day:'2026-10-03'})
    expect(state.logs[0].day).toBe('2026-10-03')
  })

  it('uses the user’s calendar day rather than a UTC-day boundary', () => {
    expect(visitDay(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03')
  })
})
