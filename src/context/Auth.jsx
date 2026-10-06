import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { clearNomAuthStorage, getSupabaseClient, removeProviderTokens, supabaseConfiguration } from '../lib/supabaseClient'
import { rememberAccountReturn } from '../utils/accountNavigation'

const unavailable = async () => { throw new Error('Account sync is unavailable in this build. Continue as Guest.') }
const guestAuth = { user: null, session: null, authReady: true, isAuthenticated: false, supabaseConfigured: false,
  client: null, authError: null, signInWithGoogle: unavailable, signUpWithEmail: unavailable, signInWithEmail: unavailable,
  sendPasswordReset: unavailable, updatePassword: unavailable, completeCallback: unavailable, refreshSession: unavailable, signOut: unavailable }
const AuthContext = createContext(guestAuth)
const exchanges = new WeakMap()

export function AuthProvider({ children, client: injectedClient }) {
  const configured = injectedClient !== undefined ? Boolean(injectedClient) : Boolean(supabaseConfiguration())
  const [client, setClient] = useState(injectedClient ?? null)
  const [session, setSession] = useState(null), [authReady, setReady] = useState(!configured), [authError, setError] = useState(null)
  const eventVersion = useRef(0), locallySignedOut = useRef(false)
  useEffect(() => {
    let alive = true, unsubscribe
    if (!configured) { setReady(true); return }
    async function bootstrap() {
      try {
        const sdk = injectedClient ?? await getSupabaseClient()
        if (!alive) return
        setClient(sdk)
        const { data } = sdk.auth.onAuthStateChange((event, next) => {
          if (!alive || locallySignedOut.current && event !== 'SIGNED_OUT') return
          eventVersion.current++
          setSession(removeProviderTokens(next)); setReady(true)
        })
        unsubscribe = () => data.subscription.unsubscribe()
        const version = eventVersion.current
        const response = await sdk.auth.getSession()
        if (!alive || version !== eventVersion.current) return
        if (response.error) throw response.error
        setSession(removeProviderTokens(response.data.session)); setReady(true)
      } catch {
        if (alive) { setError('We couldn’t restore your account session. You can continue as Guest or sign in again.'); setReady(true) }
      }
    }
    bootstrap()
    return () => { alive = false; unsubscribe?.() }
  }, [configured, injectedClient])

  const call = useCallback(async operation => {
    setError(null)
    if (!client) return unavailable()
    try {
      const result = await operation(client.auth)
      if (result.error) throw result.error
      return result.data?.session ? { ...result.data, session: removeProviderTokens(result.data.session) } : result.data
    } catch (error) {
      const message = error?.code === 'invalid_credentials' ? 'Email or password is incorrect.'
        : 'The account request could not be completed. Please try again.'
      setError(message); throw new Error(message)
    }
  }, [client])
  const actions = useMemo(() => ({
    signInWithGoogle(next = '/home') {
      locallySignedOut.current = false; rememberAccountReturn(next)
      return call(auth => auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } }))
    },
    signUpWithEmail(email, password, next = '/home') {
      locallySignedOut.current = false; rememberAccountReturn(next)
      return call(auth => auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } }))
    },
    signInWithEmail(email, password) {
      locallySignedOut.current = false
      return call(auth => auth.signInWithPassword({ email, password }))
    },
    sendPasswordReset: email => call(auth => auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/account/reset-password` })),
    updatePassword: password => call(auth => auth.updateUser({ password })),
    completeCallback(code) {
      if (!client || !code) return Promise.reject(new Error('This sign-in link is missing or expired. Start again from Account.'))
      let pending = exchanges.get(client)
      if (!pending) { pending = new Map(); exchanges.set(client, pending) }
      if (!pending.has(code)) pending.set(code, call(auth => auth.exchangeCodeForSession(code)))
      return pending.get(code)
    },
    refreshSession: () => call(auth => auth.refreshSession()),
    async signOut({ forceLocal = false } = {}) {
      if (!client) return
      setError(null)
      let result
      try { result = await client.auth.signOut({ scope: 'local' }) } catch (error) { result = { error } }
      if (!forceLocal && result.error && !/fetch|network|retryable/i.test(`${result.error.name} ${result.error.message}`)) {
        setError('Couldn’t sign out. Please try again.'); throw new Error('Couldn’t sign out.')
      }
      locallySignedOut.current = true; clearNomAuthStorage(); eventVersion.current++
      setSession(null)
    },
  }), [client, call])
  const value = useMemo(() => ({ ...actions, client, session, user: session?.user ?? null,
    authReady, isAuthenticated: Boolean(session?.user), supabaseConfigured: configured, authError }), [actions, client, session, authReady, configured, authError])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
