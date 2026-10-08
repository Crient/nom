// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.hoisted(() => { vi.stubEnv('VITE_ENABLE_REWARD_QA', 'true') })
vi.mock('../data/restaurantProvider', async original => ({ ...await original(), findRestaurant: vi.fn() }))
import App from '../App'
import { findRestaurant } from '../data/restaurantProvider'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { createExperienceState } from '../data/experienceState'
import { serializeExperience } from '../data/persistedState'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { BOX_REVEAL_TIMING } from './SurpriseBox'

let root, fetchSpy
const snapshot = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]))
beforeEach(() => {
  vi.stubEnv('DEV', false); vi.stubEnv('VITE_ENABLE_REWARD_QA', 'true'); vi.useFakeTimers()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root'))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  fetchSpy = vi.fn(() => { throw new Error('Network forbidden in experience QA') }); vi.stubGlobal('fetch', fetchSpy)
  findRestaurant.mockClear()
  writeLocalState(STORAGE_KEYS.experience, serializeExperience(createExperienceState()))
  writeLocalState(STORAGE_KEYS.favorites, { dishIds: ['nasi-goreng'], restaurantIds: ['google:existing'] })
  writeLocalState(STORAGE_KEYS.discovery, { foodType: 'rice', flavors: ['fresh'], adventurousness: 'familiar', region: 'east-asia' })
})
afterEach(async () => {
  await act(() => root.unmount())
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(findRestaurant).not.toHaveBeenCalled()
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs()
})
async function mount(path = '/dev/experience') {
  window.history.replaceState({}, '', path); await act(() => root.render(<App />))
}
async function click(label) {
  const element = [...document.querySelectorAll('button,a')].find(node => node.textContent.trim() === label || node.getAttribute('aria-label') === label)
  expect(element, label).toBeTruthy(); await act(() => element.click())
}
async function completeFeedback() { await click('Loved it!'); await click('Continue') }

describe('isolated Preview experience flow with DEV=false', () => {
  it('opens from Profile and runs animated I Ate Here → verification → feedback → earned log without touching any storage', async () => {
    await mount('/profile'); const before = snapshot()
    await click('Experience flow playground')
    expect(window.location.pathname).toBe('/dev/experience')
    expect(document.body.textContent).toContain('Test mode — does not change your Nom progress.')
    await click('Mock Restaurant Detail')
    expect(document.querySelector('.restaurant-details-page h1').textContent).toBe('THMOR DA Restaurant')
    await click('Save THMOR DA Restaurant to favorites')
    expect(snapshot()).toEqual(before)
    await click('Use a button instead'); await click('Confirm I ate here')
    expect(document.querySelector('.restaurant-ate-swipe').className).toContain('is-complete')
    await act(() => vi.advanceTimersByTimeAsync(450))
    expect(document.querySelector('.verify-page')).toBeTruthy()
    await click('Continue'); expect(document.querySelector('.feedback-page')).toBeTruthy()
    await completeFeedback()
    expect(document.querySelector('.logged-page')).toBeTruthy()
    expect(document.body.textContent).toContain('One more experience added to your country and Mystery Box progress.')
    expect(snapshot()).toEqual(before)
    expect(window.location.pathname).toBe('/dev/experience')
    await click('← Back to Profile'); await click('Experience flow playground')
    expect(document.querySelector('[aria-label="Test experience preview"]')).toBeNull()
    expect(snapshot()).toEqual(before)
  })
  it('covers failed/manual and already-counted paths with no extra progress', async () => {
    await mount(); const before = snapshot()
    await click('Verification failed modal')
    expect(document.querySelector('[role="dialog"]').textContent).toContain('We couldn’t verify your visit automatically')
    const manual = [...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.includes('Log without verification'))
    await act(() => manual.click()); await click('Save without verification'); await completeFeedback()
    expect(document.body.textContent).toContain('Logged without verification')
    expect(document.querySelector('.logged-progress')).toBeNull()
    await click('Already counted today'); await click('Continue')
    expect(document.querySelector('[role="dialog"]').textContent).toContain('This visit was already counted.')
    await click('Log anyway'); await completeFeedback()
    expect(document.body.textContent).toContain('No extra box progress for this meal.')
    expect(snapshot()).toEqual(before)
  })
  it('provides each direct state and an actual isolated Mystery Box reveal; reload/reset discard it', async () => {
    await mount(); const before = snapshot()
    for (const label of ['Verify Your Visit', 'Successful location-demo verification', 'Manual / unverified path', 'Meal Feedback', 'Experience Logged — earned progress', 'Experience Logged — no progress']) {
      await click(label)
      expect(document.querySelector('.verify-page, .feedback-page, .logged-page')).toBeTruthy()
      expect(snapshot()).toEqual(before)
    }
    await click('Mystery Box unlocked')
    const unlocked = document.querySelector('.logged-unlocked')
    expect(unlocked).toBeTruthy(); await act(() => unlocked.click())
    expect(document.querySelector('.box-closed')).toBeTruthy()
    await act(() => document.querySelector('.box-sound-toggle').click())
    expect(snapshot()).toEqual(before)
    await click('Open Mystery Box')
    await act(() => vi.advanceTimersByTimeAsync(BOX_REVEAL_TIMING.settle))
    expect(document.querySelector('.box-reveal')).toBeTruthy()
    expect(document.querySelector('.box-reward h2').textContent).toBe('ZIGGY')
    expect(snapshot()).toEqual(before)
    await click('Reset test experience')
    expect(document.querySelector('.box-page')).toBeNull()
    await click('Experience Logged — earned progress')
    await act(() => root.unmount()); root = createRoot(document.getElementById('root')); await mount()
    expect(document.querySelector('[aria-label="Test experience preview"]')).toBeNull()
    expect(snapshot()).toEqual(before)
  })
})
