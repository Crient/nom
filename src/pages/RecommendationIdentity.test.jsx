// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import fs from 'node:fs'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { dishes } from '../data/dishes'
import { STORAGE_KEYS } from '../data/localPersistence'
import { recommend, selectMoreOptions } from '../utils/recommendationEngine'
import { whyMatched } from '../utils/whyMatched'
let root
const evidence = []
let currentSession
const base = { foodType: 'noodle', flavors: ['spicy', 'comforting'], adventurousness: 'adventurous', region: 'latin-america' }
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="identity-test"></div>'
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  root = createRoot(document.getElementById('identity-test'))
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks() })
afterAll(() => {
  if (process.env.NOM_AUDIT_UI_EVIDENCE) {
    fs.writeFileSync(process.env.NOM_AUDIT_UI_EVIDENCE, JSON.stringify({ surface: 'Mounted React app in happy-dom; no pixel/layout claims', rows: evidence }, null, 2) + '\n')
  }
})
async function mount(session, path) {
  currentSession = session
  localStorage.setItem(STORAGE_KEYS.discovery, JSON.stringify({ version: 1, data: session }))
  window.history.replaceState({}, '', path)
  await act(() => root.render(<App />))
}
async function click(label) {
  const element = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === label || e.textContent.trim() === label)
  expect(element, label).toBeTruthy()
  await act(() => element.click())
}
async function checkCardToDetail(result, origin) {
  const link = document.querySelector(`a[href="/recommendations/${result.dish.id}"]`)
  const card = link.closest('article')
  const percent = Math.round(result.score)
  expect(card.textContent).toContain(`${percent} %`)
  const cardPercent = Number(card.textContent.match(/(\d+)\s+%/)[1])
  expect(card.textContent).toContain(result.dish.name)
  expect(card.textContent).toContain(result.dish.shortDescription)
  expect(card.textContent).toContain(result.dish.flag)
  expect(card.querySelector('[role="img"]').getAttribute('aria-label')).toBe(result.dish.country)
  expect(card.querySelector('img').getAttribute('src')).toBe(result.dish.image)
  await act(() => link.click())
  expect(window.location.pathname).toBe(`/recommendations/${result.dish.id}`)
  expect(document.querySelector('h1').textContent).toContain(result.dish.name)
  expect(document.querySelector('h1').textContent).toContain(result.dish.flag)
  expect(document.querySelector(`[aria-label="${percent}% match"]`)).toBeTruthy()
  const detailsPercent = Number(document.querySelector('[aria-label$="% match"]').getAttribute('aria-label').match(/^(\d+)%/)[1])
  expect(document.querySelector(`img[alt="${result.dish.name}"]`).getAttribute('src')).toBe(result.dish.image)
  expect(document.body.textContent).toContain(result.dish.description)
  const explanation = document.querySelector('[aria-labelledby="why-matched-title"] p').textContent
  expect(explanation).toBe(whyMatched(currentSession, result))
  const save = document.querySelector(`button[aria-label="Save ${result.dish.name} to favorites"]`)
  expect(save).toBeTruthy()
  await act(() => save.click())
  expect(document.querySelector(`button[aria-label="Remove ${result.dish.name} from favorites"]`)).toBeTruthy()
  await click('Go back to recommendations')
  expect(window.location.pathname).toBe(origin)
  expect(document.querySelector(`button[aria-label="Remove ${result.dish.name} from favorites"]`)).toBeTruthy()
  evidence.push({ session: currentSession, section: origin.endsWith('/more') ? 'More Options' : 'Top Matches', dishId: result.dish.id, dishName: result.dish.name, country: result.dish.country, score: result.score, cardPercent, detailsPercent, breakdown: result.breakdown, image: result.dish.image, explanation, favoriteIdentityVerified: true, canonicalRouteVerified: true })
}
describe('card/details identity audit', () => {
  it('clicks every Top Match and all seven More Options, keeping each candidate score, image and favorite identity', async () => {
    await mount(base, '/recommendations')
    const results = recommend(base, dishes)
    expect(document.querySelectorAll('article')).toHaveLength(3)
    for (const result of results.slice(0, 3)) await checkCardToDetail(result, '/recommendations')
    await click('See more options')
    const more = selectMoreOptions(base, results)
    expect(document.querySelectorAll('article')).toHaveLength(7)
    for (const result of more) await checkCardToDetail(result, '/recommendations/more')
  })
  it('renders seven honest low-count backfill cards with one correct cross-region boundary', async () => {
    const session = { foodType: 'anything', flavors: ['spicy', 'tangy'], adventurousness: 'surprise-me', region: 'europe' }
    await mount(session, '/recommendations/more')
    expect(document.querySelectorAll('article')).toHaveLength(7)
    const results = selectMoreOptions(session, recommend(session, dishes))
    const heading = [...document.querySelectorAll('h2')].find(e => e.textContent === 'Similar dishes from other regions')
    expect(heading).toBeTruthy()
    expect(heading.nextElementSibling.getAttribute('aria-label')).toContain('Yassa')
    for (const result of results) await checkCardToDetail(result, '/recommendations/more')
  })
})
