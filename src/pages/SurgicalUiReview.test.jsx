// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExperienceLogged from './ExperienceLogged'
import RestaurantActions from '../components/restaurants/RestaurantActions'
import { createExperienceState } from '../data/experienceState'
import { appendVerified } from '../test/earnedJourney'
import { manualVerification } from '../../shared/visitVerification'
import { dishes } from '../data/dishes'

const context = vi.hoisted(() => ({ state: null, log: null }))
vi.mock('../context/Auth', () => ({ useAuth: () => ({ isAuthenticated: false }) }))
vi.mock('../context/Experience', () => ({ useExperience: () => ({ state: context.state }) }))
vi.mock('../context/ExperienceFlow', () => ({ useExperienceRoute: () => ({ params: { visitId: 'review' }, navigate: vi.fn(), location: {}, testMode: false }) }))
vi.mock('../hooks/useVisit', () => ({ useVisit: () => ({ visit: context.log, log: context.log,
  dish: dishes.find(dish => dish.id === 'lort-cha'), restaurant: { name: 'Review restaurant' }, status: 'ready' }) }))
let root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root'))
  context.state = appendVerified(createExperienceState(), { id: 'review' })
  context.log = context.state.logs[0]
})
afterEach(async () => { await act(() => root.unmount()); vi.unstubAllGlobals() })
async function renderLogged() { await act(() => root.render(<ExperienceLogged />)) }

describe('surgical logged presentation without changing rewards', () => {
  it('shows earned country progress for a signed verified meal', async () => {
    const before = JSON.stringify(context.state)
    await renderLogged()
    expect(document.querySelector('.logged-page').dataset.verified).toBe('true')
    expect(document.querySelector('.logged-progress').textContent).toContain('Lifetime total: 1 meal')
    expect(document.body.textContent).toContain('Your visit at Review restaurant has been added.')
    expect(document.body.textContent).not.toContain('Logged without verification')
    expect(document.querySelector('.logged-unlocked')).toBeNull()
    expect(JSON.stringify(context.state)).toBe(before)
  })
  it('shows a real threshold box only when the verified log earned it', async () => {
    context.state = appendVerified(appendVerified(context.state, { id: 'second', day: '2026-10-04' }), { id: 'third', day: '2026-10-05' })
    context.log = context.state.logs.find(log => log.id === 'third')
    await renderLogged()
    expect(document.querySelector('.logged-unlocked').textContent).toContain('unlocked your Mystery Box')
    expect(context.state.boxes[context.log.boxId].visitId).toBe(context.log.id)
  })
  it('keeps a verified repeat in history without displaying additional earned progress', async () => {
    context.state = appendVerified(context.state, { id: 'repeat' })
    context.log = context.state.logs.find(log => log.id === 'repeat')
    await renderLogged()
    expect(document.querySelector('.logged-page').dataset.verified).toBe('true')
    expect(document.querySelector('.logged-progress')).toBeNull()
    expect(document.querySelector('.logged-unlocked')).toBeNull()
    expect(document.body.textContent).toContain('No extra box progress')
    expect(context.state.progress.cambodia.meals).toBe(1)
  })
  it.each(['manual', 'forged'])('never displays rewards for %s evidence, even with misleading flags', async evidence => {
    context.log = { ...context.log, verification: evidence === 'manual' ? manualVerification() : { verified: true }, earnedProgress: true, boxId: 'misleading' }
    context.state.boxes.misleading = { visitId: context.log.id }
    const before = JSON.stringify(context.state)
    await renderLogged()
    expect(document.querySelector('.logged-progress')).toBeNull()
    expect(document.querySelector('.logged-unlocked')).toBeNull()
    expect(document.body.textContent).toContain('Your meal at Review restaurant has been added to your history.')
    expect(document.body.textContent).toContain('Logged without verification')
    expect(document.body.textContent).toContain('This meal doesn’t count toward country or Mystery Box progress.')
    expect(document.querySelector('.flow-cta button').textContent).toBe('Back to Home')
    expect(JSON.stringify(context.state)).toBe(before)
  })
  it('reserves illustration space before the title for both completion states', async () => {
    const style = document.createElement('style')
    style.textContent = readFileSync('src/styles/experience.css', 'utf8')
    document.head.append(style)
    try {
      for (const verification of [context.log.verification, manualVerification()]) {
        context.log = { ...context.log, verification }
        await renderLogged()
        const art = document.querySelector('.logged-illustration'), copy = document.querySelector('.logged-copy')
        expect(art.previousElementSibling.className).toBe('flow-header')
        expect(art.nextElementSibling).toBe(copy)
        expect(getComputedStyle(art).position).toBe('relative')
        expect(getComputedStyle(art).flexShrink).toBe('0')
        expect(parseFloat(getComputedStyle(copy).marginTop)).toBeGreaterThanOrEqual(24)
      }
    } finally { style.remove() }
  })
})

describe('external Share retains the existing native/copy-link flow', () => {
  async function send(navigatorImpl) {
    vi.stubGlobal('navigator', navigatorImpl)
    window.history.replaceState({}, '', '/recommendations/lort-cha/nearby/google%3Aselected-place?surprise=1')
    await act(() => root.render(<RestaurantActions restaurant={{ name: 'Selected restaurant', placeId: 'selected-place' }} />))
    const button = [...document.querySelectorAll('button')].find(node => node.textContent === 'Share')
    await act(() => button.click())
  }
  it('shares the viewed restaurant deep link and title directly from the gesture', async () => {
    const share = vi.fn().mockResolvedValue()
    await send({ share })
    expect(share).toHaveBeenCalledWith({ title: 'Selected restaurant', text: 'Try Selected restaurant with Nom', url: window.location.href })
    expect(document.querySelector('[role="status"]').textContent).toBe('Restaurant shared.')
  })
  it('copies the deep link when native sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue()
    await send({ clipboard: { writeText } })
    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(document.body.textContent).toContain('Restaurant link copied')
    expect(document.body.textContent).not.toContain('coming soon')
  })
  it('offers a selectable manual link when both native sharing and clipboard are unavailable', async () => {
    await send({})
    const input = document.querySelector('.restaurant-share-fallback input')
    expect(input.readOnly).toBe(true)
    expect(input.value).toBe(window.location.href)
  })
})
