// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { createExperienceState, experienceReducer } from '../data/experienceState'
import { serializeExperience } from '../data/persistedState'
import { collectionCountries } from '../data/collectionDefinitions'
import { countrySceneProps } from '../utils/countryScene'
import { installMockNearbyProvider } from '../test/mockNearbyProvider'

let root
beforeEach(() => {
  installMockNearbyProvider(); globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  writeLocalState(STORAGE_KEYS.discovery, { foodType: 'noodle', flavors: ['spicy', 'comforting'], adventurousness: 'adventurous', region: 'southeast-asia' })
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals() })
async function navigate(path) {
  await act(() => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); root.render(<App />) })
}
async function reload() {
  await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
  await act(() => root.render(<App />))
}
const star = () => document.querySelector('button .favorite-star')?.closest('button')
const filled = () => star()?.querySelector('path').getAttribute('fill')

describe('favorite and collection visual state', () => {
  it.each(['/recommendations/lort-cha', '/collections/cambodia/lumi'])('fills the favorite star and preserves it through navigation/reload at %s', async path => {
    await navigate(path)
    expect(star().getAttribute('aria-pressed')).toBe('false'); expect(filled()).toBe('none')
    await act(() => star().click())
    expect(star().getAttribute('aria-pressed')).toBe('true'); expect(filled()).toBe('currentColor')
    await navigate('/collections'); await navigate(path); expect(filled()).toBe('currentColor')
    await reload(); expect(star().getAttribute('aria-pressed')).toBe('true'); expect(filled()).toBe('currentColor')
    await act(() => star().click()); await reload()
    expect(star().getAttribute('aria-pressed')).toBe('false'); expect(filled()).toBe('none')
  })
  it('keeps country art identical when collection completion changes', async () => {
    await navigate('/collections')
    const before = [...document.querySelectorAll('.collection-country')].map(card => ({ id: card.dataset.country, image: card.querySelector('img').getAttribute('src'), style: card.querySelector('img').getAttribute('style') }))
    expect(document.querySelector('[data-country=cambodia]').textContent).toContain('5/6')
    expect(document.querySelector('[data-country=cambodia]').classList.contains('is-complete')).toBe(false)
    expect(document.querySelector('[data-country=cambodia] .collection-complete-accent')).toBeNull()
    const at = '2026-10-05T12:00:00Z', draft = { id: 'visual-visit', dishId: 'lort-cha', countryCode: 'KH', restaurantId: 'preview-thmor-da', startedAt: at, verification: { verified: true, method: 'qr-demo', source: 'development', checkedAt: at }, feedback: { reaction: 'loved', observations: [], note: '' } }
    let state = experienceReducer(createExperienceState(), { type: 'start', draft })
    state = experienceReducer(state, { type: 'complete', id: draft.id, at, day: '2026-10-05' })
    state = experienceReducer(state, { type: 'begin-box', id: 'box-visual-visit' })
    state = experienceReducer(state, { type: 'open-box', id: 'box-visual-visit', at })
    writeLocalState(STORAGE_KEYS.experience, serializeExperience(state))
    await reload()
    expect([...document.querySelectorAll('.collection-country')].map(card => ({ id: card.dataset.country, image: card.querySelector('img').getAttribute('src'), style: card.querySelector('img').getAttribute('style') }))).toEqual(before)
    expect(before).toHaveLength(8)
    expect(document.querySelector('[data-country=cambodia]').textContent).toContain('6/6')
    expect(document.querySelector('[data-country=cambodia]').classList.contains('is-complete')).toBe(true)
    expect(document.querySelector('[data-country=cambodia] .collection-complete-accent').getAttribute('aria-label')).toBe('Country complete')
    expect(document.querySelectorAll('.collection-country.is-complete')).toHaveLength(1)
    expect([...document.querySelectorAll('.collection-country:not(.is-complete)')].every(card => card.dataset.complete === 'false')).toBe(true)
  })
  it.each(collectionCountries)('uses dedicated art and the same six-tile structure for $name', async country => {
    await navigate(`/collections/${country.id}`)
    const page = document.querySelector('.country-collection-page')
    expect(page.style.getPropertyValue('--collection-background')).toContain(country.background)
    expect(document.querySelectorAll('.collectible-tile')).toHaveLength(6)
    expect(document.querySelector('.country-progress-section')).toBeTruthy()
    expect(document.querySelector('.flow-back')).toBeTruthy(); expect(document.querySelector('.flow-more')).toBeTruthy()
    if (country.id !== 'cambodia') {
      expect(country.background).toMatch(/country-backgrounds\/.*-portrait\.webp/)
      expect(country.image).toMatch(/-card\.webp/); expect(country.image).not.toBe(country.background)
      expect(page.style.getPropertyValue('--collection-art-opacity')).toBe('1')
    } else expect(country.background).toContain('cambodia-background.webp')
  })
  it('reserves the Home status region before the controls in normal flow', async () => {
    await navigate('/home')
    const header = document.querySelector('.home-header'), status = header.querySelector('.home-status'), search = header.querySelector('.home-search'), actions = header.querySelector('.home-quick-actions')
    expect([...header.children].slice(0, 3)).toEqual([status, search, actions])
    expect(header.className).not.toContain('pt-[203.2px]')
    expect(search.className).not.toContain('absolute')
    expect(actions.className).not.toContain('absolute')
    expect(status.querySelectorAll('img')).toHaveLength(3)
    expect(document.querySelector('input[aria-label="Search for food"]')).toBeTruthy()
  })
  it('gives dish detail the same chip geometry as Surprise, with unbroken labels', async () => {
    writeLocalState(STORAGE_KEYS.discovery, { foodType: 'anything', flavors: ['spicy', 'comforting'], adventurousness: 'surprise-me', region: 'surprise-me' })
    await navigate('/recommendations/surprise')
    const surprise = [...document.querySelectorAll('.surprise-chips .nom-session-chip')].map(chip => ({ text: chip.textContent, classes: chip.className, labelClasses: chip.lastElementChild.className, iconClasses: chip.querySelector('img').className }))
    await navigate('/recommendations/lort-cha')
    const detail = [...document.querySelectorAll('.dish-detail-chips .nom-session-chip')].map(chip => ({ text: chip.textContent, classes: chip.className, labelClasses: chip.lastElementChild.className, iconClasses: chip.querySelector('img').className }))
    expect(detail).toEqual(surprise)
    expect(detail.map(chip => chip.text)).toEqual(expect.arrayContaining(['Anything', 'Spicy', 'Comforting', 'Surprise Me', 'Surprise Me']))
    expect(detail.every(chip => chip.labelClasses.includes('whitespace-nowrap') && chip.classes.includes('shrink-0'))).toBe(true)
    expect(document.querySelector('.dish-detail-chips').classList.contains('flex-wrap')).toBe(true)
  })
  it('uses a clean gradient instead of stretching a thumbnail for unsupported countries', () => {
    const scene = countrySceneProps({ id: 'future-country', image: 'tiny-horizontal.webp' })
    expect(scene.className).toContain('collection-fallback')
    expect(scene.style['--collection-background']).toBe('none')
  })
})
