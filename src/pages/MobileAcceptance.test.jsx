// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import App from '../App'
import WhyMatchedCard from '../components/recommendations/WhyMatchedCard'
import RewardPlayground from './RewardPlayground'
import { ExperiencePreviewProvider } from '../context/Experience'
import { createExperienceState } from '../data/experienceState'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { rewardQaEnabled } from '../utils/rewardQa'
import { rewardRevealTiming, REWARD_PRESENTATION } from '../utils/rewardPresentation'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'

const source = file => readFileSync(new URL(file, import.meta.url), 'utf8')
let root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root'))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers() })
async function mount(path) {
  window.history.replaceState({}, '', path)
  await act(() => root.render(<App />))
}
async function click(label) {
  const button = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === label || node.getAttribute('aria-label') === label)
  expect(button).toBeTruthy(); await act(() => button.click())
}

describe('mobile acceptance regressions', () => {
  it('uses real safe-area spacing in production and one owner for each header', async () => {
    vi.stubEnv('DEV', false)
    for (const path of ['/home', '/discover/food-type', '/collections', '/recommendations/lort-cha', '/profile']) {
      await mount(path)
      expect(document.querySelector('.nom-app-shell').dataset.chrome).toBe('web')
      expect(document.body.textContent).not.toContain('9:41')
    }
    expect(source('../styles/global.css')).toContain('.nom-status-spacer { height: var(--nom-safe-top);')
    expect(source('../styles/chrome.css')).toContain('--nom-safe-top: env(safe-area-inset-top,0px)')
    expect(source('../styles/hubs.css')).not.toMatch(/home-header[^}]*safe-area-inset-top/)
    expect(source('../styles/experience.css')).not.toMatch(/collection-background[^}]*padding-top:[^;]*safe-area/)
    expect(source('../../index.html')).toContain('viewport-fit=cover')
  })
  it('keeps discovery options and Continue intrinsic inside a dynamic viewport frame', () => {
    const css = source('../styles/discovery.css')
    expect(css).toContain('min-height: 100dvh')
    expect(css).not.toMatch(/956px|1150px|overflow:\s*hidden/)
    expect(css).toContain('min-height: clamp(60px,8.5dvh,72px)')
    expect(css).toContain('padding-right: 26px;')
    expect(css).not.toContain('[aria-pressed=true] .discovery-region-title')
    expect(css).toContain('--discovery-card-height: clamp(104px,15dvh,125px)')
    expect(css).toContain('--discovery-art-height: clamp(52px,8dvh,64px)')
    expect(css).toContain('flex: 1 0 auto; display: grid; grid-auto-rows: max-content; align-content: center')
    expect(css).toContain('gap: clamp(10px,1.6dvh,16px)')
    expect(css).toContain('margin-top: clamp(16px,2.4dvh,24px)')
    expect(css).toContain('margin-bottom: clamp(16px,2.4dvh,24px)')
    expect(css).toContain('min-height: clamp(84px,11.8dvh,100px)')
    expect(css).toContain('min-height: clamp(78px,10.5dvh,88px)')
    expect(css).toContain('--region-art-height: clamp(38px,5.3dvh,46px)')
    expect(css).toContain('gap: clamp(8px,1.4dvh,12px)')
    expect(css).not.toMatch(/max-height: 1000px|clamp\(84px,13dvh|clamp\(40px,7dvh|min-height: 64px|width: 24px|margin: auto|margin-top: auto/)

  })
  it.each(['/discover/food-type', '/discover/flavor', '/discover/adventure', '/discover/region'])('keeps Continue after the flexible options and keyboard accessible on %s', async path => {
    await mount(path)
    const page = document.querySelector('.discovery-page'), options = page.querySelector('.discovery-options'), cta = page.querySelector('.discovery-cta')
    expect(options.nextElementSibling).toBe(cta)
    if (cta.disabled) await act(() => options.querySelector('button').click())
    expect(cta.disabled).toBe(false)
    await act(() => cta.focus())
    expect(document.activeElement).toBe(cta)
  })
  it('shares Home arrow alignment and gives all recommendation actions one size and artwork anchor', async () => {
    await mount('/home')
    const arrows = document.querySelectorAll('.home-section-link')
    expect(arrows).toHaveLength(2)
    expect([...arrows].every(link => link.querySelector('img'))).toBe(true)
    writeLocalState(STORAGE_KEYS.discovery, { foodType: 'noodle', flavors: ['spicy'], adventurousness: 'adventurous', region: 'southeast-asia' })
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await mount('/recommendations')
    const actions = document.querySelectorAll('.recommendation-actions > button')
    expect(actions).toHaveLength(3)
    expect([...actions].every(button => button.classList.contains('recommendation-action'))).toBe(true)
    expect(document.querySelector('.recommendation-header-wave').parentElement.classList.contains('recommendation-header-art')).toBe(true)
    const css = source('../styles/recommendations.css')
    expect(css).toContain('min-height: 63px')
    expect(css).toContain('grid-auto-rows: 1fr')
    expect(css).toContain('bottom: -1px')
    expect(source('../styles/hubs.css')).toContain('.home-section-link > img { display: block;')
  })
  it('puts a visible rounded focus ring around the search pill while typing', async () => {
    await mount('/home')
    const input = document.querySelector('.nom-search-pill input')
    await act(() => { input.focus(); input.value = 'noodles'; input.dispatchEvent(new Event('input', { bubbles: true })) })
    expect(document.activeElement).toBe(input)
    expect(input.closest('.nom-search-pill')).toBeTruthy()
    const css = source('../styles/global.css')
    expect(css).toContain('.nom-search-pill:focus-within { outline: 2px solid')
    expect(css).toContain('.nom-search-pill > input:focus-visible { outline: none; box-shadow: none; }')
    expect(source('../components/ui/SearchField.jsx')).toContain('rounded-full')
  })
  it('runs one gloss pass on viewport entry and remains static with reduced motion', async () => {
    let notify
    const disconnect = vi.fn(), observe = vi.fn()
    const Observer = vi.fn(function (callback) { notify = callback; this.observe = observe; this.disconnect = disconnect })
    vi.stubGlobal('IntersectionObserver', Observer)
    await act(() => root.render(<WhyMatchedCard explanation="Your spicy noodle preferences match." />))
    expect(document.querySelector('.why-matched-card').dataset.entered).toBe('false')
    await act(() => notify([{ isIntersecting: false, intersectionRatio: 0 }]))
    expect(document.querySelector('.why-matched-card').dataset.entered).toBe('false')
    expect(Observer).toHaveBeenCalledWith(expect.any(Function), { threshold: .6 })
    await act(() => notify([{ isIntersecting: true, intersectionRatio: .25 }]))
    expect(document.querySelector('.why-matched-card').dataset.entered).toBe('false')
    await act(() => notify([{ isIntersecting: true, intersectionRatio: .65 }]))
    expect(document.querySelector('.why-matched-card').dataset.entered).toBe('true')
    expect(disconnect).toHaveBeenCalledTimes(1)
    await act(() => root.render(<WhyMatchedCard explanation="A refreshed explanation." />))
    expect(Observer).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).toContain('A refreshed explanation.')
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    Observer.mockClear()
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    await act(() => root.render(<WhyMatchedCard explanation="Static premium card." />))
    expect(Observer).not.toHaveBeenCalled()
    expect(document.querySelector('.why-matched-card').dataset.reducedMotion).toBe('true')
    expect(document.querySelector('.why-matched-card').dataset.entered).toBe('false')
    expect(source('../styles/recommendations.css')).toContain('@media (prefers-reduced-motion: reduce)')
  })
  it('matches the original pale-aqua stars and bounds the full entrance to three seconds', () => {
    const css = source('../styles/recommendations.css'), icon = source('../assets/icons/detail-ai.svg')
    expect(icon).toContain('stroke="#CDF4F2"')
    expect(css).toContain('--why-star-color: #CDF4F2')
    expect(css.match(/\.why-matched-sparkles \{([^}]+)\}/)[1]).toContain('color: var(--why-star-color)')
    expect(css).toContain('nom-match-enter 3000ms ease-out 1 both')
    expect(css).toContain('nom-match-sweep 1200ms ease-in-out 300ms 1 both')
    expect(css).toContain('nom-match-sweep 1400ms ease-out 1400ms 1 both')
    expect(css).toContain('nom-match-icon-pulse 1700ms ease-in-out 700ms 1 both')
    expect(css).toContain('.why-matched-card[data-reduced-motion=true], .why-matched-card[data-reduced-motion=true] * { animation: none !important; }')
    expect(css).toContain('.why-matched-card[data-reduced-motion=true] .why-matched-sweep::after { animation: none !important; opacity: 0; }')
    expect(css.slice(css.indexOf('/* Pale aqua'))).not.toContain('infinite')
  })
  it('keeps the QA route unavailable with the flag off, including in development', async () => {
    vi.stubEnv('VITE_ENABLE_REWARD_QA', '')
    expect(rewardQaEnabled()).toBe(false)
    localStorage.setItem('VITE_ENABLE_REWARD_QA', 'true')
    await mount('/dev/rewards?VITE_ENABLE_REWARD_QA=true&rewardQa=true')
    expect(window.location.pathname).toBe('/home')
    expect(document.querySelector('.reward-playground')).toBeNull()
    await mount('/profile')
    expect(document.querySelector('a[href="/dev/rewards"]')).toBeNull()
    vi.stubEnv('VITE_ENABLE_REWARD_QA', 'false'); expect(rewardQaEnabled()).toBe(false)
    vi.stubEnv('VITE_ENABLE_REWARD_QA', 'true'); expect(rewardQaEnabled()).toBe(true)
  })
  it('previews every tier without calling real actions or adding any real unlocks/progress', async () => {
    vi.useFakeTimers()
    const state = createExperienceState(), before = structuredClone(state), beginBox = vi.fn(), openBox = vi.fn()
    await act(() => root.render(<MemoryRouter><ExperiencePreviewProvider value={{ state, beginBox, openBox }}><RewardPlayground /></ExperiencePreviewProvider></MemoryRouter>))
    let previousDuration = 0, previousParticles = 0
    for (const rarity of ['common', 'rare', 'epic', 'legendary']) {
      await click(`Trigger ${rarity} reward`)
      const page = document.querySelector('.box-page'), profile = REWARD_PRESENTATION[rarity]
      expect(profile.duration).toBeGreaterThan(previousDuration)
      expect(profile.particles).toBeGreaterThan(previousParticles)
      previousDuration = profile.duration; previousParticles = profile.particles
      expect(page.dataset.rarity).toBe(rarity)
      expect(document.querySelectorAll('.box-sparkles i')).toHaveLength(profile.particles)
      expect(document.querySelectorAll('.box-burst i')).toHaveLength(profile.rings)
      await click('Open Mystery Box')
      await act(() => vi.advanceTimersByTimeAsync(rewardRevealTiming(rarity).settle))
      expect(document.querySelector('.box-scene').dataset.stage).toBe('settled')
      expect(state).toEqual(before)
    }
    expect(beginBox).not.toHaveBeenCalled(); expect(openBox).not.toHaveBeenCalled()
    await act(() => { const select = document.querySelector('#qa-reward-motion'); select.value = 'reduce'; select.dispatchEvent(new Event('change', { bubbles: true })) })
    await click('Trigger legendary reward'); await click('Open Mystery Box')
    expect(document.querySelector('.box-page').dataset.reducedMotion).toBe('true')
    await act(() => vi.advanceTimersByTimeAsync(220))
    expect(document.querySelector('.box-scene').dataset.stage).toBe('settled')
    expect(state).toEqual(before)
  })
  it('preserves unfiltered source colors for every country thumbnail', () => {
    const css = source('../styles/experience.css')
    const rule = css.match(/\.collection-country-art > img \{([^}]+)\}/)[1]
    expect(rule).toContain('opacity: 1'); expect(rule).toContain('filter: none')
    expect(rule).not.toMatch(/saturate\(|contrast\(/)
  })
})
