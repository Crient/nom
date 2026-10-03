// @vitest-environment happy-dom
import { actAndLoadRoutes as act } from './test/routeAct'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

let root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  window.history.replaceState({}, '', '/')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks() })

async function mount(path = '/') {
  window.history.replaceState({}, '', path)
  await act(() => root.render(<App />))
}
async function click(text) {
  const control = [...document.querySelectorAll('button,a')].find(el =>
    el.getAttribute('aria-label') === text || el.textContent.trim() === text)
  expect(control, `Missing control: ${text}`).toBeTruthy()
  await act(() => control.click())
}
async function choosePaintedSession() {
  await mount('/discover/food-type')
  await click('Noodle'); await click('Continue')
  await click('Spicy'); await click('Comforting'); await click('Continue')
  await click('Feeling AdventurousTake me further outside my comfort zone'); await click('Continue')
  await click('Southeast AsiaVietnam • Cambodia • Philippines'); await click('Continue')
}

describe('Nom stabilization', () => {
  it('redirects unknown URLs to Home rather than an empty screen', async () => {
    await mount('/not-a-route')
    expect(window.location.pathname).toBe('/home')
    expect(document.querySelector('h1').textContent).toBe('Good Morning, Leng!')
  })

  it.each(['/recommendations', '/recommendations/more', '/recommendations/lort-cha'])(
    'redirects %s into discovery without a required session', async path => {
      await mount(path)
      expect(window.location.pathname).toBe('/discover/food-type')
      expect(document.querySelector('h1').textContent).toContain('What sounds')
    },
  )

  it('starts a route at the top, focuses main, and preserves selections when adjusting', async () => {
    await choosePaintedSession()
    expect(document.activeElement.id).toBe('main-content')
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'instant' })
    expect(document.querySelector('article').textContent).toContain('85 %')
    await click('Adjust preferences')
    expect(window.location.pathname).toBe('/discover/food-type')
    const noodle = [...document.querySelectorAll('button')].find(b => b.textContent === 'Noodle')
    expect(noodle.getAttribute('aria-pressed')).toBe('true')
  })

  it('shares favorites between Details and both recommendation screens without changing scores', async () => {
    await choosePaintedSession()
    await click('View Lort Cha details')
    await click('Save Lort Cha to favorites')
    await click('Go back to recommendations')
    expect(document.querySelector('button[aria-label="Remove Lort Cha from favorites"]').getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelector('article').textContent).toContain('85 %')
    await click('See more options')
    await click('View Mì Quảng details')
    expect(document.querySelector('h1').textContent).toContain('Mì Quảng')
    expect(document.body.textContent).toContain('70 %')
    await click('Save Mì Quảng to favorites')
    await click('Go back to recommendations')
    expect(window.location.pathname).toBe('/recommendations/more')
    await click('Remove Mì Quảng from favorites')
    expect(window.location.pathname).toBe('/recommendations/more')
    await click('View Mì Quảng details')
    expect(document.querySelector('button[aria-label="Save Mì Quảng to favorites"]').getAttribute('aria-pressed')).toBe('false')
  })

  it('connects Home actions and Discover to their destinations', async () => {
    await mount('/home')
    expect(document.querySelector('a[href="/scan"]').textContent).toBe('Scan')
    expect(document.querySelector('a[href="/profile"]').textContent).toBe('Profile')
    expect([...document.querySelectorAll('a')].find(link => link.textContent.trim().startsWith('Explore Now')).getAttribute('href')).toBe('/collections/cambodia')
    await click('Discover')
    expect(window.location.pathname).toBe('/discover/food-type')
  })

  it('opens and favorites a newly imported placeholder dish through More Options', async () => {
    await choosePaintedSession()
    await click('See more options')
    await click('View Reshteh Polow details')
    expect(window.location.pathname).toBe('/recommendations/reshteh-polow')
    expect(document.querySelector('h1').textContent).toContain('Reshteh Polow')
    expect(document.querySelector('img[alt="Reshteh Polow"]').getAttribute('src')).toBeTruthy()
    await click('Save Reshteh Polow to favorites')
    await click('Go back to recommendations')
    expect(window.location.pathname).toBe('/recommendations/more')
    expect(document.querySelector('button[aria-label="Remove Reshteh Polow from favorites"]').getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelector('article[aria-label="#9 Reshteh Polow, 70% match"]')).toBeTruthy()
  })
})
