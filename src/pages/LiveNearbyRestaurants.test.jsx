// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { restaurantSearchState } from '../data/restaurantSearchState'
import { nearbyRestaurantService } from '../data/nearbyRestaurantService'
import { placeDetailsService, placePhotoService } from '../data/placeExtrasService'

let root, fetchMock, locationMock
const preferences = { foodType: 'noodle', flavors: ['spicy', 'comforting'], adventurousness: 'adventurous', region: 'southeast-asia' }
function restaurant(index, changes = {}) {
  return { id: `google:test-place-${index}`, placeId: `test-place-${index}`, dishId: 'lort-cha', source: 'google-places',
    name: `Test restaurant ${index}`, address: `Test address ${index}`, latitude: 40.001 * (index / 1000 + 1), longitude: -75,
    googleMapsUri: `https://maps.google.com/?cid=${index}`, rating: 4.6, userRatingCount: 269,
    openNow: true, openingStatus: 'open', closingTime: null, openingHours: ['Monday: 10 AM–10 PM'],
    observedAt: Date.now(), matchType: index > 2 ? 'cuisine-fallback' : 'exact-dish-search', cuisine: 'Cambodian', attributions: [], ...changes }
}
function data(places = [restaurant(1), restaurant(2), restaurant(3), restaurant(4)]) {
  return { restaurants: places, source: 'google-places', apiCalls: 2, searchedAt: Date.now(), cuisine: 'Cambodian' }
}
function ok(result) { return { ok: true, json: async () => result } }
beforeEach(() => {
  restaurantSearchState.reset(); nearbyRestaurantService.clear()
  // Isolate deliberate searches; first-time automatic permission flow has its own suite.
  vi.spyOn(restaurantSearchState, 'autoSearch').mockResolvedValue()
  placeDetailsService.clear(); placePhotoService.clear()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  locationMock = vi.fn().mockImplementation(resolve => resolve({ coords: { latitude: 40, longitude: -75 } }))
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: locationMock } })
  fetchMock = vi.fn().mockImplementation(async () => ok(data()))
  vi.stubGlobal('fetch', fetchMock)
  writeLocalState(STORAGE_KEYS.discovery, preferences)
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => {
  await act(() => root.unmount()); restaurantSearchState.reset(); nearbyRestaurantService.clear()
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers()
  placeDetailsService.clear(); placePhotoService.clear()
})
async function mount(path = '/recommendations/lort-cha') {
  window.history.replaceState({}, '', path)
  await act(() => root.render(<App />))
}
async function navigate(path) {
  await act(() => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')) })
}
async function click(label) {
  const button = [...document.querySelectorAll('button,a')].find(element => element.getAttribute('aria-label') === label || element.textContent.trim() === label)
  expect(button, `Missing ${label}`).toBeTruthy()
  await act(async () => button.click())
}

async function findAndOpenList() {
  await click('Find nearby restaurants')
  if (!window.location.pathname.endsWith('/nearby')) await click('See all')
}
const searchCalls = () => fetchMock.mock.calls.filter(([url]) => url === '/api/nearby-restaurants')

async function confirmAteHere() {
  const handle = document.querySelector('.restaurant-ate-handle')
  await act(() => handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
  await act(() => handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
  await act(async () => new Promise(resolve => setTimeout(resolve, 460)))
}

const names = () => [...document.querySelectorAll('.restaurant-name')].map(node => node.textContent)

describe('live nearby restaurant UI with mocked transport', () => {
  it('renders/opens/reopens dish details with zero requests, location prompts or fake businesses', async () => {
    await mount(); await navigate('/recommendations/ramen'); await navigate('/recommendations/lort-cha')
    expect(document.body.textContent).toContain('Find restaurants relevant to Lort Cha near you.')
    expect(document.body.textContent).not.toMatch(/THMOR DA|Golden Monkey|Peephuptmei|Design preview/)
    expect(searchCalls()).toHaveLength(0); expect(locationMock).not.toHaveBeenCalled()
  })
  it('opening the nearby route directly also makes zero requests', async () => {
    await mount('/recommendations/lort-cha/nearby')
    expect(document.body.textContent).toContain('Search when you’re ready.')
    expect(searchCalls()).toHaveLength(0); expect(locationMock).not.toHaveBeenCalled()
    await findAndOpenList()
    expect(searchCalls()).toHaveLength(1)
    expect(locationMock).toHaveBeenCalledTimes(1)
  })
  it('one Find Nearby action sends one server request and displays real response facts without photos/prices', async () => {
    await mount(); await findAndOpenList()
    expect(window.location.pathname).toBe('/recommendations/lort-cha/nearby')
    expect(searchCalls()).toHaveLength(1)
    expect(names()).toHaveLength(4)
    expect(document.body.textContent).toContain('★ 4.6(269 ratings)')
    expect(document.body.textContent).toContain('Open now')
    expect(document.body.textContent).toContain('Test address 1')
    expect(document.querySelector('.restaurant-card-live').textContent).toContain('~')
    expect(document.querySelectorAll('.restaurant-card-live img')).toHaveLength(0)
    expect(document.querySelector('select[aria-label="Price level"]')).toBeNull()
    expect(document.querySelector('[aria-label="Restaurant map preview"]')).toBeNull()
    expect(document.querySelector('.google-maps-attribution').getAttribute('translate')).toBe('no')
  })
  it('shows only three cached preview cards, and See all makes zero additional requests', async () => {
    await mount(); await findAndOpenList(); await click('Go back')
    expect(document.querySelectorAll('.restaurant-preview-live')).toHaveLength(3)
    await click('See all')
    expect(names()).toHaveLength(4)
    expect(searchCalls()).toHaveLength(1)
  })
  it('ordinary rerenders, sorting and filter toggles never make another request', async () => {
    await mount(); await findAndOpenList()
    const select = document.querySelector('[aria-label="Sort restaurants"]')
    await act(() => { select.value = 'rating'; select.dispatchEvent(new Event('change', { bubbles: true })) })
    await click('Open Now'); await click('Open Now')
    await act(() => root.render(<App />))
    expect(searchCalls()).toHaveLength(1)
  })
  it('labels cuisine fallback as a nearby cuisine restaurant, without claiming dish availability', async () => {
    await mount(); await findAndOpenList()
    const card = document.querySelector('[aria-label="Test restaurant 3"]')
    expect(card.textContent).toContain('Cambodian restaurant nearby')
    expect(card.textContent).not.toContain('serves Lort Cha')
    expect(document.body.textContent).toContain("Dish availability isn't confirmed.")
  })
  it('uses Google-returned Maps links and opening them makes no Places request', async () => {
    await mount(); await findAndOpenList()
    const link = document.querySelector('a[aria-label="View Test restaurant 1 on Google Maps"]')
    expect(link.getAttribute('href')).toBe('https://maps.google.com/?cid=1')
    expect(link.target).toBe('_blank'); expect(link.rel).toContain('noopener')
    await act(() => { link.addEventListener('click', event => event.preventDefault()); link.click() })
    expect(searchCalls()).toHaveLength(1)
  })
  it.each([[1, 'Location is needed'], [2, 'Your location is unavailable'], [3, 'Finding your location took too long']])('handles geolocation error %s without a provider call', async (code, expected) => {
    locationMock.mockImplementation((_, reject) => reject({ code }))
    await mount(); await findAndOpenList()
    expect(document.querySelector('[role="alert"]').textContent).toContain(expected)
    expect(searchCalls()).toHaveLength(0)
    await click('Go back')
    expect(document.querySelector('h1').textContent).toContain('Lort Cha')
    expect(document.body.textContent).toContain('Save to favorites')
    expect(locationMock).toHaveBeenCalledTimes(1)
  })
  it('handles an unavailable location API without crashing the dish page', async () => {
    vi.stubGlobal('navigator', {})
    await mount(); await findAndOpenList()
    expect(document.body.textContent).toContain('Your location is unavailable')
    expect(searchCalls()).toHaveLength(0)
  })
  it.each(['QUOTA_LIMIT', 'PROVIDER_CONFIGURATION', 'NOT_CONFIGURED'])('recovers from %s without retries or fake data', async code => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: { code } }) })
    await mount(); await findAndOpenList()
    expect(document.querySelector('[role="alert"]').textContent).toContain(code === 'NOT_CONFIGURED' ? 'not configured locally' : code === 'QUOTA_LIMIT' ? 'busy right now' : 'temporarily unavailable')
    expect(names()).toEqual([]); expect(searchCalls()).toHaveLength(1)
    await click('Go back')
    expect(searchCalls()).toHaveLength(1)
  })
  it('lets the user retry a network failure deliberately', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await mount(); await findAndOpenList()
    expect(document.body.textContent).toContain('Check your connection')
    expect(searchCalls()).toHaveLength(1)
    await click('Try again')
    expect(names()).toHaveLength(4); expect(searchCalls()).toHaveLength(2)
  })
  it('handles missing rating/count/hours and long text without fabricated values or venue imagery', async () => {
    const name = 'Long restaurant name '.repeat(12), address = 'Long street address '.repeat(20)
    fetchMock.mockResolvedValue(ok(data([restaurant(1, { name, address, rating: null, userRatingCount: null, openNow: null })])))
    await mount(); await findAndOpenList()
    const card = document.querySelector('.restaurant-card-live')
    expect(card.textContent).toContain(name); expect(card.textContent).toContain(address)
    expect(card.querySelector('.restaurant-rating')).toBeNull()
    expect(card.textContent).not.toMatch(/Open now|Closed|4\.6/)
    expect(card.querySelector('.restaurant-photo')).toBeNull()
  })
  it('does not treat old cached openNow information as a current opening claim', async () => {
    fetchMock.mockResolvedValue(ok(data([restaurant(1, { observedAt: Date.now() - 10 * 60 * 1000 })])))
    await mount(); await findAndOpenList()
    expect(document.body.textContent).toContain('Hours at last search: open')
    expect(document.body.textContent).not.toContain('Open now')
    await click('Open Now')
    expect(names()).toEqual([])
  })
  it('shows a useful empty state and explicit refresh after the allowed searches find nothing', async () => {
    fetchMock.mockResolvedValue(ok(data([])))
    await mount(); await findAndOpenList()
    expect(document.body.textContent).toContain('No nearby matches found.')
    await click('Refresh nearby search')
    expect(searchCalls()).toHaveLength(2)
  })
  it('restrains duplicate taps, shows loading, and preserves the user-started search across navigation', async () => {
    let complete
    fetchMock.mockImplementation(() => new Promise(resolve => { complete = resolve }))
    await mount(); await findAndOpenList()
    expect(document.body.textContent).toContain('Finding restaurants near you')
    expect(searchCalls()).toHaveLength(1)
    await act(async () => complete(ok(data())))
    await click('See all')
    expect(names()).toHaveLength(4)
  })
  it('discards stale results when a pending search is left for another dish', async () => {
    let complete
    fetchMock.mockImplementation(() => new Promise(resolve => { complete = resolve }))
    await mount(); await findAndOpenList(); await navigate('/recommendations/ramen/nearby')
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1)); complete(ok(data())) })
    expect(document.querySelector('h1').textContent).toContain('Ramen')
    expect(names()).toEqual([])
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
  })
  it('opens live details without another paid request or fake menus/contact fields', async () => {
    await mount(); await findAndOpenList(); await click('View Test restaurant 1 details')
    expect(document.querySelector('h1').textContent).toBe('Test restaurant 1')
    expect(document.body.textContent).toContain('Monday: 10 AM–10 PM')
    expect(document.body.textContent).not.toMatch(/Popular dishes here|The Lort cha is a must try|Phone numbers|\$\$/)
    expect(searchCalls()).toHaveLength(1)
  })
  it('shrinks only the detail heart glyph while preserving its accessible target and toggle', async () => {
    await mount(); await findAndOpenList(); await click('View Test restaurant 1 details')
    const heart = document.querySelector('.flow-header-favorite'), glyph = heart.querySelector('svg')
    expect(heart.className).toContain('size-[44px]')
    expect(glyph.style.width).toBe('27.75px'); expect(glyph.style.height).toBe('27.75px')
    expect(heart.getAttribute('aria-pressed')).toBe('false')
    expect(glyph.querySelector('path').getAttribute('fill')).toBe('none')
    await act(() => heart.click())
    expect(heart.getAttribute('aria-pressed')).toBe('true')
    expect(glyph.querySelector('path').getAttribute('fill')).toBe('var(--color-favorite)')
    expect(document.querySelector('.flow-more')).toBeTruthy()
    expect(searchCalls()).toHaveLength(1)
  })
  it('retains real Place IDs in favorites across a refresh without persisting names or adding requests', async () => {
    await mount(); await findAndOpenList(); await click('Save Test restaurant 1 to favorites')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites)).data.restaurantIds).toEqual(['google:test-place-1'])
    await navigate('/favorites'); await click('Restaurants')
    expect(document.querySelector('.restaurant-name').textContent).toBe('Test restaurant 1')
    expect(searchCalls()).toHaveLength(1)
    await act(() => root.unmount()); restaurantSearchState.reset(); nearbyRestaurantService.clear()
    root = createRoot(document.getElementById('root')); await act(() => root.render(<App />)); await click('Restaurants')
    expect(document.body.textContent).not.toContain('Test restaurant 1')
    expect(document.body.textContent).toContain('Restaurant from your saved search')
    expect(searchCalls()).toHaveLength(1)
    await click('Remove Restaurant from your saved search from favorites')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites)).data.restaurantIds).toEqual([])
  })
  it('restores permitted cached places after reload with no automatic request; fresh details require refresh', async () => {
    await mount(); await findAndOpenList()
    await act(() => root.unmount()); restaurantSearchState.reset(); nearbyRestaurantService.clear()
    root = createRoot(document.getElementById('root')); await act(() => root.render(<App />))
    expect(document.body.textContent).toContain('Your saved search is ready')
    expect(document.querySelectorAll('.restaurant-card-live')).toHaveLength(0)
    expect(document.body.textContent).not.toContain('Restaurant from your saved search')
    expect(searchCalls()).toHaveLength(1)
    await click('Refresh nearby search')
    expect(searchCalls()).toHaveLength(2)
    expect(document.querySelector('.restaurant-name').textContent).toBe('Test restaurant 1')
  })
  it('retains the selected live Place ID through meal feedback, local history and reload', async () => {
    await mount(); await findAndOpenList(); await click('View Test restaurant 1 details'); await confirmAteHere()
    expect(document.querySelector('.verify-map')).toBeNull()
    expect(document.body.textContent).not.toContain('You are near Test restaurant 1')
    await click('Couldn’t verify automatically?'); await click('Log without verificationSave to history without adding progress'); await click('Save without verification')
    expect(document.querySelector('img[alt="Lort Cha — Nom dish image"]')).toBeTruthy()
    await click('Loved it!'); await click('Continue')
    expect(document.body.textContent).toContain('Experience Logged!')
    const serialized = JSON.parse(localStorage.getItem(STORAGE_KEYS.experience)).data
    expect(serialized.logs[0].restaurantId).toBe('google:test-place-1')
    expect(serialized.logs[0].verification.verified).toBe(false)
    expect(JSON.stringify(serialized)).not.toContain('Test restaurant 1')
    await act(() => root.unmount()); restaurantSearchState.reset(); nearbyRestaurantService.clear()
    root = createRoot(document.getElementById('root')); await act(() => root.render(<App />))
    expect(document.body.textContent).toContain('Experience Logged!')
    expect(searchCalls()).toHaveLength(1)
  })
  it('preserves legacy saved examples with an explicit label and no fabricated live facts', async () => {
    writeLocalState(STORAGE_KEYS.favorites, { dishIds: [], restaurantIds: ['preview-thmor-da'] })
    await mount('/favorites'); await click('Restaurants')
    expect(document.body.textContent).toContain('Saved preview; not a live restaurant result')
    expect(document.querySelector('.restaurant-rating')).toBeNull()
    expect(document.body.textContent).not.toContain('1.2 mi')
    expect(searchCalls()).toHaveLength(0)
  })
  it('keeps a logged Place ID usable after the 24-hour restaurant metadata expires', async () => {
    await mount(); await findAndOpenList(); await click('View Test restaurant 1 details'); await confirmAteHere()
    await click('Couldn’t verify automatically?'); await click('Log without verificationSave to history without adding progress'); await click('Save without verification')
    await click('Loved it!'); await click('Continue')
    const metadataKey = 'nom.nearby.place-metadata.v1'
    const metadata = JSON.parse(localStorage.getItem(metadataKey))
    metadata.searches.forEach(row => { row.createdAt -= 25 * 60 * 60 * 1000 })
    localStorage.setItem(metadataKey, JSON.stringify(metadata))
    await act(() => root.unmount()); restaurantSearchState.reset(); nearbyRestaurantService.clear()
    root = createRoot(document.getElementById('root')); await act(() => root.render(<App />))
    expect(document.body.textContent).toContain('Experience Logged!')
    expect(document.body.textContent).toContain('Saved restaurant')
    expect(document.body.textContent).not.toContain('Test restaurant 1')
    expect(searchCalls()).toHaveLength(1)
    await navigate('/recommendations/lort-cha/nearby/google%3Atest-place-1')
    expect(document.querySelector('h1').textContent).toBe('Saved restaurant')
    expect(document.querySelector('.restaurant-actions-live a').href).toContain('destination_place_id=test-place-1')
    expect(document.body.textContent).toContain('Refresh nearby search')
    expect(searchCalls()).toHaveLength(1)
  })
})
