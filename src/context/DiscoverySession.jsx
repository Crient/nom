import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * The four answers collected by the 01 - Discovery question screens. They are
 * held in memory for the length of a session so the recommendation screens can
 * read them once those exist. Nothing is persisted between page loads.
 */
const EMPTY_SESSION = {
  foodType: null,
  flavors: [],
  adventurousness: null,
  region: null,
}

const DiscoverySessionContext = createContext(null)

export function DiscoverySessionProvider({ children }) {
  const [session, setSession] = useState(EMPTY_SESSION)

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
