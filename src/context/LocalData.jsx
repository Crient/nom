import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { readGuestSection } from '../data/identityStorage'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'

const LocalDataContext = createContext(null)
const nothing = () => () => {}
const noSnapshot = () => null
const identity = value => value

export function LocalDataProvider({ store, children }) {
  useEffect(() => {
    store.start()
    const retry = () => store.retry()
    globalThis.addEventListener?.('online', retry)
    globalThis.addEventListener?.('focus', retry)
    return () => { store.stop(); globalThis.removeEventListener?.('online', retry); globalThis.removeEventListener?.('focus', retry) }
  }, [store])
  return <LocalDataContext.Provider value={store}>{children}</LocalDataContext.Provider>
}

/** Existing standalone providers retain their local-only behavior in previews
 * and component tests. The app's identity boundary supplies one atomic store. */
export function usePersistedSection(section, normalize, fallback, serialize = identity) {
  const store = useContext(LocalDataContext)
  const snapshot = useSyncExternalStore(store?.subscribe ?? nothing, store?.getSnapshot ?? noSnapshot, store?.getSnapshot ?? noSnapshot)
  const [local, setLocal] = useState(() => store ? null : readGuestSection(section, normalize, fallback))
  useEffect(() => { if (!store) writeLocalState(STORAGE_KEYS[section], serialize(local)) }, [store, local, section, serialize])
  const update = useCallback(updater => { if (store) store.update(section, updater); else setLocal(updater) }, [store, section])
  return [store ? snapshot.data[section] : local, update]
}

export function useAccountSync() {
  const store = useContext(LocalDataContext)
  const snapshot = useSyncExternalStore(store?.subscribe ?? nothing, store?.getSnapshot ?? noSnapshot, store?.getSnapshot ?? noSnapshot)
  return store ? { ...snapshot, retry: store.retry, mergeGuest: store.mergeGuest, useAccountOnly: store.useAccountOnly, stopSync: store.stop }
    : { syncStatus: 'guest', syncError: null, migrationPending: false, outboxCount: 0 }
}
