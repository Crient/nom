// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { nearbyRestaurantService } from '../data/nearbyRestaurantService'
import { restaurantSearchState } from '../data/restaurantSearchState'
import { placeDetailsService, placePhotoService } from '../data/placeExtrasService'
import { restaurantMapSessions } from '../data/restaurantMapSessions'
import { surpriseSession } from '../utils/surpriseSession'

let root, transport, observers, places
function place(i) {
  return { id: `google:place-${i}`, placeId: `place-${i}`, dishId: 'lort-cha', source: 'google-places',
    name: `Venue ${i}`, address: `Address ${i}`, latitude: 40 + i / 1000, longitude: -75,
    googleMapsUri: `https://maps.google.com/?cid=${i}`, rating: 4.7, userRatingCount: 123, openNow: i !== 9,
    observedAt: Date.now(), openingHours: [], matchType: i < 3 ? 'exact-dish-search' : 'cuisine-fallback', cuisine: 'Cambodian', attributions: [],
    photo: { name: `places/place-${i}/photos/photo-${i}`, observedAt: Date.now(), googleMapsUri: `https://www.google.com/maps/photos/?id=${i}`,
      authorAttributions: [{ displayName: `Photographer ${i}`, uri: 'https://maps.google.com/maps/contrib/123' }] } }
}
const calls = url => transport.mock.calls.filter(([path]) => path === url)
async function click(text) {
  const button = [...document.querySelectorAll('button,a')].find(element => element.getAttribute('aria-label') === text || element.textContent.trim() === text)
  expect(button, `Missing ${text}`).toBeTruthy(); await act(async () => button.click())
}
async function mount(path = '/recommendations/lort-cha') {
  await act(() => { window.history.replaceState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); root.render(<App />) })
}
async function expose(selector, count = 1) {
  await act(async () => {
    observers.filter(observer => !observer.disconnected && observer.target?.closest(selector)).slice(0, count).forEach(observer => observer.callback([{ isIntersecting: true }]))
  })
}
beforeEach(() => {
  restaurantSearchState.reset(); nearbyRestaurantService.clear(); placePhotoService.clear(); placeDetailsService.clear(); restaurantMapSessions.clear(); surpriseSession.reset()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: resolve => resolve({ coords: { latitude: 40, longitude: -75 } }) } })
  observers = []
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback) { this.callback = callback; observers.push(this) }
    observe(target) { this.target = target } disconnect() { this.disconnected = true }
  })
  places = Array.from({ length: 10 }, (_, i) => place(i))
  transport = vi.fn(async (url, request) => {
    const body = JSON.parse(request.body)
    const result = url === '/api/nearby-restaurants' ? { source: 'google-places', restaurants: places, apiCalls: 2, searchedAt: Date.now() }
      : url === '/api/place-photo' ? { photoUri: `https://lh3.googleusercontent.com/${body.name.split('/').at(-1)}`, photoMediaCalls: 1 }
      : url === '/api/place-details' ? { placeId: body.placeId, placeDetailsCalls: 1, attributions: [], reviews: [
        { text: '  Original review wording.\nSecond line.  ', author: { displayName: 'Reviewer', uri: 'https://maps.google.com/maps/contrib/123' },
          rating: 5, relativeTime: 'a week ago', googleMapsUri: 'https://www.google.com/maps/reviews/?id=review', visitDate: { year: 2026, month: 9 } },
      ] } : null
    if (!result) throw new Error('Unexpected external request')
    return { ok: true, json: async () => result }
  })
  vi.stubGlobal('fetch', transport)
  writeLocalState(STORAGE_KEYS.discovery, { foodType: 'noodle', flavors: ['spicy', 'comforting'], adventurousness: 'adventurous', region: 'southeast-asia' })
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => {
  await act(() => root.unmount()); restaurantSearchState.reset(); nearbyRestaurantService.clear(); placePhotoService.clear(); placeDetailsService.clear(); restaurantMapSessions.clear()
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); surpriseSession.reset()
})

