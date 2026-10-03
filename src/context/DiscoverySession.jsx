import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { readLocalState, writeLocalState, STORAGE_KEYS } from '../data/localPersistence'
import { EMPTY_DISCOVERY, normalizeDiscovery } from '../data/persistedState'

/**
 * The four answers collected by the 01 - Discovery question screens. They are
 * shared across the discovery and recommendation flow, with local persistence
 * so a dish/restaurant URL remains usable after refresh.
 */
const EMPTY_SESSION = EMPTY_DISCOVERY

const DiscoverySessionContext = createContext(null)

export function DiscoverySessionProvider({ children }) {
  const [session, setSession] = useState(() => readLocalState(STORAGE_KEYS.discovery, normalizeDiscovery, () => EMPTY_SESSION))
  useEffect(() => { writeLocalState(STORAGE_KEYS.discovery, session) }, [session])

  /* Accepts a value or an updater, like useState, so callers that derive the
     next answer from the current one stay correct when React batches. */
  const setAnswer = useCallback((key, value) => {
    setSession((current) => ({
      ...current,
      [key]: typeof value === 'function' ? value(current[key]) : value,
    }))
  }, [])

  const value = useMemo(
    () => ({
      ...session,
      setFoodType: (foodType) => setAnswer('foodType', foodType),
      setFlavors: (flavors) => setAnswer('flavors', flavors),
      setAdventurousness: (adventurousness) => setAnswer('adventurousness', adventurousness),
      setRegion: (region) => setAnswer('region', region),
      resetSession: () => setSession(EMPTY_SESSION),
    }),
    [session, setAnswer],
  )

  return (
    <DiscoverySessionContext.Provider value={value}>{children}</DiscoverySessionContext.Provider>
  )
}

export function useDiscoverySession() {
  const context = useContext(DiscoverySessionContext)

  if (!context) {
    throw new Error('useDiscoverySession must be used inside a DiscoverySessionProvider')
  }

  return context
}
