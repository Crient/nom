// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { createExperienceState, experienceReducer } from '../data/experienceState'
import { serializeExperience } from '../data/persistedState'
import { installMockNearbyProvider } from '../test/mockNearbyProvider'

let root
const preferences = { foodType: 'noodle', flavors: ['spicy', 'comforting'], adventurousness: 'adventurous', region: 'southeast-asia' }
beforeEach(() => {
  installMockNearbyProvider()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals() })
async function mount(path) {
  window.history.replaceState({}, '', path)
  await act(() => root.render(<App />))
}
async function navigate(path) {
  await act(() => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')) })
}
async function click(label) {
  const control = [...document.querySelectorAll('button,a')].find(element => element.getAttribute('aria-label') === label || element.textContent.trim() === label)
  expect(control, `Missing ${label}`).toBeTruthy()
  await act(() => control.click())
}
async function enter(selector, value) {
  const input = document.querySelector(selector)
  expect(input).toBeTruthy()
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const summary = label => [...document.querySelectorAll('dt')].find(element => element.textContent === label)?.nextElementSibling.textContent
const cards = () => [...document.querySelectorAll('article')]
function seedMeal() {
  const at = '2026-10-03T12:00:00.000Z'
  const draft = { id: 'history-meal', dishId: 'lort-cha', restaurantId: 'preview-thmor-da', countryCode: 'KH', startedAt: at,
    verification: { verified: true, method: 'qr-demo', source: 'development', checkedAt: at }, feedback: { reaction: 'loved', observations: [], note: '' } }
  const state = experienceReducer(experienceReducer(createExperienceState(), { type: 'start', draft }), { type: 'complete', id: draft.id, at, day: '2026-10-03' })
  writeLocalState(STORAGE_KEYS.experience, serializeExperience(state))
}

describe('Nom app destinations', () => {
  it('searches, saves, carries the selected dish through discovery, and returns to the search and shared favorites', async () => {
    await mount('/home')
    await enter('input[aria-label="Search for food"]', 'arepa'); await click('Search dishes')
    expect(window.location.search).toBe('?q=arepa')
    expect(cards().map(card => card.getAttribute('aria-label'))).toEqual(['Arepa'])
    expect(document.body.textContent).not.toContain('% match')
    await click('Save Arepa to favorites'); await click('View Arepa details')
    expect(window.location.pathname).toBe('/discover/food-type')
    await click('Noodle'); await click('Continue'); await click('Spicy'); await click('Continue')
    await click('Feeling AdventurousTake me further outside my comfort zone'); await click('Continue'); await click('Continue')
    expect(window.location.pathname).toBe('/recommendations/arepa')
    expect(document.querySelector('h1').textContent).toContain('Arepa')
    expect(document.querySelector('[aria-label="Remove Arepa from favorites"]')).toBeTruthy()
    await click('Go back')
    expect(window.location.pathname + window.location.search).toBe('/explore?q=arepa')
    await navigate('/favorites'); await click('View Arepa details'); await click('Go back')
    expect(window.location.pathname).toBe('/favorites')
    await click('Remove Arepa from favorites')
    expect(document.body.textContent).toContain('Your saved dishes will appear here.')
    await navigate('/explore?q=arepa')
    expect(document.querySelector('[aria-label="Save Arepa to favorites"]')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.discovery)).data.region).toBeNull()
  })

  it('opens saved restaurants and collectibles with shared removal and return navigation', async () => {
    writeLocalState(STORAGE_KEYS.discovery, preferences)
    writeLocalState(STORAGE_KEYS.favorites, { dishIds: [], restaurantIds: ['preview-thmor-da'] })
    writeLocalState(STORAGE_KEYS.experience, { logs: [], openedBoxes: [], favorites: ['cambodia:lumi'] })
    await mount('/favorites'); await click('Restaurants'); await click('View THMOR DA Restaurant details')
    expect(window.location.pathname).toBe('/recommendations/lort-cha/nearby/preview-thmor-da')
    await click('Remove THMOR DA Restaurant from favorites')
    await click('Go back'); await click('Go back'); await click('Go back')
    expect(window.location.pathname).toBe('/favorites')
    await click('Restaurants')
    expect(document.body.textContent).toContain('Your saved restaurants will appear here.')
    await click('Collectibles'); await click('Lumi · CambodiaLegendary'); await click('Remove from favorites'); await click('Go back')
    expect(window.location.pathname).toBe('/favorites')
    await click('Collectibles')
    expect(document.body.textContent).toContain('Your saved collectibles will appear here.')
  })

  it('persists the profile name and dish views without resetting existing progress, and preserves country origins', async () => {
    writeLocalState(STORAGE_KEYS.discovery, preferences)
    seedMeal()
    await mount('/profile')
    const before = localStorage.getItem(STORAGE_KEYS.experience)
    expect(summary('Meals logged')).toBe('1')
    await enter('#display-name', 'Nora'); await click('Save name')
    await click('Favorites'); await click('Go back')
    expect(window.location.pathname).toBe('/profile')
    await click('Home')
    expect(document.querySelector('h1').textContent).toBe('Hello, Nora!')
    await navigate('/recommendations/arepa')
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await act(() => root.render(<App />))
    await navigate('/progress')
    expect(summary('Dishes explored')).toBe('2')
    expect(summary('Meals logged')).toBe('1')
    expect(summary('Countries explored')).toBe('2')
    expect(document.body.textContent).toContain('Open Cambodia Mystery Box')
    await click('View Cambodia collection'); await click('View Lumi'); await click('Go back'); await click('Go back')
    expect(window.location.pathname).toBe('/progress')
    await click('View meal history'); await click('Go back')
    expect(window.location.pathname).toBe('/progress')
    await navigate('/profile')
    expect(document.querySelector('#display-name').value).toBe('Nora')
    expect(localStorage.getItem(STORAGE_KEYS.experience)).toBe(before)
  })

  it('uses actual logs for Home, History and local trends, with meal back navigation', async () => {
    seedMeal()
    await mount('/home')
    expect(document.querySelector('.activity-card').textContent).toContain('Lort Cha')
    expect(document.body.textContent).not.toContain('El Peñol')
    await click('See all')
    expect(window.location.pathname).toBe('/history')
    await click('Meals logged')
    await act(() => document.querySelector('.activity-card').click())
    expect(window.location.pathname).toBe('/visits/history-meal/logged')
    await click('Go back')
    expect(window.location.pathname + window.location.search).toBe('/history?view=meals')
    await click('Dishes explored')
    expect(document.body.textContent).toContain('No dish activity yet')
    await navigate('/explore?view=trending')
    expect(cards().map(card => card.getAttribute('aria-label'))).toEqual(['Lort Cha'])
    expect(document.body.textContent).toContain('Based only on meals you’ve logged')
  })

  it('routes empty search/trends and invalid dish codes sensibly, and opens a known code', async () => {
    writeLocalState(STORAGE_KEYS.discovery, preferences)
    await mount('/explore?view=trending')
    expect(cards()).toHaveLength(0)
    expect(document.body.textContent).toContain('Log a meal to start your local trends')
    await navigate('/explore?q=not-a-dish-name')
    expect(document.body.textContent).toContain('No dishes found')
    await navigate('/scan'); await enter('#dish-code', 'https://example.com/recommendations/lort-cha'); await click('Open dish')
    expect(document.querySelector('[role="alert"]').textContent).toContain('doesn’t match')
    await enter('#dish-code', 'nom://dish/lort-cha'); await click('Open dish')
    expect(window.location.pathname).toBe('/recommendations/lort-cha')
    await click('Go back')
    expect(window.location.pathname).toBe('/scan')
  })

  it('connects Welcome Profile and Surprise Me without inventing preferences', async () => {
    await mount('/'); await click('Profile')
    expect(window.location.pathname).toBe('/profile')
    await click('Home'); await click('Surprise me')
    expect(window.location.pathname).toBe('/discover/flavor')
    const discovery = JSON.parse(localStorage.getItem(STORAGE_KEYS.discovery)).data
    expect(discovery).toEqual({ foodType: 'anything', flavors: [], adventurousness: 'surprise-me', region: 'surprise-me' })
    await click('Spicy'); await click('Continue'); await click('Continue'); await click('Continue')
    await navigate('/home'); await click('Surprise me')
    expect(window.location.pathname).toBe('/recommendations')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.discovery)).data.flavors).toEqual(['spicy'])
  })
})