describe('Phase 2 shared preview/list/map/photo/review flow', () => {
  it.each([false, true])('preserves photo metadata through cold detail / Surprise right swipe (%s), See All, back and cached revisit', async surprise => {
    const original = transport.getMockImplementation()
    transport.mockImplementation(async (url, request) => {
      if (url === '/api/nearby-restaurants') {
        const { dishId } = JSON.parse(request.body)
        places = places.map(venue => ({ ...venue, dishId }))
      }
      return original(url, request)
    })
    navigator.permissions = { query: vi.fn().mockResolvedValue({ state: 'granted' }) }
    if (surprise) {
      // Advance the gesture timer without making fetched timestamps future-dated
      // against the services' module-level real clock.
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await mount('/recommendations/surprise')
      expect(transport).not.toHaveBeenCalled()
      const card = document.querySelector('.surprise-dish-card')
      vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ width: 300 })
      await act(() => card.dispatchEvent(new PointerEvent('pointerdown', { clientX: 20, clientY: 20, pointerId: 1, button: 0, isPrimary: true, bubbles: true })))
      await act(() => card.dispatchEvent(new PointerEvent('pointerup', { clientX: 260, clientY: 20, pointerId: 1, button: 0, isPrimary: true, bubbles: true })))
      await act(() => vi.advanceTimersByTimeAsync(240))
    } else await mount()
    const path = window.location.pathname
    expect(path).toMatch(/^\/recommendations\/[a-z-]+$/)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
    await expose('.restaurant-preview-live', 3)
    const resources = calls('/api/place-photo').map(([, request]) => JSON.parse(request.body).name)
    expect(resources).toHaveLength(3)
    expect(document.querySelectorAll('.restaurant-preview-live .place-photo > img')).toHaveLength(3)
    const facts = [...document.querySelectorAll('.restaurant-preview-live')].map(card => card.textContent)
    await click('See all'); await expose('.restaurant-card-live', 3)
    expect(calls('/api/place-photo')).toHaveLength(3)
    expect(document.querySelectorAll('.restaurant-card-live .place-photo > img')).toHaveLength(3)
    await click('Go back')
    expect([...document.querySelectorAll('.restaurant-preview-live')].map(card => card.textContent)).toEqual(facts)
    await mount('/home'); await mount(path); await expose('.restaurant-preview-live', 3)
    expect(calls('/api/place-photo')).toHaveLength(3)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
    expect(calls('/api/place-photo').every(([, request]) => !request.signal.aborted)).toBe(true)
  })
  it('keeps all restaurant facts independent of Google quota errors across preview, See All and back', async () => {
    const original = transport.getMockImplementation()
    transport.mockImplementation(async (url, request) => url === '/api/place-photo'
      ? { ok: false, status: 429, json: async () => ({ error: { code: 'QUOTA_LIMIT', source: 'google', upstreamStatus: 429, retryAfterMs: 60_000 }, photoMediaCalls: 1 }) }
      : original(url, request))
    await mount(); await click('Find nearby restaurants'); await expose('.restaurant-preview-live', 3)
    expect(document.querySelectorAll('.restaurant-preview-title')).toHaveLength(3)
    expect(document.querySelectorAll('.place-photo[data-media-state="error"]')).toHaveLength(3)
    expect(document.body.textContent).not.toContain('Retry photo')
    await click('See all'); await expose('.restaurant-card-live', 3)
    expect(document.querySelectorAll('.restaurant-card-live')).toHaveLength(10)
    expect(calls('/api/place-photo')).toHaveLength(3)
    await act(() => document.querySelector('.place-photo-retry').click())
    expect(window.location.pathname).toBe('/recommendations/lort-cha/nearby')
    expect(calls('/api/place-photo')).toHaveLength(3)
    await click('Go back'); await expose('.restaurant-preview-live', 3)
    expect(calls('/api/place-photo')).toHaveLength(3)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('keeps a richer deduped venue saved across preview/detail/favorites and removes every saved alias', async () => {
    writeLocalState(STORAGE_KEYS.favorites, { dishIds: [], restaurantIds: ['google:place-0', 'google:place-1'] })
    places[0].photo = null
    places[1] = { ...places[1], name: places[0].name, address: places[0].address }
    await mount(); await click('Find nearby restaurants')
    const previewHeart = document.querySelector('[aria-label="Remove Venue 0 from favorites"]')
    expect(previewHeart.getAttribute('aria-pressed')).toBe('true')
    expect(previewHeart.querySelector('path').getAttribute('fill')).toBe('var(--color-favorite)')
    await mount('/recommendations/lort-cha/nearby/google%3Aplace-0')
    expect(document.querySelector('h1').textContent).toBe('Venue 0')
    expect(document.querySelector('[aria-label="Remove Venue 0 from favorites"]').getAttribute('aria-pressed')).toBe('true')
    await mount('/favorites'); await click('Restaurants')
    expect(document.querySelectorAll('.hub-restaurants .restaurant-card-live')).toHaveLength(1)
    await click('Remove Venue 0 from favorites')
    expect(document.querySelectorAll('.hub-restaurants .restaurant-card-live')).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites)).data.restaurantIds).toEqual([])
    expect(localStorage.getItem('nom.nearby.place-metadata.v1')).not.toMatch(/aliasIds|Venue 0|Address 0/)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('marks the winning preview saved when only its discarded alias was saved and removes that alias', async () => {
    writeLocalState(STORAGE_KEYS.favorites, { dishIds: [], restaurantIds: ['google:place-0'] })
    places[0].photo = null
    places[1] = { ...places[1], name: places[0].name, address: places[0].address }
    await mount(); await click('Find nearby restaurants')
    expect(document.querySelector('[aria-label="Remove Venue 0 from favorites"]')).toBeTruthy()
    await click('Remove Venue 0 from favorites')
    expect(document.querySelector('[aria-label="Save Venue 0 to favorites"]')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites)).data.restaurantIds).toEqual([])
    await click('Save Venue 0 to favorites')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites)).data.restaurantIds).toEqual(['google:place-1'])
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('keeps the relocated list distance in detail and applies farther-away call-ahead advice', async () => {
    await mount(); await click('Find nearby restaurants')
    navigator.geolocation.getCurrentPosition = resolve => resolve({ coords: { latitude: 41.5, longitude: -75 } })
    await click('See all')
    const distance = restaurantSearchState.getSnapshot('lort-cha').restaurants.find(venue => venue.id === 'google:place-0').approximateDistanceMiles
    expect(distance).toBeGreaterThan(100)
    await click('View Venue 0 details')
    expect(document.querySelector('.restaurant-details-meta').textContent).toContain(`~${distance.toFixed(1)} mi`)
    expect(document.querySelector('.restaurant-call-ahead').textContent).toContain(`~${Math.round(distance)} miles away`)
    expect(document.querySelector('.restaurant-distance-band').textContent).toBe('Extended area')
    expect(document.body.textContent).toContain('previous search area')
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('revalidates directly reopened cached detail and hides its obsolete distance after a distant move', async () => {
    await mount(); await click('Find nearby restaurants')
    navigator.geolocation.getCurrentPosition = resolve => resolve({ coords: { latitude: 34.05, longitude: -118.24 } })
    await mount('/recommendations/lort-cha/nearby/google%3Aplace-0')
    expect(document.querySelector('.restaurant-details-meta').textContent).not.toContain(' mi')
    expect(document.body.textContent).toContain('previous search area')
    expect(restaurantSearchState.getSnapshot('lort-cha').restaurants).toHaveLength(0)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('shows three matching skeletons immediately and releases text before photos', async () => {
    let resolveSearch
    const original = transport.getMockImplementation()
    transport.mockImplementation((url, request) => url === '/api/nearby-restaurants'
      ? new Promise(resolve => { resolveSearch = () => original(url, request).then(resolve) }) : original(url, request))
    navigator.permissions = { query: vi.fn().mockResolvedValue({ state: 'granted' }) }
    await mount()
    expect(document.querySelectorAll('.restaurant-skeleton-grid .restaurant-skeleton')).toHaveLength(3)
    await act(() => resolveSearch())
    expect(document.querySelectorAll('.restaurant-skeleton')).toHaveLength(0)
    expect(document.querySelector('.restaurant-preview-title').textContent).toBe('Venue 0')
    expect(calls('/api/place-photo')).toHaveLength(0)
    await click('See all')
    expect([...document.querySelectorAll('.restaurant-list-number')].map(node => node.textContent)).toEqual(Array.from({ length: 10 }, (_, index) => String(index + 1)))
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('keeps a preview favorite independent from card navigation', async () => {
    await mount(); await click('Find nearby restaurants')
    const heart = document.querySelector('[aria-label="Save Venue 0 to favorites"]')
    expect(heart.closest('.restaurant-favorite-row').querySelector('h3').textContent).toBe('Venue 0')
    expect(heart.closest('.place-photo')).toBeNull()
    expect(heart.querySelector('svg').style.width).toBe('18px')
    expect(heart.querySelector('path').getAttribute('fill')).toBe('none')
    await click('Save Venue 0 to favorites')
    expect(heart.querySelector('path').getAttribute('fill')).toBe('var(--color-favorite)')
    expect(window.location.pathname).toBe('/recommendations/lort-cha')
    expect(document.querySelector('[aria-label="Remove Venue 0 from favorites"]')).toBeTruthy()
    expect(calls('/api/place-details')).toHaveLength(0)
    await click('See all')
    const listHeart = document.querySelector('[aria-label="Remove Venue 0 from favorites"]')
    expect(listHeart.closest('.restaurant-favorite-row').querySelector('h3').textContent).toBe('Venue 0')
    expect(listHeart.closest('.place-photo')).toBeNull()
    expect(listHeart.querySelector('svg').style.width).toBe('18px')
    expect(document.querySelectorAll('.place-photo figcaption')).toHaveLength(0)
  })
  it('loads a directly opened Nearby route after an existing location grant', async () => {
    navigator.permissions = { query: vi.fn().mockResolvedValue({ state: 'granted' }) }
    await mount('/recommendations/lort-cha/nearby')
    expect(document.querySelectorAll('.restaurant-card-live')).toHaveLength(10)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
    await click('Open Now')
    const sort = document.querySelector('[aria-label="Sort restaurants"]')
    await act(() => { sort.value = 'rating-ascending'; sort.dispatchEvent(new Event('change', { bubbles: true })) })
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('uses canonical Singaporean cuisine even when venue metadata says American', async () => {
    places = places.map(venue => ({ ...venue, dishId: 'hainanese-chicken-rice', cuisine: 'American' }))
    await mount('/recommendations/hainanese-chicken-rice'); await click('Find nearby restaurants'); await click('View Venue 0 details')
    const ideas = document.querySelector('.restaurant-dish-ideas')
    expect(ideas.textContent).toContain('Singaporean catalog')
    expect(ideas.textContent).not.toContain('American')
    expect(ideas.textContent).not.toContain('Macaroni')
    const share = vi.fn(), writeText = vi.fn()
    navigator.share = share; navigator.clipboard = { writeText }
    await click('Send to a friend')
    expect(document.body.textContent).toContain('Friends on Nom are coming soon.')
    expect(share).not.toHaveBeenCalled(); expect(writeText).not.toHaveBeenCalled()
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('discloses a partial cuisine fallback in the dish preview without retrying', async () => {
    const original = transport.getMockImplementation()
    transport.mockImplementation(async (url, request) => {
      const response = await original(url, request)
      if (url !== '/api/nearby-restaurants') return response
      const data = await response.json()
      return { ok: true, json: async () => ({ ...data, partialError: 'TIMEOUT' }) }
    })
    await mount(); await click('Find nearby restaurants')
    expect(document.querySelector('.restaurant-partial-notice').textContent).toContain('temporarily unavailable')
    await act(() => root.render(<App />)); expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('automatically loads only the opened dish after permission is granted and reuses it on render/back', async () => {
    const query = vi.fn().mockResolvedValue({ state: 'granted' })
    navigator.permissions = { query }
    await mount('/recommendations'); expect(transport).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled()
    await mount(); expect(document.querySelectorAll('.restaurant-preview-live')).toHaveLength(3)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1); expect(calls('/api/place-details')).toHaveLength(0)
    await act(() => root.render(<App />)); await click('See all'); await click('Go back')
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
    expect(document.body.textContent).toContain('Refresh nearby restaurants')
  })
  it('restores valid cached IDs with zero new calls when granted and leaves refresh deliberate', async () => {
    navigator.permissions = { query: vi.fn().mockResolvedValue({ state: 'granted' }) }
    await mount(); expect(calls('/api/nearby-restaurants')).toHaveLength(1)
    await act(() => root.unmount()); restaurantSearchState.reset(); nearbyRestaurantService.clear()
    root = createRoot(document.getElementById('root')); await act(() => root.render(<App />))
    expect(document.querySelector('.restaurant-preview-title')).toBeNull()
    expect(document.body.textContent).toContain('Your saved search is ready')
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
    await click('See all')
    expect(document.querySelectorAll('.restaurant-card')).toHaveLength(0)
    expect(document.querySelector('[aria-label="Restaurant view"] button:last-child').disabled).toBe(true)
    await click('Go back')
    await click('Refresh nearby restaurants'); expect(calls('/api/nearby-restaurants')).toHaveLength(2)
  })
  it('shows denied permission without a transport and never auto-retries a quota error', async () => {
    navigator.permissions = { query: vi.fn().mockResolvedValue({ state: 'denied' }) }
    await mount(); expect(document.body.textContent).toContain('Location is needed'); expect(transport).not.toHaveBeenCalled()
    restaurantSearchState.reset()
    navigator.permissions.query.mockResolvedValue({ state: 'granted' })
    transport.mockResolvedValue({ ok: false, json: async () => ({ error: { code: 'QUOTA_LIMIT' } }) })
    await mount('/recommendations/num-banh-chok')
    await act(() => root.render(<App />)); expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('makes preview blank areas and list cards clickable while hearts and source credits stay independent', async () => {
    await mount(); await click('Find nearby restaurants'); await expose('.restaurant-preview-live')
    expect(document.querySelector('.restaurant-preview-live').textContent).not.toContain('Photo on Google Maps')
    expect(document.querySelector('.restaurant-preview-live figcaption')).toBeNull()
    await click('View larger photo and credits for Venue 0')
    const source = document.querySelector('.place-photo-viewer .place-photo-source')
    source.addEventListener('click', event => event.preventDefault())
    await act(() => source.click()); expect(window.location.pathname).toBe('/recommendations/lort-cha')
    expect(document.querySelector('.place-photo-viewer-credits').textContent).toContain('Photographer 0')
    await click('Close photo')
    await act(() => document.querySelector('.restaurant-preview-live').click())
    expect(window.location.pathname).toContain('/nearby/google%3Aplace-0'); expect(calls('/api/place-details')).toHaveLength(1)
    await click('Go back')
    await click('Save Venue 1 to favorites'); expect(window.location.pathname).toBe('/recommendations/lort-cha/nearby')
    expect(calls('/api/place-details')).toHaveLength(1)
    await act(() => document.querySelector('[aria-label="Venue 1"]').click())
    expect(window.location.pathname).toContain('/nearby/google%3Aplace-1'); expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('renders returned detail actions, truthful About/dish ideas and the original circular Nom hierarchy', async () => {
    const original = transport.getMockImplementation()
    transport.mockImplementation(async (url, request) => {
      const response = await original(url, request)
      if (url !== '/api/place-details') return response
      const data = await response.json()
      return { ok: true, json: async () => ({ ...data, details: { directionsUri: 'https://www.google.com/maps/dir/?destination_place_id=place-0', nationalPhoneNumber: '(617) 555-1234', websiteUri: 'https://venue.example/', priceLevel: 'PRICE_LEVEL_MODERATE', primaryTypeDisplayName: 'Restaurant', editorialSummary: 'Original Google editorial text.' } }) }
    })
    await mount(); await click('Find nearby restaurants'); await click('View Venue 0 details')
    const actions = [...document.querySelectorAll('.restaurant-actions-live a,.restaurant-actions-live button')]
    expect(actions).toHaveLength(5)
    expect(actions[0].href).toBe('https://www.google.com/maps/dir/?destination_place_id=place-0')
    expect(actions[1].href).toBe('tel:6175551234'); expect(actions[2].href).toBe('https://venue.example/')
    expect(document.querySelector('.restaurant-call-ahead-action').href).toBe('tel:6175551234')
    expect(document.querySelector('.restaurant-call-ahead').textContent).toContain("Dish availability isn't confirmed.")
    expect(document.body.textContent).toContain('Original Google editorial text.')
    expect(document.querySelector('.restaurant-details-meta').textContent).toContain('$$')
    expect([...document.querySelectorAll('.restaurant-live-copy h2')].map(node => node.textContent)).toEqual(['Looking for Lort Cha?', 'Location', 'About', 'More dishes from this cuisine', 'Google reviews'])
    expect(document.body.textContent).not.toContain('Popular dishes here')
    expect(document.querySelector('.restaurant-ate-handle img').getAttribute('src')).toContain('ate-here.webp')
    navigator.clipboard = { writeText: vi.fn().mockResolvedValue() }
    await click('Share'); expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href)
    expect(calls('/api/place-details')).toHaveLength(1); expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('disables absent contact actions, offers manual share and safely loads the selected location preview', async () => {
    await mount(); await click('Find nearby restaurants'); await click('View Venue 0 details')
    expect(document.querySelector('[aria-label="Call unavailable"]').disabled).toBe(true)
    expect(document.querySelector('[aria-label="Website unavailable"]').disabled).toBe(true)
    await click('Send to a friend'); expect(document.body.textContent).toContain('Friends on Nom are coming soon.'); expect(document.querySelector('.restaurant-share-fallback')).toBeNull()
    await click('Share'); expect(document.querySelector('.restaurant-share-fallback input').value).toBe(window.location.href)
    await click('Show location map'); expect(document.body.textContent).toContain('Map is not configured locally.')
    expect(document.querySelector('script[data-nom-google-maps]')).toBeNull()
    expect(calls('/api/nearby-restaurants')).toHaveLength(1); expect(calls('/api/place-details')).toHaveLength(1)
  })
  it('bounds long reviews visually while preserving every character behind Read more', async () => {
    const original = transport.getMockImplementation(), text = 'Original wording. '.repeat(40) + '\nLast line.'
    transport.mockImplementation(async (url, request) => {
      const response = await original(url, request)
      if (url !== '/api/place-details') return response
      const data = await response.json(); data.reviews[0].text = text
      return { ok: true, json: async () => data }
    })
    await mount(); await click('Find nearby restaurants'); await click('View Venue 0 details')
    expect(document.querySelector('.place-review-text').textContent).toBe(text)
    expect(document.querySelector('.place-review-text').classList.contains('place-review-collapsed')).toBe(true)
    await click('Read more'); expect(document.querySelector('.place-review-expand').getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('.place-review-text').classList.contains('place-review-collapsed')).toBe(false)
    await click('Show less'); expect(document.querySelector('.place-review-text').textContent).toBe(text)
    expect(calls('/api/place-details')).toHaveLength(1)
  })
  it('updates the dish preview immediately, opens all ten without a search, and preserves identical facts on return', async () => {
    await mount(); expect(transport).not.toHaveBeenCalled()
    await click('Find nearby restaurants')
    expect(window.location.pathname).toBe('/recommendations/lort-cha')
    const preview = [...document.querySelectorAll('.restaurant-preview-live')]
    expect(preview).toHaveLength(3); expect(preview[0].textContent).toContain('Venue 0')
    expect(preview[0].textContent).not.toContain('Address 0')
    const facts = preview.map(node => node.textContent)
    expect(restaurantSearchState.getSnapshot('lort-cha').restaurants).toHaveLength(10)
    await click('See all'); expect(document.querySelectorAll('.restaurant-card-live')).toHaveLength(10)
    expect(document.body.textContent).toContain('Found 10 places near you.')
    await click('Go back')
    expect([...document.querySelectorAll('.restaurant-preview-live')].map(node => node.textContent)).toEqual(facts)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1); expect(calls('/api/place-details')).toHaveLength(0)
  })
  it('See all before searching is navigation-only and keeps its destination intentional', async () => {
    await mount(); await click('See all')
    expect(window.location.pathname).toBe('/recommendations/lort-cha/nearby')
    expect(document.body.textContent).toContain('Search when you’re ready.'); expect(transport).not.toHaveBeenCalled()
  })
  it('requests at most three preview photos when visible, with linked attribution and no persistence', async () => {
    await mount(); await click('Find nearby restaurants')
    expect(calls('/api/place-photo')).toHaveLength(0)
    await expose('.restaurant-preview-live', 3)
    expect(calls('/api/place-photo')).toHaveLength(3)
    expect(document.querySelectorAll('.restaurant-preview-live img')).toHaveLength(3)
    expect(document.querySelector('.place-photo figcaption')).toBeNull()
    await click('View larger photo and credits for Venue 0')
    expect(document.querySelector('.place-photo-viewer-credits').textContent).toContain('Photographer 0')
    expect(document.querySelector('.place-photo-source').href).toContain('/maps/photos/')
    await click('Close photo')
    expect(localStorage.getItem('nom.nearby.place-metadata.v1')).not.toMatch(/photos|Photographer|photoUri/)
  })
  it('loads only a visible list photo and reuses it in details, without fetching offscreen photos', async () => {
    await mount(); await click('Find nearby restaurants'); await click('See all')
    expect(calls('/api/place-photo')).toHaveLength(0)
    await expose('.restaurant-card-live')
    expect(calls('/api/place-photo')).toHaveLength(1)
    await click('View Venue 0 details')
    expect(calls('/api/place-photo')).toHaveLength(1); expect(calls('/api/place-details')).toHaveLength(1)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('keeps missing, invalid, API-failed and broken photos as neutral fallbacks', async () => {
    places[0].photo = null; places[1].photo.authorAttributions[0].uri = 'javascript:alert(1)'
    const original = transport.getMockImplementation()
    transport.mockImplementation(async (url, request) => url === '/api/place-photo' ? { ok: false, json: async () => ({ error: { code: 'QUOTA_LIMIT' } }) } : original(url, request))
    await mount(); await click('Find nearby restaurants'); await expose('.restaurant-preview-live', 3)
    expect(document.querySelectorAll('.place-photo-fallback')).toHaveLength(3)
    expect(calls('/api/place-photo')).toHaveLength(1)
    expect(document.querySelectorAll('.restaurant-preview-title')).toHaveLength(3)
  })
  it('falls back if a retrieved image fails to load, without another Media call', async () => {
    await mount(); await click('Find nearby restaurants'); await expose('.restaurant-preview-live')
    const image = document.querySelector('.restaurant-preview-live img')
    expect(image).toBeTruthy()
    await act(() => image.dispatchEvent(new Event('error')))
    expect(document.querySelectorAll('.restaurant-preview-live img')).toHaveLength(0)
    expect(calls('/api/place-photo')).toHaveLength(1)
  })
  it('shows empty reviews gracefully and does not auto-load reviews when a details route is opened directly', async () => {
    const original = transport.getMockImplementation()
    transport.mockImplementation(async (url, request) => url === '/api/place-details' ? { ok: true, json: async () => ({ placeId: 'place-0', reviews: [], attributions: [], placeDetailsCalls: 1 }) } : original(url, request))
    await mount(); await click('Find nearby restaurants')
    await act(() => { window.history.pushState({}, '', '/recommendations/lort-cha/nearby/google%3Aplace-0'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(calls('/api/place-details')).toHaveLength(0)
    await click('Load Google reviews')
    expect(document.body.textContent).toContain('No reviews available.')
    expect(calls('/api/place-details')).toHaveLength(1)
  })
  it('loads reviews only for explicit selection, shows original text/credits, and reuses them on reopen', async () => {
    await mount(); await click('Find nearby restaurants'); await click('See all')
    expect(calls('/api/place-details')).toHaveLength(0)
    await click('View Venue 0 details')
    expect(calls('/api/place-details')).toHaveLength(1)
    expect(document.querySelector('.place-review-text').textContent).toBe('  Original review wording.\nSecond line.  ')
    expect(document.body.textContent).toContain('Visited September 2026')
    expect(document.querySelector('.place-review a:last-child').href).toContain('/maps/reviews/')
    await click('Go back'); await click('View Venue 0 details')
    expect(calls('/api/place-details')).toHaveLength(1)
    expect(localStorage.getItem('nom.nearby.place-metadata.v1')).not.toContain('Original review wording')
  })
  it('keeps restaurant facts and Maps usable when reviews fail, without retry loops', async () => {
    const original = transport.getMockImplementation()
    transport.mockImplementation(async (url, request) => url === '/api/place-details' ? { ok: false, json: async () => ({ error: { code: 'QUOTA_LIMIT' } }) } : original(url, request))
    await mount(); await click('Find nearby restaurants'); await click('View Venue 0 details')
    expect(document.querySelector('h1').textContent).toBe('Venue 0')
    expect(document.body.textContent).toContain('Reviews unavailable right now.')
    expect(document.querySelector('.restaurant-actions-live a').textContent).toContain('Directions'); expect(calls('/api/place-details')).toHaveLength(1)
  })
  it('loads a map only on explicit Map selection, preserves its result set, and navigates through details/back', async () => {
    const attach = vi.spyOn(restaurantMapSessions, 'attach').mockImplementation(async ({ host }) => { host.append(document.createElement('div')); return {} })
    const update = vi.spyOn(restaurantMapSessions, 'update').mockImplementation(() => {})
    await mount(); await click('Find nearby restaurants'); await click('See all')
    expect(attach).not.toHaveBeenCalled()
    await click('Map'); expect(attach).toHaveBeenCalledTimes(1)
    expect(attach.mock.calls[0][0].restaurants.map(place => place.placeId)).toEqual(places.map(place => place.placeId))
    expect(calls('/api/place-photo')).toHaveLength(1); expect(calls('/api/place-details')).toHaveLength(0)
    await click('Open Now'); expect(update.mock.calls.at(-1)[1].restaurants).toHaveLength(9)
    await click('List'); await click('Map'); expect(attach).toHaveBeenCalledTimes(1)
    await act(() => attach.mock.calls[0][0].onSelect('google:place-2'))
    const summary = document.querySelector('.nearby-live-map-results .restaurant-card-live')
    expect(summary.textContent).toContain('Venue 2'); expect(summary.querySelector('.place-photo img').src).toContain('/photo-2')
    expect(summary.querySelector('figcaption')).toBeNull()
    await act(() => summary.querySelector('.place-photo-expand').click())
    expect(document.querySelector('.place-photo-viewer .place-photo-source').href).toContain('id=2')
    await click('Close photo')
    const photoCalls = calls('/api/place-photo').length
    await act(() => summary.querySelector('.restaurant-name').click())
    expect(calls('/api/place-details')).toHaveLength(1); expect(calls('/api/place-photo')).toHaveLength(photoCalls)
    await click('Go back'); expect(document.querySelector('button[aria-pressed=true]').textContent).toContain('Map')
    await click('Go back'); expect(document.querySelectorAll('.restaurant-preview-live')).toHaveLength(3)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('keeps List usable and presents safe Map configuration state when the browser key is missing', async () => {
    await mount(); await click('Find nearby restaurants'); await click('See all'); await click('Map')
    expect(document.body.textContent).toContain('Map is not configured locally.')
    expect(document.querySelector('script[data-nom-google-maps]')).toBeNull()
    await click('List'); expect(document.querySelector('.nearby-results').hidden).toBe(false)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
  })
  it('loads only the selected-place map near the viewport and uses its stable reuse key on reopen', async () => {
    const attach = vi.spyOn(restaurantMapSessions, 'attach').mockImplementation(async ({ host }) => { host.append(document.createElement('div')); return {} })
    vi.spyOn(restaurantMapSessions, 'update').mockImplementation(() => {})
    await mount(); await click('Find nearby restaurants'); await click('View Venue 0 details')
    expect(attach).not.toHaveBeenCalled()
    await expose('.restaurant-location-preview')
    expect(attach).toHaveBeenCalledTimes(1)
    expect(attach.mock.calls[0][0].key).toBe('restaurant:place-0')
    expect(attach.mock.calls[0][0].restaurants.map(venue => venue.placeId)).toEqual(['place-0'])
    expect(document.querySelector('.restaurant-location-preview').textContent).not.toContain('Zoom out')
    await click('Go back'); await click('View Venue 0 details'); await expose('.restaurant-location-preview')
    expect(attach).toHaveBeenCalledTimes(2)
    expect(attach.mock.calls[1][0].key).toBe(attach.mock.calls[0][0].key)
    expect(calls('/api/nearby-restaurants')).toHaveLength(1)
    expect(calls('/api/place-details')).toHaveLength(1)
  })
})
