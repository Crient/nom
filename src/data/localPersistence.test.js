// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readLocalState, writeLocalState, STORAGE_KEYS } from './localPersistence'
import { normalizeDiscovery, normalizeExperience, normalizeFavorites, serializeExperience, EMPTY_DISCOVERY } from './persistedState'
import { createExperienceState, experienceReducer } from './experienceState'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
const log = (state, id = 'visit-1', verified = true) => {
  const at = '2026-10-03T12:00:00.000Z'
  const draft = { id, dishId: 'lort-cha', restaurantId: 'preview-thmor-da', countryCode: 'KH', startedAt: at,
    returnState: { view: 'map' }, verification: { verified, method: verified ? 'qr-demo' : 'unverified', source: 'development', checkedAt: at },
    feedback: { reaction: 'loved', observations: ['Savory'], note: 'Great' } }
  return experienceReducer(experienceReducer(state, { type: 'start', draft }), { type: 'complete', id, day: '2026-10-03', at })
}

describe('Local V1 persistence and safe recovery', () => {
  it('restores completed logs, daily credit, pending boxes, unlock dates, and collectible favorites without duplicate rewards', () => {
    let state = log(createExperienceState())
    state = experienceReducer(state, { type: 'begin-box', id: 'box-visit-1' })
    state = experienceReducer(state, { type: 'open-box', id: 'box-visit-1', at: '2026-10-03T12:02:00.000Z' })
    state = experienceReducer(state, { type: 'favorite', key: 'cambodia:ziggy' })
    writeLocalState(STORAGE_KEYS.experience, serializeExperience(state))
    const restored = readLocalState(STORAGE_KEYS.experience, normalizeExperience, createExperienceState)
    expect(restored.progress).toEqual(state.progress)
    expect(restored.boxes).toEqual(state.boxes)
    expect(restored.unlocks).toEqual(state.unlocks)
    expect(restored.favorites).toEqual(['cambodia:ziggy'])
    expect(restored.drafts).toEqual({})
    expect(restored.logs[0].returnState).toBeUndefined()
    const repeat = log(restored, 'visit-2')
    expect(repeat.logs[1].earnedProgress).toBe(false)
    expect(Object.keys(repeat.boxes)).toHaveLength(1)
  })

  it('restores an interrupted box as ready so it can resume safely', () => {
    let state = log(createExperienceState())
    state = experienceReducer(state, { type: 'begin-box', id: 'box-visit-1' })
    const restored = normalizeExperience(serializeExperience(state))
    expect(restored.boxes['box-visit-1'].status).toBe('ready')
    expect(restored.unlocks['cambodia:ziggy']).toBeUndefined()
  })

  it('derives progress from validated logs rather than trusting corrupt snapshots', () => {
    const state = log(createExperienceState(), 'visit-1', false)
    const restored = normalizeExperience({ ...serializeExperience(state), logs: [...state.logs, state.logs[0], { id: 'broken' }, { ...state.logs[0], id: 'bad-day', day: '2026-02-31' }], progress: { cambodia: { meals: 999, count: 100 } } })
    expect(restored.logs).toHaveLength(1)
    expect(restored.progress.cambodia).toEqual({ meals: 18, count: 2 })
    expect(restored.boxes).toEqual({})
  })

  it('sanitizes preferences and favorites against canonical IDs, retaining skipped region', () => {
    expect(normalizeDiscovery({ foodType: 'anything', flavors: ['crispy', 'crispy', 'fresh', 'unknown'], adventurousness: 'surprise-me', region: null })).toEqual({ foodType: 'anything', flavors: ['crispy', 'fresh'], adventurousness: 'surprise-me', region: null })
    expect(normalizeDiscovery({ foodType: 'bad', flavors: {}, adventurousness: 999, region: 'bad' })).toEqual(EMPTY_DISCOVERY)
    expect(normalizeFavorites({ dishIds: ['lort-cha', 'unknown', 'lort-cha'], restaurantIds: ['preview-thmor-da', 'bad'] })).toEqual({ dishIds: ['lort-cha'], restaurantIds: ['preview-thmor-da'] })
  })

  it('archives corrupt JSON and repaired legacy data without deleting the original', () => {
    const key = STORAGE_KEYS.discovery
    localStorage.setItem(key, '{broken')
    expect(readLocalState(key, normalizeDiscovery, () => EMPTY_DISCOVERY)).toEqual(EMPTY_DISCOVERY)
    const recovery = Object.keys(localStorage).find(value => value.startsWith(`${key}.recovery.`))
    expect(localStorage.getItem(recovery)).toBe('{broken')
    writeLocalState(key, EMPTY_DISCOVERY)
    expect(JSON.parse(localStorage.getItem(key)).version).toBe(1)
    const legacyKey = STORAGE_KEYS.favorites
    const legacy = JSON.stringify({ favoriteIds: ['lort-cha', 'unknown'], restaurantIds: [] })
    localStorage.setItem(legacyKey, legacy)
    expect(readLocalState(legacyKey, normalizeFavorites, () => ({})).dishIds).toEqual(['lort-cha'])
    expect(Object.keys(localStorage).some(key => key.startsWith(`${legacyKey}.recovery.`))).toBe(true)
  })

  it('keeps unknown newer versions untouched and tolerates unavailable storage', () => {
    const key = 'nom.test.future'
    const future = JSON.stringify({ version: 99, data: { important: true } })
    localStorage.setItem(key, future)
    expect(readLocalState(key, normalizeDiscovery, () => EMPTY_DISCOVERY)).toEqual(EMPTY_DISCOVERY)
    expect(writeLocalState(key, EMPTY_DISCOVERY)).toBe(false)
    expect(localStorage.getItem(key)).toBe(future)
    vi.stubGlobal('localStorage', { setItem() { throw new Error('Quota exceeded') } })
    expect(writeLocalState('nom.test.full', {})).toBe(false)
  })
})
