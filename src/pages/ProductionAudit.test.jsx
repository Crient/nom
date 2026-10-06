// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import App from '../App'
import StatusBar from '../components/layout/StatusBar'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { collectionCountries, collectibleDefinitions } from '../data/collectionDefinitions'
import { installMockNearbyProvider } from '../test/mockNearbyProvider'
import { nearbyErrorMessage } from '../data/nearbyRestaurantService'
import { createRestaurantSearchState } from '../data/restaurantSearchState'

let root
beforeEach(() => {
  installMockNearbyProvider(); globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  document.body.innerHTML = '<div id="root"></div>'
  writeLocalState(STORAGE_KEYS.discovery, { foodType: 'noodle', flavors: ['spicy', 'comforting'], adventurousness: 'adventurous', region: 'southeast-asia' })
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })
async function navigate(path) {
  await act(() => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); root.render(<App />) })
}
const source = file => readFileSync(new URL(file, import.meta.url), 'utf8')
const selectedView = () => document.querySelector('.hub-filters button[aria-pressed=true]')?.textContent

describe('production audit regressions', () => {
  it('remembers a dismissed permission attempt after a full app reload in the same tab', async () => {
    const locate = vi.fn().mockRejectedValue(Object.assign(new Error(), { code: 'LOCATION_TIMEOUT' })), provider = vi.fn()
    const first = createRestaurantSearchState({ locate, provider, getCached: () => null })
    await first.autoSearch('lort-cha', { permissions: { query: async () => ({ state: 'prompt' }) } })
    const reloaded = createRestaurantSearchState({ locate, provider, getCached: () => null })
    await reloaded.autoSearch('ramen', { permissions: { query: async () => ({ state: 'prompt' }) } })
    expect(locate).toHaveBeenCalledTimes(1); expect(provider).not.toHaveBeenCalled()
    expect(reloaded.getSnapshot('ramen').status).toBe('idle')
  })
  it.each([
    ['Dishes explored', '/history?view=views'], ['Meals logged', '/history?view=meals'],
    ['Countries explored', '/progress'], ['Saved dishes', '/favorites?view=dishes'],
  ])('makes the entire %s summary a focusable destination', async (label, destination) => {
    await navigate('/profile')
    const link = [...document.querySelectorAll('.hub-summary a')].find(item => item.textContent === label)
    expect(link.getAttribute('href')).toBe(destination)
    expect(link.closest('.hub-summary > div').querySelector('dd')).toBeTruthy()
    await act(() => link.focus()); expect(document.activeElement).toBe(link)
    await act(() => link.click()); expect(window.location.pathname + window.location.search).toBe(destination)
    await act(() => document.querySelector('.flow-back').click())
    expect(window.location.pathname).toBe('/profile')
    const css = source('../styles/hubs.css')
    expect(css).toContain('.hub-summary-link::after'); expect(css).toContain('.hub-summary-link:focus-visible::after')
  })
  it.each(['dishes', 'restaurants', 'collectibles'])('loads and reloads the URL-backed %s category', async view => {
    await navigate(`/favorites?view=${view}`)
    expect(selectedView().toLowerCase()).toBe(view)
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await act(() => root.render(<App />)); expect(selectedView().toLowerCase()).toBe(view)
  })
  it('preserves other query parameters and browser Back across category changes', async () => {
    await navigate('/favorites?keep=1')
    expect(selectedView()).toBe('Dishes')
    await act(() => [...document.querySelectorAll('.hub-filters button')].find(item => item.textContent === 'Restaurants').click())
    expect(window.location.search).toBe('?keep=1&view=restaurants')
    await navigate('/favorites?view=collectibles')
    await act(async () => { window.history.back(); await new Promise(resolve => setTimeout(resolve, 10)) })
    expect(selectedView()).toBe('Restaurants')
    await navigate('/favorites?view=unknown'); expect(selectedView()).toBe('Dishes')
  })
  it('preserves the Profile origin when switching favorite categories', async () => {
    await navigate('/profile')
    await act(() => document.querySelector('.hub-summary a[href="/favorites?view=dishes"]').click())
    await act(() => [...document.querySelectorAll('.hub-filters button')].find(item => item.textContent === 'Collectibles').click())
    await act(() => document.querySelector('.flow-back').click())
    expect(window.location.pathname).toBe('/profile')
  })
  it('preserves the Profile origin when switching History filters', async () => {
    await navigate('/profile')
    await act(() => document.querySelector('.hub-summary a[href="/history?view=views"]').click())
    await act(() => [...document.querySelectorAll('.hub-filters button')].find(item => item.textContent === 'Meals logged').click())
    expect(window.location.search).toBe('?view=meals')
    await act(() => document.querySelector('.flow-back').click())
    expect(window.location.pathname).toBe('/profile')
  })
  it('discloses the verification preview and saved-only feedback without development copy in production', async () => {
    await navigate('/recommendations/lort-cha/nearby/preview-thmor-da')
    await act(() => document.querySelector('.restaurant-ate').click())
    vi.stubEnv('DEV', false)
    await navigate(window.location.pathname)
    expect(document.body.textContent).toContain('No GPS or visit time is being measured')
    expect(document.body.textContent).not.toMatch(/200m|17 min|development|Figma/i)
    await act(() => document.querySelector('.flow-cta button').click())
    expect(document.body.textContent).toContain('Preview verification')
    await act(() => document.querySelector('.feedback-privacy').click())
    expect(document.querySelector('[role=dialog]').textContent).toContain('It doesn’t change your current matches')
    expect(document.body.textContent).not.toMatch(/Personalized for you|development|Figma|9:41/i)
  })
  it('derives collectible capacity from definitions and shows the same progress component everywhere', async () => {
    await navigate('/progress')
    const total = [...document.querySelectorAll('dt')].find(item => item.textContent === 'Collectibles').nextElementSibling.textContent
    expect(total.split('/')[1]).toBe(String(collectionCountries.length * collectibleDefinitions.length))
    const reference = document.querySelector('.country-progress-card').innerHTML
    for (const path of ['/home', '/collections/cambodia']) {
      await navigate(path); expect(document.querySelector('.country-progress-card').innerHTML).toBe(reference)
    }
  })
  it.each(['/discover/food-type', '/discover/flavor', '/discover/adventure', '/discover/region'])('keeps the CTA after options in document flow at %s', async path => {
    await navigate(path)
    const page = document.querySelector('.discovery-page'), options = page.querySelector('.discovery-options'), cta = page.querySelector('.discovery-cta')
    expect(options.nextElementSibling).toBe(cta); expect(cta.className).not.toContain('absolute')
    expect(page.querySelector('h1').className).not.toContain('absolute')
    expect(page.querySelector('.discovery-option-row, .discovery-list-option').className).not.toContain('absolute')
  })
  it('reserves a Region indicator slot in both selected and unselected states', async () => {
    await navigate('/discover/region')
    const button = document.querySelector('.surprise-region-button'), slot = button.querySelector('.surprise-region-indicator-slot'), copy = button.querySelector('.surprise-region-copy')
    expect(slot).toBeTruthy(); expect(slot.children).toHaveLength(0)
    expect(button.className).toContain('pr-[38px]')
    await act(() => button.click())
    expect(button.getAttribute('aria-pressed')).toBe('true'); expect(slot.children).toHaveLength(1)
    expect(button.querySelector('.surprise-region-copy')).toBe(copy)
    await act(() => button.click()); expect(slot.children).toHaveLength(0)
  })
  it('keeps raw country colors, uses full-opacity portrait art and never clips outer corners', () => {
    const css = source('../styles/experience.css')
    expect(css).not.toMatch(/contrast\(1\.32\)|saturate\(1\.22\)|\.4875/)
    expect(css).toContain('object-fit: cover; opacity: 1; filter: none')
    expect(css).toContain('.country-collection-page { border-radius: 0; }')
    expect(css).toContain('mask-image: linear-gradient(to bottom,#000 82%,transparent 100%)')
    expect(css).toContain('0 0 24px 7px rgb(214 173 82 / .3)')
  })
  it.each(['/home', '/collections', '/progress', '/profile', '/explore', '/scan', '/image-credits', '/collections/japan/lumi'])('hides internal implementation copy on %s in production', async path => {
    vi.stubEnv('DEV', false)
    await navigate(path)
    expect(document.body.textContent).not.toMatch(/9:41|development|Figma|Catalog review|Copied verified staged|Image review:|demo unlocks/i)
    expect(document.querySelector('[data-status-bar=safe-area]')?.children).toHaveLength(0)
    if (path === '/home') expect(document.querySelector('a[href="/scan"]')).toBeNull()
  })
  it('renders production safe-area spacing and an explicit design preview without fake chrome in production', async () => {
    vi.stubEnv('DEV', false)
    await act(() => root.render(<StatusBar />))
    expect(document.querySelector('[data-status-bar=safe-area]')).toBeTruthy(); expect(document.body.textContent).toBe('')
    await act(() => root.render(<StatusBar preview />))
    expect(document.body.textContent).toBe('9:41'); expect(document.querySelectorAll('img')).toHaveLength(3)
  })
  it('gives quota errors distinct friendly copy without provider details', () => {
    const message = nearbyErrorMessage('QUOTA_LIMIT')
    expect(message).toBe('Nearby search is busy right now. Try again in a minute.')
    expect(message).not.toBe(nearbyErrorMessage('PROVIDER_UNAVAILABLE'))
    expect(message).not.toMatch(/quota|Google|429|coordinates|key/i)
  })
  it('bounds match entry animation, strengthens active chewing, and includes static reduced-motion fallbacks', () => {
    const match = source('../styles/recommendations.css'), ate = source('../styles/restaurant-live.css'), deck = source('../components/recommendations/SurpriseDishCard.jsx')
    expect(match).toContain('nom-match-enter 3000ms ease-out 1 both')
    expect(match).toContain('.why-matched-card[data-entered=true] .why-matched-sparkles i { animation: none; }')
    expect(ate).toContain('360ms ease-in-out infinite'); expect(ate).toContain('rotate(11deg)'); expect(ate).toContain('rotate(-11deg)')
    expect(ate).toContain('.restaurant-ate-jaw { animation: none !important; }')
    expect(deck.indexOf('setDeck(deck =>')).toBeGreaterThan(deck.indexOf('useLayoutEffect(() =>'))
    expect(deck).not.toContain('setDeck({ identity')
  })
})
