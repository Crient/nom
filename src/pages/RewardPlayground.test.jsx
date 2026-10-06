// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.hoisted(() => { vi.stubEnv('VITE_ENABLE_REWARD_QA', 'true') })
import App from '../App'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { createExperienceState, experienceReducer } from '../data/experienceState'
import { serializeExperience } from '../data/persistedState'
import { BOX_REVEAL_TIMING } from './SurpriseBox'
import { rewardRevealTiming } from '../utils/rewardPresentation'

let root
beforeEach(() => {
  vi.useFakeTimers(); globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  root = createRoot(document.getElementById('root'))
  writeLocalState(STORAGE_KEYS.experience, serializeExperience(createExperienceState()))
})
afterEach(async () => { await act(() => root.unmount()); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
async function mount(path = '/dev/rewards') {
  window.history.replaceState({}, '', path); await act(() => root.render(<App />))
}
async function click(label) {
  const button = [...document.querySelectorAll('button,a')].find(node => node.textContent.trim() === label || node.getAttribute('aria-label') === label)
  expect(button, `Missing ${label}`).toBeTruthy(); await act(() => button.click())
}
const saved = () => localStorage.getItem(STORAGE_KEYS.experience)
describe('local reward playground', () => {
  it('is accessible from Profile and grants/replays/resets only in-memory common and rare rewards', async () => {
    await mount('/profile'); const before = saved()
    await click('Reward playground')
    expect(window.location.pathname).toBe('/dev/rewards')
    expect(document.querySelector('button:disabled').textContent).toBe('Replay last reward animation')
    await click('Trigger common reward'); await click('Open Mystery Box')
    await act(() => vi.advanceTimersByTimeAsync(BOX_REVEAL_TIMING.silhouette))
    expect(document.querySelector('.box-scene').dataset.stage).toBe('silhouette')
    await act(() => vi.advanceTimersByTimeAsync(BOX_REVEAL_TIMING.settle - BOX_REVEAL_TIMING.silhouette))
    expect(document.querySelector('.box-reward h2').textContent).toBe('ZIGGY')
    expect(document.querySelector('.box-scene').dataset.stage).toBe('settled')
    expect(window.location.pathname).toBe('/dev/rewards'); expect(saved()).toBe(before)
    await click('Replay last reward animation')
    expect(document.querySelector('.box-closed')).toBeTruthy()
    await click('Trigger rare reward'); await click('Open Mystery Box')
    await act(() => vi.advanceTimersByTimeAsync(rewardRevealTiming('rare').settle))
    expect(document.querySelector('.box-reward h2').textContent).toBe('FENN')
    expect(document.querySelector('.box-reward .rarity-badge').textContent).toBe('Rare')
    await click('Reset test reward state')
    expect(document.querySelector('.box-page')).toBeNull()
    expect(document.querySelector('[role="status"]').textContent).toBe('Test reward state reset.')
    expect(saved()).toBe(before)
  })
  it('previews a selected country and final reveal, and cancels a replaced animation without navigation or persistence', async () => {
    await mount(); const before = saved()
    await act(() => { const select = document.querySelector('#qa-reward-country'); select.value = 'japan'; select.dispatchEvent(new Event('change', { bubbles: true })) })
    await click('Trigger country mystery box')
    expect(document.querySelector('.box-page').dataset.country).toBe('japan')
    await click('Open Mystery Box'); await act(() => vi.advanceTimersByTimeAsync(100))
    await click('Preview collectible reveal')
    expect(document.querySelector('.box-scene').dataset.stage).toBe('settled')
    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(document.querySelector('.box-scene').dataset.stage).toBe('settled')
    expect(window.location.pathname).toBe('/dev/rewards'); expect(saved()).toBe(before)
    await click('View Collection'); expect(document.body.textContent).toContain('Japan test collectible')
    await click('Back to reveal'); expect(document.querySelector('.box-reveal')).toBeTruthy()
  })
  it('can replay the last earned reward without changing that reward or the real collection', async () => {
    const draft = { id: 'qa-earned-meal', dishId: 'lort-cha', restaurantId: 'preview-thmor-da', countryCode: 'KH', startedAt: '2026-10-05T12:00:00Z',
      verification: { verified: true, method: 'qr-demo', source: 'development', checkedAt: '2026-10-05T12:00:00Z' }, feedback: { reaction: 'loved', observations: [], note: '' } }
    let state = experienceReducer(createExperienceState(), { type: 'start', draft })
    state = experienceReducer(state, { type: 'complete', id: draft.id, day: '2026-10-05', at: '2026-10-05T12:00:00Z' })
    state = experienceReducer(state, { type: 'begin-box', id: 'box-qa-earned-meal' })
    state = experienceReducer(state, { type: 'open-box', id: 'box-qa-earned-meal', at: '2026-10-05T12:01:00Z' })
    writeLocalState(STORAGE_KEYS.experience, serializeExperience(state))
    await mount(); const before = saved()
    await click('Replay last reward animation'); await click('Open Mystery Box')
    await act(() => vi.advanceTimersByTimeAsync(BOX_REVEAL_TIMING.settle))
    expect(document.querySelector('.box-reward h2').textContent).toBe('ZIGGY')
    expect(saved()).toBe(before)
  })
})
