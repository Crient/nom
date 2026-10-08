// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { ACTIVE_VISIT_MAX_AGE_MS, recoverActiveVisits, serializeActiveVisits } from './activeVisitContext'
import { createExperienceState, experienceReducer } from './experienceState'
import { normalizeExperience, serializeExperience } from './persistedState'
import { createJourneyStore } from './syncEngine'
import { manualVerification } from '../../shared/visitVerification'

const id = '00000000-0000-4000-8000-000000000001'
const draft = () => ({ id, dishId: 'lort-cha', restaurantId: 'google:trusted-place', restaurantName: 'Casa Portugal',
  countryCode: 'KH', startedAt: new Date().toISOString(), returnState: { surprise: true, latitude: 42, token: 'not-for-storage' } })
const started = () => experienceReducer(createExperienceState(), { type: 'start', draft: draft() })
const active = () => serializeActiveVisits(started())[0]

describe('minimum active-visit recovery context', () => {
  it('stores an explicit bounded context, never coordinates, router payloads or proof material', () => {
    const state = started()
    Object.assign(state.drafts[id], { latitude: 42, longitude: -71, samples: [{ latitude: 42, longitude: -71 }],
      verification: { verified: true, source: 'nom-server', proof: 'private-proof', signature: 'private-signature', claimToken: 'private-token' },
      feedback: { note: 'private feedback' }, secret: 'private-secret' })
    const saved = serializeExperience(state)
    expect(Object.keys(saved.activeVisits[0]).sort()).toEqual(['countryCode', 'dishId', 'id', 'restaurantId', 'restaurantName', 'startedAt', 'status', 'surprise'].sort())
    expect(JSON.stringify(saved)).not.toMatch(/latitude|longitude|samples|proof|signature|claimToken|private-|feedback|returnState/)
    const recovered = normalizeExperience(saved)
    expect(recovered.drafts[id]).toMatchObject({ id, restaurantName: 'Casa Portugal', verification: null, feedback: null, returnState: { surprise: true } })
    expect(recovered.progress.cambodia).toEqual({ meals: 0, count: 0 })
  })
  it.each([
    { status: 'completed' }, { completed: true }, { completedAt: new Date().toISOString() },
    { startedAt: 'invalid' }, { startedAt: new Date(Date.now() + 60_000).toISOString() },
    { dishId: 'invented-dish' }, { countryCode: 'US' }, { restaurantId: 'google:' },
    { restaurantId: 'invented-provider' }, { restaurantName: {} }, { id: 'qa-recovery' }, { id: '__proto__' }, { id: 'not-a-visit' },
  ])('rejects invalid or completed context %j', change => {
    expect(recoverActiveVisits([{ ...active(), ...change }], [])).toEqual({})
  })
  it('expires from the original start time and limits the number of recoverable visits', () => {
    const safe = active(), now = Date.parse(safe.startedAt)
    expect(recoverActiveVisits([safe], [], now + ACTIVE_VISIT_MAX_AGE_MS)).toEqual({})
    const values = Array.from({ length: 10 }, (_, index) => ({ ...safe, id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` }))
    expect(Object.keys(recoverActiveVisits(values, [], now))).toHaveLength(8)
  })
  it('History blocks a matching active context and completed drafts are never serialized', () => {
    let state = started()
    state = experienceReducer(state, { type: 'verify', id, verification: manualVerification() })
    state = experienceReducer(state, { type: 'feedback', id, feedback: { reaction: 'loved', observations: [], note: '' } })
    state = experienceReducer(state, { type: 'complete', id, at: new Date().toISOString(), day: new Date().toISOString().slice(0, 10) })
    const saved = serializeExperience(state)
    expect(saved).not.toHaveProperty('activeVisits')
    expect(saved.logs[0]).not.toHaveProperty('restaurantName')
    expect(normalizeExperience({ ...saved, activeVisits: [active()] }).drafts).toEqual({})
  })
  it('edited context cannot hydrate verification, feedback, progress, boxes or unlocks', () => {
    const forged = { ...active(), verification: { verified: true, source: 'nom-server' }, feedback: { reaction: 'loved' }, earnedProgress: true }
    const state = normalizeExperience({ logs: [], favorites: [], activeVisits: [forged], progress: { cambodia: { meals: 99 } }, unlocks: { 'cambodia:lumi': {} } })
    expect(state.drafts[id].verification).toBeNull(); expect(state.drafts[id].feedback).toBeNull()
    expect(state.progress.cambodia).toEqual({ meals: 0, count: 0 }); expect(state.boxes).toEqual({}); expect(state.unlocks).toEqual({})
    expect(experienceReducer(state, { type: 'complete', id, at: new Date().toISOString(), day: '2026-10-08' })).toBe(state)
  })
  it('keeps Guest/A/B recovery isolated in existing identity caches with no sync operations', () => {
    const guest = createJourneyStore(), a = createJourneyStore({ user: { id: 'account-a' }, online: () => false })
    const accountVisitId = '00000000-0000-4000-8000-000000000002'
    guest.update('experience', started()); a.update('experience', experienceReducer(createExperienceState(), { type: 'start', draft: { ...draft(), id: accountVisitId } }))
    expect(createJourneyStore().getSnapshot().data.experience.drafts[id]).toBeTruthy()
    const restoredA = createJourneyStore({ user: { id: 'account-a' }, online: () => false })
    expect(Object.keys(restoredA.getSnapshot().data.experience.drafts)).toEqual([accountVisitId])
    expect(restoredA.getSnapshot().outboxCount).toBe(0)
    expect(createJourneyStore({ user: { id: 'account-b' }, online: () => false }).getSnapshot().data.experience.drafts).toEqual({})
    guest.stop(); a.stop(); restoredA.stop()
  })
  it('keeps QA preview drafts out of persistence', () => {
    expect(serializeActiveVisits({ ...started(), qaOnly: true })).toEqual([])
  })
})
