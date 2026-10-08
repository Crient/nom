// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExperienceProvider, useExperience } from '../context/Experience'
import VerifyVisit from './VerifyVisit'
import { createExperienceState, experienceReducer } from '../data/experienceState'
import { serializeExperience } from '../data/persistedState'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { createVisitVerificationApi } from '../data/liveVisitVerification'
import { findRestaurant } from '../data/restaurantProvider'
import { dishes } from '../data/dishes'
import { manualVerification } from '../../shared/visitVerification'
import { verifiedFixture } from '../test/verificationFixtures'

vi.mock('../data/restaurantProvider', () => ({ findRestaurant: vi.fn() }))
vi.mock('../data/liveVisitVerification', async original => ({ ...await original(), createVisitVerificationApi: vi.fn() }))
const id = '00000000-0000-4000-8000-000000000001'
const restaurant = { id: 'google:trusted-place', name: 'Casa Portugal' }
const draft = () => ({ id, dishId: 'lort-cha', restaurantId: restaurant.id, restaurantName: restaurant.name, countryCode: 'KH', startedAt: new Date().toISOString() })
let root, journey, navigate, api, geolocation
function Flow() {
  journey = useExperience(); navigate = useNavigate()
  return <Routes>
    <Route path="/home" element={<h1>Home</h1>} />
    <Route path="/visits/:visitId/verify" element={<VerifyVisit />} />
    <Route path="/visits/:visitId/logged" element={<h1>Completed History</h1>} />
  </Routes>
}
async function mount(path) {
  await act(() => root.render(<ExperienceProvider><MemoryRouter initialEntries={[path]}><Flow /></MemoryRouter></ExperienceProvider>))
}
async function reload(path = `/visits/${id}/verify`) {
  await act(() => root.unmount()); root = createRoot(document.getElementById('root')); await mount(path)
}
const seed = () => writeLocalState(STORAGE_KEYS.experience, serializeExperience(experienceReducer(createExperienceState(), { type: 'start', draft: draft() })))
const proceed = () => document.querySelector('.flow-cta button')
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.getElementById('root'))
  geolocation = { getCurrentPosition: vi.fn(ok => ok({ coords: { latitude: 42, longitude: -71, accuracy: 8 }, timestamp: Date.now() })) }
  vi.stubGlobal('navigator', { geolocation })
  findRestaurant.mockResolvedValue({ restaurant: { ...restaurant, name: 'Saved restaurant', metadataOnly: true, source: 'google-places' }, source: 'google-places' })
  api = { capabilities: vi.fn(async () => ({ location: true })), verify: vi.fn(async () => ({ result: 'too_far' })) }
  createVisitVerificationApi.mockReturnValue(api)
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('real Verify Visit route context recovery', () => {
  it('survives a provider/router refresh after starting through the real action', async () => {
    await mount('/home')
    let visitId
    await act(() => { visitId = journey.startVisit({ dish: dishes.find(d => d.id === 'lort-cha'), restaurant }); navigate(`/visits/${visitId}/verify`) })
    expect(document.body.textContent).toContain('Verify Your Visit')
    const before = geolocation.getCurrentPosition.mock.calls.length
    await reload(`/visits/${visitId}/verify`)
    expect(document.body.textContent).toContain('Verify Your Visit'); expect(document.body.textContent).toContain('Casa Portugal')
    expect(document.body.textContent).not.toContain('Visit not found')
    expect(geolocation.getCurrentPosition.mock.calls.length).toBe(before + 3)
    expect(journey.state.drafts[visitId].verification).toBeNull(); expect(proceed().disabled).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.experience)).not.toMatch(/latitude|longitude|samples|claimToken|signature/)
  })
  it('direct URL/reopening without router state recovers IDs and resolves restaurant through the provider', async () => {
    seed(); await mount(`/visits/${id}/verify`)
    expect(findRestaurant).toHaveBeenCalledWith(expect.objectContaining({ dishId: 'lort-cha', restaurantId: restaurant.id }))
    expect(journey.state.drafts[id]).toMatchObject({ id, countryCode: 'KH', restaurantName: restaurant.name, verification: null })
    expect(document.body.textContent).toContain('Casa Portugal'); expect(proceed().disabled).toBe(true)
  })
  it('Back/Forward preserves the same active flow without creating another visit', async () => {
    seed(); await mount(`/visits/${id}/verify`)
    await act(() => navigate('/home')); await act(() => navigate(-1))
    expect(document.body.textContent).toContain('Verify Your Visit')
    await act(() => navigate(1)); expect(document.body.textContent).toBe('Home')
    await act(() => navigate(-1)); expect(document.body.textContent).toContain('Verify Your Visit')
    expect(Object.keys(journey.state.drafts)).toEqual([id]); expect(journey.state.logs).toEqual([])
  })
  it('rejects invalid stored context instead of beginning location verification', async () => {
    seed(); const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.experience)); saved.data.activeVisits[0].countryCode = 'US'
    localStorage.setItem(STORAGE_KEYS.experience, JSON.stringify(saved)); await mount(`/visits/${id}/verify`)
    expect(document.body.textContent).toContain('Visit not found'); expect(api.verify).not.toHaveBeenCalled()
  })
  it('routes a completed ID to History and never reopens or re-verifies it', async () => {
    let state = experienceReducer(createExperienceState(), { type: 'start', draft: draft() })
    const activeVisits = serializeExperience(state).activeVisits
    state = experienceReducer(state, { type: 'verify', id, verification: manualVerification() })
    state = experienceReducer(state, { type: 'feedback', id, feedback: { reaction: 'loved', observations: [], note: '' } })
    state = experienceReducer(state, { type: 'complete', id, at: new Date().toISOString(), day: new Date().toISOString().slice(0, 10) })
    writeLocalState(STORAGE_KEYS.experience, { ...serializeExperience(state), activeVisits })
    await mount(`/visits/${id}/verify`); expect(document.body.textContent).toBe('Completed History')
    expect(journey.state.drafts).toEqual({}); expect(api.capabilities).not.toHaveBeenCalled(); expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
    await reload(); expect(document.body.textContent).toBe('Completed History'); expect(journey.state.logs).toHaveLength(1)
  })
  it('ignores even a signed proof injected into recovery context; Continue still requires server verification', async () => {
    seed(); const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.experience))
    saved.data.activeVisits[0].verification = verifiedFixture({ id, restaurantId: restaurant.id, at: draft().startedAt })
    saved.data.activeVisits[0].feedback = { reaction: 'loved' }; saved.data.activeVisits[0].latitude = 42
    saved.data.progress = { cambodia: { meals: 99, count: 99 } }
    localStorage.setItem(STORAGE_KEYS.experience, JSON.stringify(saved)); await mount(`/visits/${id}/verify`)
    expect(journey.state.drafts[id].verification).toBeNull(); expect(proceed().disabled).toBe(true)
    expect(journey.state.progress.cambodia).toEqual({ meals: 0, count: 0 }); expect(journey.state.logs).toEqual([]); expect(journey.state.boxes).toEqual({})
    expect(api.verify).toHaveBeenCalled(); expect(localStorage.getItem(STORAGE_KEYS.experience)).not.toMatch(/latitude|longitude|claimToken|signature/)
  })
})
