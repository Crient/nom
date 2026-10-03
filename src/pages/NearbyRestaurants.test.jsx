// @vitest-environment happy-dom
import { actAndLoadRoutes as act } from '../test/routeAct'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import * as provider from '../data/restaurantProvider'
import { mockRestaurants } from '../data/mockRestaurants'
import placeholder from '../assets/food/dish-placeholder.svg'

let root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  window.history.replaceState({}, '', '/')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks() })
async function click(text) {
  const button = [...document.querySelectorAll('button,a')].find(element =>
    element.getAttribute('aria-label') === text || element.textContent.trim() === text)
  expect(button, `Missing control: ${text}`).toBeTruthy()
  await act(async () => { button.click() })
}
async function navigate(path) {
  await act(async () => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')) })
}
async function chooseSession() {
  window.history.replaceState({}, '', '/discover/food-type')
  await act(async () => root.render(<App />))
  await click('Noodle'); await click('Continue')
  await click('Spicy'); await click('Comforting'); await click('Continue')
  await click('Feeling AdventurousTake me further outside my comfort zone'); await click('Continue')
  await click('Southeast AsiaVietnam • Cambodia • Philippines'); await click('Continue')
}
async function openNearby() {
  await chooseSession(); await click('View Lort Cha details'); await click('Find nearby restaurants')
}
async function select(label, value) {
  const control = [...document.querySelectorAll('select')].find(element => element.parentElement.textContent.includes(label))
  await act(async () => { control.value = String(value); control.dispatchEvent(new Event('change', { bubbles: true })) })
}
const names = () => [...document.querySelectorAll('.restaurant-name')].map(element => element.textContent)

describe('Nearby Restaurants flow', () => {
  it('opens from Dish Details with the selected dish, session chips, computed score, and provider cards', async () => {
    const spy = vi.spyOn(provider, 'findRestaurantsForDish')
    await openNearby()
    expect(window.location.pathname).toBe('/recommendations/lort-cha/nearby')
    expect(document.querySelector('h1').textContent).toContain('Lort Cha')
    expect(document.querySelector('.nearby-match').textContent).toBe('85 %match')
    expect(document.querySelector('.nearby-chips').textContent).toContain('Spicy')
    expect(document.querySelector('.nearby-chips').textContent).toContain('Southeast Asian')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ dishId: 'lort-cha', signal: expect.any(AbortSignal) }))
    expect(names()).toEqual(provider.selectRestaurants(mockRestaurants).map(restaurant => restaurant.name))
    expect(document.body.textContent).toContain('Found 6 places near you.')
    expect(document.body.textContent).toContain('1.2 mi • Revere, MA • $$')
    expect(document.body.textContent).toContain('4.6 (269) •Open')
    expect(document.body.textContent).toContain('Development preview.')
    expect(document.activeElement.id).toBe('main-content')
  })

  it('supports See all and preserves More Options as the detail return route', async () => {
    await chooseSession(); await click('See more options'); await click('View Mì Quảng details'); await click('See all')
    expect(document.querySelector('h1').textContent).toContain('Mì Quảng')
    expect(document.querySelector('.nearby-match').textContent).toBe('70 %match')
    await click('Go back')
    expect(window.location.pathname).toBe('/recommendations/mi-quang')
    await click('Go back to recommendations')
    expect(window.location.pathname).toBe('/recommendations/more')
  })

  it('returns to the selected dish and keeps dish/restaurant favorites separate across navigation', async () => {
    await openNearby()
    await click('Save THMOR DA Restaurant to favorites')
    await click('Maps')
    expect(document.querySelector('[aria-label="Remove THMOR DA Restaurant from favorites"]').getAttribute('aria-pressed')).toBe('true')
    await click('Go back')
    expect(window.location.pathname).toBe('/recommendations/lort-cha')
    expect(document.querySelector('[aria-label="Save Lort Cha to favorites"]').getAttribute('aria-pressed')).toBe('false')
    await click('Find nearby restaurants')
    expect(document.querySelector('[aria-label="Remove THMOR DA Restaurant from favorites"]')).toBeTruthy()
    expect(document.querySelector('.nearby-match').textContent).toBe('85 %match')
  })

  it('opens details from cards and map selections, and preserves the map on return', async () => {
    await openNearby(); await click('View The Golden Monkey Cafe details')
    expect(window.location.pathname).toBe('/recommendations/lort-cha/nearby/preview-golden-monkey')
    await click('Go back'); await click('Maps')
    expect(document.querySelector('button[aria-label="Select The Golden Monkey Cafe"]').getAttribute('aria-pressed')).toBe('true')
    expect(names()).toEqual(['The Golden Monkey Cafe'])
    await click('Select Peephuptmei Restaurant')
    expect(names()).toEqual(['Peephuptmei Restaurant'])
    await click('Show closest restaurant')
    expect(names()).toEqual(['THMOR DA Restaurant'])
    await click('View THMOR DA Restaurant details')
    expect(document.querySelector('h1').textContent).toBe('THMOR DA Restaurant')
    await click('Go back'); await click('List')
    expect(names()).toHaveLength(6)
    await click('Open Map')
    expect(document.querySelector('[aria-label="Restaurant map preview"]')).toBeTruthy()
    await click('Adjust')
    expect(window.location.pathname).toBe('/discover/food-type')
    expect([...document.querySelectorAll('button')].find(button => button.textContent === 'Noodle').getAttribute('aria-pressed')).toBe('true')
  })

  it('filters and sorts without changing provider records, with a clear-filters recovery', async () => {
    await openNearby(); await select('Minimum rating', 4.5)
    expect(names()).toHaveLength(3)
    await select('Sort restaurants', 'rating')
    expect(names()[0]).toBe('The Golden Monkey Cafe')
    await select('Price level', 1)
    expect(document.body.textContent).toContain('No restaurants found')
    await click('Clear filters')
    expect(names()).toHaveLength(6)
    expect(names()[0]).toBe('The Golden Monkey Cafe')
  })

  it('handles closed restaurants and missing/failed images', async () => {
    vi.spyOn(provider, 'findRestaurantsForDish').mockResolvedValue({ source: 'mock', restaurants: [
      { ...mockRestaurants[0], isOpen: false, image: null },
      { ...mockRestaurants[1], image: '/unavailable.webp' },
    ] })
    await openNearby()
    expect(document.body.textContent).toContain('Closed')
    expect(document.querySelector('img[alt="THMOR DA Restaurant"]').getAttribute('src')).toBe(placeholder)
    await act(async () => document.querySelector('img[alt="The Golden Monkey Cafe"]').dispatchEvent(new Event('error')))
    expect(document.querySelector('img[alt="The Golden Monkey Cafe"]').getAttribute('src')).toBe(placeholder)
    await click('Open Now')
    expect(names()).toEqual(['The Golden Monkey Cafe'])
  })

  it('shows the actual non-fixture dish in the empty-result state', async () => {
    await chooseSession(); await navigate('/recommendations/arepa/nearby')
    expect(document.querySelector('h1').textContent).toContain('Arepa')
    expect(document.body.textContent).toContain('No development results for Arepa yet.')
    expect(names()).toEqual([])
    await click('Back to dish')
    expect(window.location.pathname).toBe('/recommendations/arepa')
  })

  it.each(['/recommendations/unknown/nearby', '/recommendations/nearby'])(
    'handles an invalid or missing dish safely: %s', async path => {
      window.history.replaceState({}, '', path)
      const spy = vi.spyOn(provider, 'findRestaurantsForDish')
      await act(async () => root.render(<App />))
      expect(document.querySelector('h1').textContent).toBe('Dish not found')
      expect(spy).not.toHaveBeenCalled()
      await click('Back to discovery')
      expect(window.location.pathname).toBe('/discover/food-type')
    },
  )

  it('redirects a valid dish to discovery when the required session is missing', async () => {
    window.history.replaceState({}, '', '/recommendations/lort-cha/nearby')
    await act(async () => root.render(<App />))
    expect(window.location.pathname).toBe('/discover/food-type')
  })

  it('shows a provider error and retries successfully', async () => {
    vi.spyOn(provider, 'findRestaurantsForDish').mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ source: 'mock', restaurants: [mockRestaurants[0]] })
    await openNearby()
    expect(document.querySelector('[role="alert"]').textContent).toContain('couldn’t load')
    await click('Try again')
    expect(names()).toEqual(['THMOR DA Restaurant'])
  })

  it('discards stale responses after navigating to a different dish', async () => {
    let resolveOld
    vi.spyOn(provider, 'findRestaurantsForDish')
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      .mockResolvedValue({ restaurants: [], source: 'mock' })
    await openNearby()
    expect(document.body.textContent).toContain('Loading restaurants')
    await navigate('/recommendations/arepa/nearby')
    await act(async () => resolveOld({ restaurants: mockRestaurants, source: 'mock' }))
    expect(document.querySelector('h1').textContent).toContain('Arepa')
    expect(names()).toEqual([])
  })
})
