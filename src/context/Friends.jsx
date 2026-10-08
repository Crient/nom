import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './Auth'
import { createSocialRepository, emptySocial } from '../data/socialRepository'
const unavailable = async () => { throw new Error('Sign in to use Friends on Nom.') }
const defaultValue = { ...emptySocial(), status: 'guest', error: '', refresh: unavailable, search: unavailable,
  register: unavailable, request: unavailable, respond: unavailable, cancel: unavailable, remove: unavailable, send: unavailable, open: unavailable, loadMore: unavailable }
const FriendsContext = createContext(defaultValue)

// Already remounted at the existing account boundary. No social data in Guest
// storage, account outbox or localStorage; late results are identity/version checked.
export function FriendsProvider({ children }) {
  const { client, user } = useAuth()
  const repository = useMemo(() => client && user ? createSocialRepository(client, user.id) : null, [client, user?.id])
  const [state, setState] = useState(() => ({ ...emptySocial(), status: repository ? 'loading' : 'guest', error: '' }))
  const alive = useRef(false), version = useRef(0)
  const refresh = useCallback(async () => {
    if (!repository) return
    const current = ++version.current
    try {
      const data = await repository.load()
      if (alive.current && version.current === current) setState({ ...data, status: 'ready', error: '' })
    } catch (error) {
      if (alive.current && version.current === current) setState({ ...emptySocial(), status: 'error', error: error.message })
    }
  }, [repository])
  useEffect(() => {
    alive.current = true
    setState({ ...emptySocial(), status: repository ? 'loading' : 'guest', error: '' })
    refresh()
    const focus = () => refresh()
    window.addEventListener('focus', focus)
    // In-app indicators only. No Realtime subscriptions, push/email infrastructure.
    const timer = repository ? setInterval(focus, 60_000) : null
    return () => { alive.current = false; version.current++; window.removeEventListener('focus', focus); clearInterval(timer) }
  }, [repository, refresh])
  const actions = useMemo(() => {
    const mutate = method => async (...args) => {
      if (!repository) return unavailable()
      const result = await repository[method](...args)
      if (alive.current) await refresh()
      return result
    }
    return { refresh, search: query => repository ? repository.search(query) : unavailable(),
      ...Object.fromEntries(['register', 'request', 'respond', 'cancel', 'remove', 'send', 'open'].map(method => [method, mutate(method)])),
      async loadMore() {
        if (!repository || !state.hasMore || !state.inbox.length) return
        const current = version.current, rows = await repository.older(state.inbox.at(-1))
        if (alive.current && current === version.current) setState(previous => ({ ...previous,
          inbox: [...previous.inbox, ...rows.filter(row => !previous.inbox.some(item => item.id === row.id))], hasMore: rows.length === 50 }))
      },
    }
  }, [repository, refresh, state.hasMore, state.inbox])
  return <FriendsContext.Provider value={{ ...state, ...actions }}>{children}</FriendsContext.Provider>
}
export const useFriends = () => useContext(FriendsContext)
