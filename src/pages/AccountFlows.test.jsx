// @vitest-environment happy-dom
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.hoisted(() => { vi.stubEnv('VITE_ENABLE_REWARD_QA', 'true') })
vi.mock('../data/restaurantProvider', async original => ({ ...await original(), findRestaurant: vi.fn() }))
import App from '../App'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { mockSupabase, USER_A, USER_B, at, meal } from '../test/accountFixtures'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { findRestaurant } from '../data/restaurantProvider'
import { identityCacheKey } from '../data/identityStorage'
import { normalizeExperience, serializeExperience } from '../data/persistedState'
import { experienceReducer } from '../data/experienceState'
import { defaultJourney } from '../data/cloudState'

let root, fetchSpy
beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_REWARD_QA', 'true')
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')); vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({ deletionConfigured: false }) })); vi.stubGlobal('fetch', fetchSpy)
  findRestaurant.mockClear()
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })
async function mount(path, sdk = null, strict = false) { window.history.replaceState({}, '', path); await act(() => root.render(strict ? <StrictMode><App supabaseClient={sdk} /></StrictMode> : <App supabaseClient={sdk} />)) }
async function click(label) {
  const control = [...document.querySelectorAll('a,button')].find(node => node.textContent.trim() === label || node.getAttribute('aria-label') === label)
  expect(control, label).toBeTruthy(); await act(() => control.click())
}
async function fill(id, value) {
  const input = document.getElementById(id); expect(input, id).toBeTruthy()
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() { await act(() => document.querySelector('form.account-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }

describe('account routes and Guest-first entry', () => {
  it('has exactly four Home quick actions and a neutral fresh name', async () => {
    await mount('/home'); expect(document.querySelector('h1').textContent).toBe('Hello, Explorer!')
    expect([...document.querySelectorAll('.home-quick-actions a')].map(node => node.textContent)).toEqual(['Explore', 'Log Meal', 'Favorites', 'Progress'])
    expect(document.querySelector('.home-quick-actions .grid').className).toContain('grid-cols-4')
  })
  it('keeps Get Started primary and offers optional signin', async () => {
    await mount('/'); expect(document.body.textContent).toContain('Get Started'); await click('Sign in to sync')
    expect(window.location.pathname).toBe('/account'); expect(document.body.textContent).toContain('not configured')
    expect(document.getElementById('account-email').disabled).toBe(true)
    await click('Continue exploring'); expect(window.location.pathname).toBe('/home')
  })
  it('shows device-only Guest Profile and account CTA', async () => {
    await mount('/profile'); expect(document.body.textContent).toContain('Guest explorer'); expect(document.body.textContent).toContain('Saved on this device')
    await click('Sign in to sync your journey'); expect(window.location.pathname).toBe('/account')
  })
  it('restores signed-in Profile identity and signout returns to Guest name', async () => {
    writeLocalState(STORAGE_KEYS.activity, { displayName: 'Guest name', recentDishes: [] })
    const sdk = mockSupabase(USER_A); sdk.rows.profiles.push({ id: USER_A.id, display_name: 'Account A' })
    await mount('/profile', sdk)
    expect(document.querySelector('[role="dialog"]').textContent).toContain('Bring your Nom journey')
    await click('Use account data only')
    expect(document.body.textContent).toContain('Account A'); expect(document.body.textContent).toContain(USER_A.email)
    await click('Account settings & sign out'); expect(document.body.textContent).toContain('Account deletion is unavailable')
    await click('Sign out'); expect(window.location.pathname).toBe('/profile'); expect(document.body.textContent).toContain('Guest name')
    expect(document.body.textContent).not.toContain(USER_A.email)
  })
  it('keeps Guest pending until explicit Merge & Sync', async () => {
    writeLocalState(STORAGE_KEYS.favorites, { dishIds: ['nasi-goreng'], restaurantIds: [] })
    const sdk = mockSupabase(USER_A); await mount('/profile', sdk, true)
    expect(sdk.rows.dish_favorites).toEqual([])
    await click('Merge & Sync')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(sdk.rows.dish_favorites).toHaveLength(1); expect(document.body.textContent).toContain('Synced')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites)).data.dishIds).toEqual(['nasi-goreng'])
  })
  it('switches A → B → Guest without displaying the previous account', async () => {
    const sdk = mockSupabase(USER_A); sdk.rows.profiles.push({ id: USER_A.id, display_name: 'Account A' }, { id: USER_B.id, display_name: 'Account B' })
    await mount('/profile', sdk); expect(document.body.textContent).toContain('Account A')
    await act(() => sdk.emit(USER_B)); expect(document.body.textContent).toContain('Account B'); expect(document.body.textContent).not.toContain('Account A')
    await act(() => sdk.emit(null)); expect(document.body.textContent).toContain('Explorer'); expect(document.body.textContent).not.toContain('Account B')
  })
  it('handles callback success exactly once across the auth identity transition', async () => {
    const sdk = mockSupabase(); sessionStorage.setItem('nom.auth.returnTo', '/favorites')
    await mount('/auth/callback?code=success', sdk, true)
    expect(window.location.pathname).toBe('/favorites'); expect(window.location.search).toBe('')
    expect(sdk.auth.exchangeCodeForSession).toHaveBeenCalledOnce()
  })
  it.each(['/auth/callback', '/auth/callback?error=access_denied', '/account/reset-password'])('handles missing/denied auth link at %s without redirect loops', async path => {
    const sdk = mockSupabase(); await mount(path, sdk)
    expect(document.querySelector('[role="alert"]').textContent).toContain('missing or expired')
    expect(sdk.auth.exchangeCodeForSession).not.toHaveBeenCalled()
    await click('Back to Account'); expect(window.location.pathname).toBe('/account')
  })
  it('handles failed code exchange without revealing server errors or retrying the same code', async () => {
    const sdk = mockSupabase(); sdk.auth.exchangeCodeForSession.mockResolvedValue({ error: { message: 'private failure' } })
    await mount('/auth/callback?code=expired', sdk, true)
    expect(document.querySelector('[role="alert"]').textContent).toContain('expired'); expect(document.body.textContent).not.toContain('private failure')
    expect(window.location.search).toBe(''); expect(sdk.auth.exchangeCodeForSession).toHaveBeenCalledOnce()
  })
  it('keeps the reset form alive after the exchange signs the user in', async () => {
    const sdk = mockSupabase(); await mount('/account/reset-password?code=recovery', sdk, true)
    expect(document.getElementById('reset-password')).toBeTruthy(); expect(document.getElementById('reset-confirm')).toBeTruthy()
    expect(document.querySelector('[role="alert"]')).toBeNull(); expect(window.location.search).toBe('')
    expect(sdk.auth.exchangeCodeForSession).toHaveBeenCalledOnce()
  })
  it('registers through the labelled form and displays confirmation without uploading Guest activity', async () => {
    writeLocalState(STORAGE_KEYS.favorites, { dishIds: ['nasi-goreng'], restaurantIds: [] })
    const sdk = mockSupabase(); await mount('/account?returnTo=/favorites', sdk)
    await click('Create account'); await fill('account-email', 'new@example.test'); await fill('account-password', 'test-password')
    await submit()
    expect(sdk.auth.signUp).toHaveBeenCalledWith({ email: 'new@example.test', password: 'test-password', options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
    expect(document.body.textContent).toContain('Check your email to confirm')
    expect(window.location.pathname).toBe('/account'); expect(sdk.rows.dish_favorites).toEqual([])
  })
  it('signs in through the form and keeps Guest data pending until an explicit choice', async () => {
    writeLocalState(STORAGE_KEYS.activity, { displayName: 'Guest name', recentDishes: [] })
    const sdk = mockSupabase(); await mount('/account?returnTo=/profile', sdk)
    await fill('account-email', USER_A.email); await fill('account-password', 'test-password'); await submit()
    expect(sdk.auth.signInWithPassword).toHaveBeenCalledWith({ email: USER_A.email, password: 'test-password' })
    expect(window.location.pathname).toBe('/profile')
    expect(document.querySelector('[role="dialog"]').textContent).toContain('Bring your Nom journey')
    expect(sdk.rows.profiles[0].display_name).toBe('Explorer')
    await click('Use account data only'); expect(document.body.textContent).not.toContain('Guest name')
  })
  it('submits reset requests with neutral confirmation and renders safe sign-in failures', async () => {
    const sdk = mockSupabase(); await mount('/account', sdk)
    await click('Reset password'); await fill('account-email', 'possible@example.test'); await submit()
    expect(sdk.auth.resetPasswordForEmail).toHaveBeenCalledWith('possible@example.test', { redirectTo: `${window.location.origin}/account/reset-password` })
    expect(document.body.textContent).toContain('If an account exists')
    await click('Sign in'); await fill('account-password', 'incorrect')
    sdk.auth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials', message: 'internal private diagnostic' } })
    await submit(); expect(document.querySelector('[role="alert"]').textContent).toBe('Email or password is incorrect.')
    expect(document.body.textContent).not.toContain('internal private diagnostic')
  })
  it('checks matching passwords, updates through Supabase, clears fields and offers Account', async () => {
    const sdk = mockSupabase(); await mount('/account/reset-password?code=recovery', sdk)
    await fill('reset-password', 'new-test-password'); await fill('reset-confirm', 'different-password'); await submit()
    expect(document.querySelector('[role="alert"]').textContent).toBe('Passwords do not match.')
    expect(sdk.auth.updateUser).not.toHaveBeenCalled()
    await fill('reset-confirm', 'new-test-password'); await submit()
    expect(sdk.auth.updateUser).toHaveBeenCalledWith({ password: 'new-test-password' })
    expect(document.body.textContent).toContain('Password updated')
    expect(document.getElementById('reset-password')).toBeNull()
    await click('Back to Account'); expect(window.location.pathname).toBe('/account')
  })
  it('requires DELETE confirmation and clears only the deleted identity after successful server response', async () => {
    writeLocalState(STORAGE_KEYS.activity, { displayName: 'Guest name', recentDishes: [] })
    const guest = localStorage.getItem(STORAGE_KEYS.activity), other = identityCacheKey(USER_B.id)
    localStorage.setItem(other, 'unrelated-account-cache')
    fetchSpy.mockImplementation(async (_url, options) => ({ ok: true, json: async () => options?.method === 'DELETE' ? { deleted: true } : { deletionConfigured: true } }))
    const sdk = mockSupabase(USER_A); await mount('/account', sdk); await click('Use account data only')
    const own = identityCacheKey(USER_A.id)
    localStorage.setItem(`${own}.outbox.ack.old`, '1')
    await click('Delete account…')
    const destructive = [...document.querySelectorAll('button')].find(node => node.textContent==='Permanently delete account')
    expect(destructive.disabled).toBe(true)
    await fill('delete-confirmation', 'DELETE'); await click('Permanently delete account')
    expect(fetchSpy).toHaveBeenCalledWith('/api/account', expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer test-access' } }))
    expect(sdk.auth.signOut).toHaveBeenCalled()
    expect(window.location.pathname).toBe('/home'); expect(document.body.textContent).toContain('Hello, Guest name!')
    expect(Object.keys(localStorage).filter(key => key===own || key.startsWith(`${own}.`))).toEqual([])
    expect(localStorage.getItem(STORAGE_KEYS.activity)).toBe(guest); expect(localStorage.getItem(other)).toBe('unrelated-account-cache')
  })
  it.each([false, true])('retains account/Guest data and session when deletion is unconfirmed (HTTP success=%s)', async successfulHttp => {
    fetchSpy.mockImplementation(async (_url, options) => ({ ok: options?.method !== 'DELETE' || successfulHttp, json: async () => ({ deletionConfigured: true }) }))
    const sdk = mockSupabase(USER_A); await mount('/account', sdk)
    const own = localStorage.getItem(identityCacheKey(USER_A.id))
    await click('Delete account…'); await fill('delete-confirmation', 'DELETE'); await click('Permanently delete account')
    expect(document.body.textContent).toContain('Account deletion could not be completed')
    expect(sdk.auth.signOut).not.toHaveBeenCalled(); expect(window.location.pathname).toBe('/account')
    expect(localStorage.getItem(identityCacheKey(USER_A.id))).toBe(own)
  })
  it('merges a representative journey through the UI and hydrates a fresh device from repository rows', async () => {
    const guest = defaultJourney()
    guest.activity = { displayName: 'Guest journey', recentDishes: [{ dishId: 'num-banh-chok', viewedAt: at }] }
    guest.favorites = { dishIds: ['num-banh-chok'], restaurantIds: ['google:nom-test-place'] }
    guest.experience = normalizeExperience({ logs: [meal()], openedBoxes: [], favorites: [] })
    guest.experience = experienceReducer(guest.experience, { type: 'begin-box', id: 'box-visit-one' })
    guest.experience = experienceReducer(guest.experience, { type: 'open-box', id: 'box-visit-one', at })
    guest.experience = experienceReducer(guest.experience, { type: 'favorite', key: 'cambodia:ziggy' })
    for (const [section, value] of Object.entries(guest)) writeLocalState(STORAGE_KEYS[section], section === 'experience' ? serializeExperience(value) : value)
    const sdk = mockSupabase(USER_A); await mount('/profile', sdk, true); await click('Merge & Sync')
    expect(sdk.rows.profiles[0].display_name).toBe('Guest journey')
    expect(sdk.rows.dish_favorites).toHaveLength(1); expect(sdk.rows.restaurant_favorites).toHaveLength(1)
    expect(sdk.rows.recent_dish_views).toHaveLength(1); expect(sdk.rows.meal_logs[0]).toMatchObject({ feedback_note: 'Tasty', local_day: '2026-10-06' })
    expect(sdk.rows.opened_boxes[0]).toMatchObject({ collectible_id: 'ziggy', duplicate: false })
    expect(sdk.rows.collectible_favorites).toHaveLength(1)
    const expected = JSON.parse(localStorage.getItem(identityCacheKey(USER_A.id))).data.data
    await act(() => root.unmount()); localStorage.clear()
    root = createRoot(document.getElementById('root'))
    const second = mockSupabase(USER_A, sdk.rows); await mount('/profile', second)
    const hydrated = JSON.parse(localStorage.getItem(identityCacheKey(USER_A.id))).data.data
    expect(hydrated.favorites).toEqual(expected.favorites); expect(hydrated.activity).toEqual(expected.activity)
    expect(hydrated.experience).toEqual(expected.experience)
    await click('Account settings & sign out'); await click('Sign out')
    expect(document.body.textContent).toContain('Explorer'); expect(document.body.textContent).not.toContain('Guest journey')
  })
})

describe('authenticated QA previews never enqueue user changes', () => {
  it('runs experience mock logging and reward previews without cache changes, outbox mutations, Places, or network', async () => {
    const sdk = mockSupabase(USER_A); sdk.rows.profiles.push({ id: USER_A.id, display_name: 'Account A' })
    await mount('/dev/experience', sdk)
    const cache = localStorage.getItem(identityCacheKey(USER_A.id)), writes = sdk.writes.length
    await click('Experience Logged — earned progress')
    expect(document.body.textContent).toContain('Test meal saved in memory only')
    await click('Mystery Box unlocked'); expect(document.querySelector('.logged-unlocked')).toBeTruthy()
    expect(localStorage.getItem(identityCacheKey(USER_A.id))).toBe(cache)
    expect(sdk.writes).toHaveLength(writes)
    await click('← Back to Profile'); await click('Reward playground')
    await click('Trigger legendary reward')
    expect(document.querySelector('[aria-label="Test reward preview"]')).toBeTruthy()
    expect(localStorage.getItem(identityCacheKey(USER_A.id))).toBe(cache)
    expect(sdk.rows.meal_logs).toEqual([]); expect(sdk.rows.opened_boxes).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled(); expect(findRestaurant).not.toHaveBeenCalled()
  })
  it('cloud views are owned rows and do not enter Guest recent history', async () => {
    const sdk = mockSupabase(USER_A); sdk.rows.recent_dish_views.push({ user_id: USER_A.id, dish_id: 'nasi-goreng', viewed_at: at })
    await mount('/profile', sdk)
    expect(JSON.parse(localStorage.getItem(identityCacheKey(USER_A.id))).data.data.activity.recentDishes).toHaveLength(1)
    expect(localStorage.getItem(STORAGE_KEYS.activity)).toBeNull()
    expect(sdk.requests.every(request => request.filters.some(([, owner]) => owner === USER_A.id))).toBe(true)
  })
})
