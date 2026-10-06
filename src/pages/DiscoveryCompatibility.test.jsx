// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { dishes } from '../data/dishes'
import { recommend } from '../utils/recommendationEngine'

const session = { foodType: 'anything', flavors: ['spicy', 'comforting'], adventurousness: 'surprise-me', region: 'surprise-me' }
let root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root'))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  writeLocalState(STORAGE_KEYS.discovery, session)
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks() })
async function mount(path) { window.history.replaceState({}, '', path); await act(() => root.render(<App />)) }
async function click(label) {
  const node = [...document.querySelectorAll('button,a')].find(node => node.textContent.trim() === label || node.getAttribute('aria-label') === label)
  expect(node, label).toBeTruthy(); await act(() => node.click())
}
const topIds = () => [...document.querySelectorAll('article a')].map(link => link.getAttribute('href').split('/').at(-1))
describe('completed discovery session compatibility and stable variation', () => {
  it('generates exactly one ephemeral seed on Continue; rerenders, detail navigation and More Options keep it; a new completion varies it', async () => {
    const draw = vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('session-one').mockReturnValueOnce('session-two')
    await mount('/discover/region')
    expect(draw).not.toHaveBeenCalled()
    const persisted = localStorage.getItem(STORAGE_KEYS.discovery)
    await click('Continue')
    const first = topIds()
    expect(first).toEqual(recommend({ ...session, recommendationSeed: 'session-one' }, dishes).slice(0, 3).map(result => result.dish.id))
    expect(draw).toHaveBeenCalledTimes(1)
    await act(() => root.render(<App />)); expect(topIds()).toEqual(first)
    await act(() => document.querySelector('article a').click())
    await click('Go back to recommendations'); expect(topIds()).toEqual(first)
    await click('See more options'); await click('Go back'); expect(topIds()).toEqual(first)
    expect(draw).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(STORAGE_KEYS.discovery)).toBe(persisted)
    await click('Go back'); expect(window.location.pathname).toBe('/discover/region')
    await click('Continue')
    expect(draw).toHaveBeenCalledTimes(2)
    expect(topIds()).toEqual(recommend({ ...session, recommendationSeed: 'session-two' }, dishes).slice(0, 3).map(result => result.dish.id))
    expect(topIds()).not.toEqual(first)
    expect(localStorage.getItem(STORAGE_KEYS.discovery)).toBe(persisted)
    expect(JSON.parse(persisted).data).not.toHaveProperty('recommendationSeed')
  })
  it.each([['nasi-goreng', 100, 'spicy and comforting'], ['lort-cha', 85, 'comforting'], ['mie-goreng', 85, 'spicy']])('shows %s compatibility in Dish Details and explains the actual scored flavors', async (id, percent, flavorCopy) => {
    await mount(`/recommendations/${id}`)
    expect(document.querySelector(`[aria-label="${percent}% match"]`)).toBeTruthy()
    const explanation = document.querySelector('[aria-labelledby="why-matched-title"] p').textContent
    expect(explanation).toContain(`matches ${flavorCopy} flavors`)
    expect(explanation).toContain(`${percent}% compatibility`)
    if (percent === 85) expect(explanation).not.toContain('matches spicy and comforting')
  })
})
