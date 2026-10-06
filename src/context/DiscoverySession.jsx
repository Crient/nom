import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { usePersistedSection } from './LocalData'
import { EMPTY_DISCOVERY, normalizeDiscovery } from '../data/persistedState'

/**
 * The four answers collected by the 01 - Discovery question screens. They are
 * shared across the discovery and recommendation flow, with local persistence
 * so a dish/restaurant URL remains usable after refresh.
 */
const EMPTY_SESSION = EMPTY_DISCOVERY

const DiscoverySessionContext = createContext(null)

export function DiscoverySessionProvider({ children }) {
  const [session, setSession] = usePersistedSection('discovery', normalizeDiscovery, () => EMPTY_SESSION)
  const [recommendationSeed, setRecommendationSeed] = useState(null)
  const completeSession = useCallback(() => setRecommendationSeed(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}:${Math.random()}`), [])

  /* Accepts a value or an updater, like useState, so callers that derive the
     next answer from the current one stay correct when React batches. */
  const setAnswer = useCallback((key, value) => {
    setSession((current) => ({
      ...current,
      [key]: typeof value === 'function' ? value(current[key]) : value,
    }))
  }, [setSession])

  const value = useMemo(
    () => ({
      ...session,
      recommendationSeed,
      completeSession,
      setFoodType: (foodType) => setAnswer('foodType', foodType),
      setFlavors: (flavors) => setAnswer('flavors', flavors),
      setAdventurousness: (adventurousness) => setAnswer('adventurousness', adventurousness),
      setRegion: (region) => setAnswer('region', region),
      resetSession: () => { setSession(EMPTY_SESSION); setRecommendationSeed(null) },
    }),
    [session, setSession, setAnswer, recommendationSeed, completeSession],
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
