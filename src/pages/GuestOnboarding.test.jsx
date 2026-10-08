// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { serializeExperience } from '../data/persistedState'
import { earnedJourney } from '../test/earnedJourney'
import { dishes } from '../data/dishes'
import { installMockNearbyProvider } from '../test/mockNearbyProvider'
import { mockSupabase, USER_A } from '../test/accountFixtures'

let root, sdk
beforeEach(() => {
  installMockNearbyProvider(); vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ location: false, receipt: false, qr: false }) })))
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')); sdk = null
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })
async function navigate(path) {
  await act(() => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); root.render(<App supabaseClient={sdk} />) })
}
async function click(label) {
  const node = [...document.querySelectorAll('button,a')].find(node => node.textContent.trim() === label || node.getAttribute('aria-label') === label)
  expect(node, label).toBeTruthy(); await act(() => node.click())
}
const summaries = () => Object.fromEntries([...document.querySelectorAll('.hub-summary dt')].map(dt => [dt.textContent, dt.nextElementSibling.textContent]))
describe('explicit Guest entry and immediate discovery', () => {
  it('starts an empty Guest without demo/cloud activity or earned rewards', async () => {
    await navigate('/'); expect(document.body.textContent).toContain('Sign in or create account')
    await click('Continue as Guest'); expect(window.location.pathname).toBe('/home')
    expect(document.body.textContent).toContain('Guest · Local Explorer')
    await navigate('/profile')
    expect(Object.values(summaries())).toEqual(['0', '0', '0', '0'])
    expect(document.body.textContent).toContain('0 dishes · 0 restaurants · 0 collectible favorites')
    expect(document.body.textContent).toContain('0 owned collectibles')
    await navigate('/progress'); expect(summaries()['Owned collectibles']).toBe('0')
    expect(document.body.textContent).toContain('48 collectibles in the catalog')
    expect(document.querySelector('a[href^="/boxes/"]')).toBeNull()
    const experience = JSON.parse(localStorage.getItem(STORAGE_KEYS.experience)).data
    expect(experience).toMatchObject({ logs: [], openedBoxes: [], favorites: [] })
    await navigate('/history'); expect(document.querySelectorAll('.activity-card')).toHaveLength(0)
    await navigate('/boxes/box-qa'); expect(document.body.textContent).toContain('Mystery Box not found')
    expect(document.querySelector('[aria-label="Open Mystery Box"]')).toBeNull()
  })
  it.each(['fresh Guest', 'returning Guest', 'account'])('Let’s Eat completes all four normal steps for %s', async mode => {
    if (mode === 'returning Guest') writeLocalState(STORAGE_KEYS.activity, { displayName: 'Returning Explorer', recentDishes: [] })
    if (mode === 'account') { sdk = mockSupabase(USER_A); sdk.rows.profiles.push({ id: USER_A.id, display_name: 'Account Explorer' }) }
    await navigate('/home'); await click('Let’s Eat')
    expect(window.location.pathname).toBe('/discover/food-type')
    await click('Noodle'); await click('Continue'); expect(window.location.pathname).toBe('/discover/flavor')
    await click('Spicy'); await click('Continue'); expect(window.location.pathname).toBe('/discover/adventure')
    // Any concrete adventure option is valid; avoid relying on decorative copy.
    await act(() => document.querySelector('.discovery-options button').click())
    await click('Continue'); expect(window.location.pathname).toBe('/discover/region')
    await act(() => document.querySelector('.discovery-options button').click())
    await click('Continue'); expect(window.location.pathname).toBe('/recommendations')
    expect(document.querySelectorAll('article')).toHaveLength(3)
  })
  it.each(['Guest', 'account'])('Surprise opens the swipe deck without changing answers, and selects a dish for %s', async mode => {
    if (mode === 'account') sdk = mockSupabase(USER_A)
    writeLocalState(STORAGE_KEYS.discovery, {foodType:'noodle',flavors:['spicy'],adventurousness:'adventurous',region:'southeast-asia'})
    await navigate('/home')
    const preferences = localStorage.getItem(STORAGE_KEYS.discovery)
    await click('Surprise me')
    expect(window.location.pathname).toBe('/recommendations/surprise')
    const first = document.querySelector('.surprise-dish-card').getAttribute('aria-label')
    expect(dishes.some(dish => dish.name === first)).toBe(true)
    expect(document.querySelector('.surprise-card-stack')).toBeTruthy()
    expect(document.querySelector('.discovery-page')).toBeNull()
    expect(document.querySelector('[aria-label$="% match"]')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.discovery)).toBe(preferences)
    vi.useFakeTimers()
    await click('Not this one'); await act(() => vi.advanceTimersByTimeAsync(240))
    const second = document.querySelector('.surprise-dish-card').getAttribute('aria-label')
    expect(second).not.toBe(first)
    await click('↶ Undo skip'); await act(() => vi.advanceTimersByTimeAsync(240))
    expect(document.querySelector('.surprise-dish-card').getAttribute('aria-label')).toBe(first)
    await click('Try this'); await act(() => vi.advanceTimersByTimeAsync(240))
    vi.useRealTimers()
    const id = window.location.pathname.split('/').at(-1)
    expect(dishes.find(dish => dish.id === id).name).toBe(first)
    expect(window.location.search).toBe('?surprise=1')
    expect(document.body.textContent).toContain('Random surprise')
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await act(() => root.render(<App supabaseClient={sdk} />))
    expect(window.location.pathname).toBe(`/recommendations/${id}`)
    expect(document.body.textContent).toContain('Random surprise')
    await click('See all'); expect(window.location.pathname).toBe(`/recommendations/${id}/nearby`)
    expect(document.querySelector('.discovery-page')).toBeNull()
    await navigate('/home'); await click('Surprise me')
    expect(window.location.pathname).toBe('/recommendations/surprise')
    expect(document.querySelector('.surprise-dish-card').getAttribute('aria-label')).not.toBe(first)
    expect(localStorage.getItem(STORAGE_KEYS.discovery)).toBe(preferences)
  })
  it('restores legitimate Guest rewards across reload and keeps account hydration/signout separate', async () => {
    writeLocalState(STORAGE_KEYS.experience, serializeExperience(earnedJourney()))
    writeLocalState(STORAGE_KEYS.activity, { displayName: 'Local friend', recentDishes: [] })
    await navigate('/profile'); expect(document.body.textContent).toContain('1 owned collectibles')
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await act(() => root.render(<App />)); expect(summaries()['Meals logged']).toBe('3')
    sdk = mockSupabase(USER_A); sdk.rows.profiles.push({ id: USER_A.id, display_name: 'Account friend' })
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await navigate('/profile'); await click('Use account data only')
    expect(summaries()['Meals logged']).toBe('0'); expect(document.body.textContent).toContain(USER_A.email)
    expect(document.body.textContent).toContain('0 owned collectibles')
    await click('Account settings & sign out'); await click('Sign out')
    expect(document.body.textContent).toContain('Local friend')
    expect(document.body.textContent).not.toContain(USER_A.email)
    expect(summaries()['Meals logged']).toBe('3'); expect(document.body.textContent).toContain('1 owned collectibles')
  })
})
