// @vitest-environment happy-dom
import { StrictMode, useMemo, useReducer, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { createExperienceState, experienceReducer } from '../data/experienceState'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { serializeExperience } from '../data/persistedState'
import SurpriseBox, { BOX_REVEAL_TIMING, BOX_REDUCED_TIMING } from './SurpriseBox'
import { ExperiencePreviewProvider } from '../context/Experience'
import { rewardSound } from '../utils/rewardSound'

let root
function readyState({ duplicate = false } = {}) {
  let state = createExperienceState()
  const log = (id, day) => {
    const at = `${day}T12:00:00Z`
    const draft = { id, dishId: 'lort-cha', restaurantId: 'preview-thmor-da', countryCode: 'KH', startedAt: at,
      verification: { verified: true, method: 'qr-demo', source: 'development', checkedAt: at }, feedback: { reaction: 'loved', observations: [], note: '' } }
    state = experienceReducer(state, { type: 'start', draft })
    state = experienceReducer(state, { type: 'complete', id, at, day })
  }
  if (duplicate) {
    log('first-visit', '2026-10-01')
    state = experienceReducer(state, { type: 'begin-box', id: 'box-first-visit' })
    state = experienceReducer(state, { type: 'open-box', id: 'box-first-visit', at: '2026-10-01T12:01:00Z' })
    log('second-visit', '2026-10-02'); log('third-visit', '2026-10-03')
  }
  log('motion-visit', '2026-10-05')
  return state
}
beforeEach(() => {
  vi.useFakeTimers(); globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(() => root.unmount()); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
async function mount(options) {
  writeLocalState(STORAGE_KEYS.experience, serializeExperience(readyState(options)))
  window.history.replaceState({}, '', '/boxes/box-motion-visit')
  await act(() => root.render(<App />))
}
async function open() { await act(() => document.querySelector('[aria-label="Open Mystery Box"]').click()) }
async function advance(ms) { await act(() => vi.advanceTimersByTimeAsync(ms)) }
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.experience)).data
const count = () => Number(document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'))
describe('Mystery Box canonical reward sequence', () => {
  it('retains preloaded artwork and its fixed theatre through every stage and ignores rapid Open taps', async () => {
    await mount()
    const theatre = document.querySelector('.box-theatre'), scene = document.querySelector('.box-scene')
    const artwork = document.querySelector('.box-character-color .collectible-character'), source = artwork.src
    const tap = document.querySelector('.box-tap')
    await act(() => { tap.click(); tap.click(); tap.click() })
    let elapsed = 0
    for (const [stage, time] of Object.entries(BOX_REVEAL_TIMING)) {
      await advance(time - elapsed); elapsed = time
      expect(document.querySelector('.box-theatre')).toBe(theatre)
      expect(document.querySelector('.box-scene')).toBe(scene)
      expect(document.querySelector('.box-character-color .collectible-character')).toBe(artwork)
      expect(artwork.src).toBe(source)
      expect(scene.dataset.stage).toBe(stage === 'settle' ? 'settled' : stage)
    }
    expect(saved().openedBoxes).toHaveLength(1)
    expect(document.querySelectorAll('.box-sparkles i')).toHaveLength(4)
    expect(document.querySelector('.box-halo')).toBeNull()
    expect(document.querySelector('[role="progressbar"] span').style.width).toBe('')
  })
  it('reuses its fixed scene through isolated preview phases without changing saved rewards or navigating', async () => {
    const phaseChanged = vi.fn(), back = vi.fn(), collection = vi.fn()
    const persisted = localStorage.getItem(STORAGE_KEYS.experience)
    function Preview() {
      const [state, dispatch] = useReducer(experienceReducer, undefined, readyState)
      const [phase, setPhase] = useState('closed')
      const actions = useMemo(() => ({
        beginBox: id => dispatch({ type: 'begin-box', id }),
        openBox: id => dispatch({ type: 'open-box', id, at: '2026-10-05T12:01:00Z' }),
      }), [])
      return <ExperiencePreviewProvider value={{ state, ...actions }}><SurpriseBox boxId="box-motion-visit" phase={phase}
        onPhaseChange={next => { phaseChanged(next); setPhase(next) }} onBack={back} onViewCollection={collection} /></ExperiencePreviewProvider>
    }
    await act(() => root.render(<MemoryRouter initialEntries={['/qa']}><Preview /></MemoryRouter>))
    const scene = document.querySelector('.box-scene'), artwork = document.querySelector('.box-gift-art')
    const originalPath = window.location.pathname
    await open(); expect(phaseChanged).toHaveBeenCalledWith('opening')
    await advance(BOX_REVEAL_TIMING.settle)
    expect(phaseChanged).toHaveBeenLastCalledWith('reveal')
    expect(document.querySelector('.box-scene')).toBe(scene)
    expect(document.querySelector('.box-gift-art')).toBe(artwork)
    expect(scene.dataset.stage).toBe('settled'); expect(count()).toBe(6)
    await act(() => document.querySelector('.box-collection').click())
    expect(collection).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe(originalPath)
    expect(localStorage.getItem(STORAGE_KEYS.experience)).toBe(persisted)
  })
  it('anticipates, pops, reveals once, then updates actual collection progress', async () => {
    await mount(); const beforeLogs = saved().logs
    await open(); const theatre = document.querySelector('.box-theatre')
    expect(document.querySelector('.box-stage-anticipation')).toBeTruthy()
    expect(saved().openedBoxes).toHaveLength(0)
    await advance(BOX_REVEAL_TIMING.pop)
    expect(document.querySelector('.box-stage-pop')).toBeTruthy()
    expect(document.querySelector('.box-reward').getAttribute('aria-hidden')).toBe('true')
    await advance(BOX_REVEAL_TIMING.silhouette - BOX_REVEAL_TIMING.pop)
    expect(document.querySelector('.box-character.is-silhouette.is-visible')).toBeTruthy()
    expect(document.querySelector('.box-reward').getAttribute('aria-hidden')).toBe('true')
    expect(saved().openedBoxes).toHaveLength(1)
    await advance(BOX_REVEAL_TIMING.reward - BOX_REVEAL_TIMING.silhouette)
    expect(document.querySelector('.box-character.is-resolved')).toBeTruthy()
    expect(document.querySelector('.box-reward h2').textContent).toBe('ZIGGY')
    expect(saved().openedBoxes).toHaveLength(1); expect(count()).toBe(5)
    await advance(BOX_REVEAL_TIMING.rarity - BOX_REVEAL_TIMING.reward)
    expect(document.querySelector('.box-reward').getAttribute('aria-hidden')).toBe('false')
    expect(document.querySelector('.box-collection').disabled).toBe(true)
    expect(document.querySelector('.box-theatre')).toBe(theatre)
    expect(document.querySelector('.box-scene .box-reveal')).toBeNull()
    await advance(BOX_REVEAL_TIMING.progress - BOX_REVEAL_TIMING.rarity)
    expect(count()).toBe(6)
    await advance(BOX_REVEAL_TIMING.settle - BOX_REVEAL_TIMING.progress)
    expect(window.location.pathname).toBe('/boxes/box-motion-visit/reveal')
    expect(saved().logs).toEqual(beforeLogs); expect(saved().openedBoxes).toHaveLength(1)
    expect(document.querySelector('.box-collection').textContent).toBe('View Collection')
    expect(document.querySelector('.box-collection').disabled).toBe(false)
    expect(document.querySelector('.box-opening')).toBeNull()
    expect(document.querySelector('.box-theatre')).toBe(theatre)
    expect(document.querySelector('.box-scene').dataset.stage).toBe('settled')
  })
  it('handles a completed collection without counting a duplicate again', async () => {
    await mount({ duplicate: true }); await open(); await advance(BOX_REVEAL_TIMING.reward)
    expect(count()).toBe(6)
    expect(document.querySelector('.box-reward').textContent).toContain('Already in your collection')
    await advance(BOX_REVEAL_TIMING.settle - BOX_REVEAL_TIMING.reward)
    expect(count()).toBe(6); expect(saved().openedBoxes).toHaveLength(2)
  })
  it('takes the short reduced-motion route and never repeats the reward on revisit', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    await mount(); await open()
    expect(document.querySelector('.box-page').dataset.reducedMotion).toBe('true')
    await advance(BOX_REDUCED_TIMING.settle)
    expect(window.location.pathname).toBe('/boxes/box-motion-visit/reveal'); expect(count()).toBe(6)
    const before = localStorage.getItem(STORAGE_KEYS.experience)
    await act(() => { window.history.pushState({}, '', '/boxes/box-motion-visit'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(window.location.pathname).toBe('/boxes/box-motion-visit/reveal')
    await advance(2000); expect(localStorage.getItem(STORAGE_KEYS.experience)).toBe(before)
  })
  it('cancels an abandoned sequence and safely restarts an unearned reward after reload', async () => {
    await mount(); await open(); await advance(300)
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await advance(2000); expect(saved().openedBoxes).toHaveLength(0)
    await act(() => root.render(<App />))
    expect(window.location.pathname).toBe('/boxes/box-motion-visit')
    await open(); await advance(BOX_REVEAL_TIMING.settle)
    expect(saved().openedBoxes).toHaveLength(1); expect(count()).toBe(6)
  })
  it('never starts audio on render or reload and only plays after an enabled Open tap', async () => {
    const play = vi.spyOn(rewardSound, 'play').mockReturnValue(true)
    await mount(); expect(play).not.toHaveBeenCalled()
    const sound = document.querySelector('.box-sound-toggle')
    expect(sound.textContent).toContain('Sound off')
    await act(() => sound.click()); expect(play).not.toHaveBeenCalled()
    await act(() => { document.querySelector('[aria-label="Open Mystery Box"]').click(); document.querySelector('[aria-label="Open Mystery Box"]').click() })
    expect(play).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, rarity: 'common' }))
    await advance(BOX_REVEAL_TIMING.settle); expect(play).toHaveBeenCalledTimes(1)
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await act(() => root.render(<App />)); expect(play).toHaveBeenCalledTimes(1)
  })
  it('keeps an unavailable sound nonblocking and stops sound on abandonment', async () => {
    const play = vi.spyOn(rewardSound, 'play').mockReturnValue(false), stop = vi.spyOn(rewardSound, 'stop')
    await mount(); await act(() => document.querySelector('.box-sound-toggle').click()); await open()
    expect(play).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).toContain('Sound is unavailable')
    const stops = stop.mock.calls.length
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await advance(0); expect(stop.mock.calls.length).toBeGreaterThan(stops)
    await advance(2000); expect(saved().openedBoxes).toHaveLength(0)
  })
  it('renders an already-earned opening URL as a static reveal on reload', async () => {
    await mount(); await open(); await advance(BOX_REVEAL_TIMING.settle)
    const before = localStorage.getItem(STORAGE_KEYS.experience), play = vi.spyOn(rewardSound, 'play')
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    window.history.replaceState({}, '', '/boxes/box-motion-visit/opening')
    await act(() => root.render(<App />))
    expect(window.location.pathname).toBe('/boxes/box-motion-visit/reveal')
    expect(document.querySelector('.box-scene').dataset.stage).toBe('settled')
    await advance(3000)
    expect(play).not.toHaveBeenCalled(); expect(localStorage.getItem(STORAGE_KEYS.experience)).toBe(before)
  })
  it('preserves a user-triggered sound through development effect replays', async () => {
    const play = vi.spyOn(rewardSound, 'play').mockReturnValue(true), stop = vi.spyOn(rewardSound, 'stop')
    writeLocalState(STORAGE_KEYS.experience, serializeExperience(readyState()))
    window.history.replaceState({}, '', '/boxes/box-motion-visit')
    await act(() => root.render(<StrictMode><App /></StrictMode>))
    await act(() => document.querySelector('.box-sound-toggle').click())
    stop.mockClear(); await open(); await advance(0)
    expect(play).toHaveBeenCalledTimes(1); expect(stop).not.toHaveBeenCalled()
    await advance(BOX_REVEAL_TIMING.settle); await advance(0)
    expect(stop).not.toHaveBeenCalled()
    expect(saved().openedBoxes).toHaveLength(1)
  })
  it('mutes scheduled sound immediately during an opening without interrupting the reward', async () => {
    const play = vi.spyOn(rewardSound, 'play').mockReturnValue(true), stop = vi.spyOn(rewardSound, 'stop')
    await mount(); await act(() => document.querySelector('.box-sound-toggle').click()); await open()
    stop.mockClear(); await act(() => document.querySelector('.box-sound-toggle').click())
    expect(stop).toHaveBeenCalled(); expect(document.querySelector('.box-sound-toggle').textContent).toContain('Sound off')
    await advance(BOX_REVEAL_TIMING.settle)
    expect(play).toHaveBeenCalledTimes(1); expect(saved().openedBoxes).toHaveLength(1)
  })
  it('suppresses enabled sound while reduced motion is active', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    const play = vi.spyOn(rewardSound, 'play')
    await mount(); await act(() => document.querySelector('.box-sound-toggle').click()); await open()
    await advance(BOX_REDUCED_TIMING.settle)
    expect(play).not.toHaveBeenCalled(); expect(saved().openedBoxes).toHaveLength(1)
  })
})
