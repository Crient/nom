// @vitest-environment happy-dom
import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './Auth'
import { mockSupabase, USER_A, USER_B } from '../test/accountFixtures'
import { createNomSupabaseClient, removeProviderTokens, supabaseConfiguration } from '../lib/supabaseClient'
import { safeAccountReturn } from '../utils/accountNavigation'

let root, auth
function Probe() { auth = useAuth(); return <span>{auth.authReady ? auth.user?.email ?? 'Guest' : 'Loading'}</span> }
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.getElementById('root')) })
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks() })
async function mount(client, strict = false) { await act(() => root.render(strict ? <StrictMode><AuthProvider client={client}><Probe /></AuthProvider></StrictMode> : <AuthProvider client={client}><Probe /></AuthProvider>)) }

describe('optional Auth boundary', () => {
  it('works without configuration or SDK requests', async () => { await mount(null); expect(auth).toMatchObject({ authReady: true, isAuthenticated: false, supabaseConfigured: false }); expect(document.body.textContent).toBe('Guest'); expect(await createNomSupabaseClient(null)).toBeNull() })
  it('restores session, strips Google tokens, and reacts to account switching', async () => {
    const sdk = mockSupabase(USER_A); await mount(sdk)
    expect(auth.user.id).toBe(USER_A.id)
    await act(() => sdk.emit(USER_B)); expect(auth.user.id).toBe(USER_B.id)
    expect(auth.session.provider_token).toBeUndefined()
    await act(() => sdk.emit(null)); expect(auth.isAuthenticated).toBe(false)
  })
  it('never lets a slow initial session overwrite a newer auth event', async () => {
    const sdk = mockSupabase(), pending = []; sdk.auth.getSession.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
    await mount(sdk); expect(auth.authReady).toBe(false)
    await act(() => sdk.emit(USER_B)); await act(() => pending[0]({ data: { session: { user: USER_A } } }))
    expect(auth.user.id).toBe(USER_B.id)
  })
  it('recovers failed session restoration as usable Guest with an error', async () => {
    const sdk = mockSupabase(); sdk.auth.getSession.mockRejectedValue(new Error('offline'))
    await mount(sdk); expect(auth.authReady).toBe(true); expect(auth.user).toBeNull(); expect(auth.authError).toContain('restore')
  })
  it('cleans up listeners across StrictMode mounts', async () => {
    const sdk = mockSupabase(USER_A); await mount(sdk, true); await act(() => auth.signOut())
    expect(auth.user).toBeNull(); expect(sdk.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
  it('sends Google PKCE redirect and keeps only a safe app return', async () => {
    const sdk = mockSupabase(); await mount(sdk); await act(() => auth.signInWithGoogle('//outside.test'))
    expect(sdk.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
    expect(sessionStorage.getItem('nom.auth.returnTo')).toBe('/home')
  })
  it('supports email signup, password signin, reset, update, and refresh', async () => {
    const sdk = mockSupabase(); await mount(sdk)
    await act(() => auth.signUpWithEmail('a@example.test', 'test-password', '/favorites'))
    expect(sdk.auth.signUp.mock.calls[0][0]).toMatchObject({ email: 'a@example.test', options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
    await act(() => auth.signInWithEmail('a@example.test', 'test-password')); expect(auth.user.id).toBe(USER_A.id)
    await act(() => auth.sendPasswordReset('a@example.test'))
    expect(sdk.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@example.test', { redirectTo: `${window.location.origin}/account/reset-password` })
    await act(() => auth.updatePassword('replacement-password')); expect(sdk.auth.updateUser).toHaveBeenCalledWith({ password: 'replacement-password' })
    await act(() => auth.refreshSession()); expect(sdk.auth.refreshSession).toHaveBeenCalledOnce()
  })
  it('exchanges each callback code once under concurrent replay and strips provider tokens from its return', async () => {
    const sdk = mockSupabase(); await mount(sdk)
    let results; await act(async () => { results = await Promise.all([auth.completeCallback('code-one'), auth.completeCallback('code-one')]) })
    expect(sdk.auth.exchangeCodeForSession).toHaveBeenCalledOnce(); expect(results[0].session.provider_token).toBeUndefined()
    await expect(auth.completeCallback('')).rejects.toThrow('missing or expired')
  })
  it('maps failed credentials to a user-safe error', async () => {
    const sdk = mockSupabase(); sdk.auth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials', message: 'internal detail' } }); await mount(sdk)
    await act(async () => { await expect(auth.signInWithEmail('a@example.test', 'wrong')).rejects.toThrow('Email or password is incorrect.') })
    expect(auth.authError).not.toContain('internal')
  })
  it('offline signout clears auth only, preserving account and Guest caches', async () => {
    const sdk = mockSupabase(USER_A); sdk.auth.signOut.mockResolvedValue({ error: { name: 'AuthRetryableFetchError', message: 'network' } }); await mount(sdk)
    localStorage.setItem('nom.auth.supabase', 'session'); localStorage.setItem('nom.v2.guest.activity', 'G'); localStorage.setItem(`nom.v2.user.${USER_A.id}.cache`, 'A')
    await act(() => auth.signOut()); expect(auth.user).toBeNull(); expect(localStorage.getItem('nom.auth.supabase')).toBeNull()
    expect(localStorage.getItem('nom.v2.guest.activity')).toBe('G'); expect(localStorage.getItem(`nom.v2.user.${USER_A.id}.cache`)).toBe('A')
    await act(() => sdk.emit(USER_A, 'TOKEN_REFRESHED')); expect(auth.user).toBeNull()
  })
})

describe('client configuration and redirect boundary', () => {
  it.each(['https://different.supabase.co', 'http://iwamwxsosrhxsdcsuoiu.supabase.co', 'not-a-url'])('rejects a different or insecure remote %s', url => {
    expect(supabaseConfiguration({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mock', DEV: false })).toBeNull()
  })
  it('accepts only Nom publishable credentials; rejects privileged and legacy keys', () => {
    const env = { VITE_SUPABASE_URL: 'https://iwamwxsosrhxsdcsuoiu.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mock' }
    expect(supabaseConfiguration(env)).toMatchObject({ url: env.VITE_SUPABASE_URL })
    expect(supabaseConfiguration({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_test' })).toBeNull()
    expect(supabaseConfiguration({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJlegacy' })).toBeNull()
  })
  it.each(['https://external.test', '//external.test', '/account', '/auth/callback', '/home\\external', '/%2f%2fexternal'])('rejects unsafe return %s', value => { expect(safeAccountReturn(value)).toBe('/home') })
  it('accepts safe internal detail links and keeps the Nom session tokens only', () => {
    expect(safeAccountReturn('/recommendations/num-banh-chok?from=home')).toBe('/recommendations/num-banh-chok?from=home')
    expect(removeProviderTokens({ access_token: 'Nom', provider_token: 'Google', provider_refresh_token: 'Google' })).toEqual({ access_token: 'Nom' })
  })
})
