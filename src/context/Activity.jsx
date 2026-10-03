import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { readLocalState, writeLocalState, STORAGE_KEYS } from '../data/localPersistence'
import { EMPTY_ACTIVITY, normalizeActivity } from '../data/persistedState'

const ActivityContext = createContext(null)

/** Local display name and actual dish views. Meal history remains in Experience. */
export function ActivityProvider({ children }) {
  const [activity, setActivity] = useState(() => readLocalState(STORAGE_KEYS.activity, normalizeActivity, () => EMPTY_ACTIVITY))
  useEffect(() => { writeLocalState(STORAGE_KEYS.activity, activity) }, [activity])
  const recordDishView = useCallback(dishId => setActivity(current => normalizeActivity({ ...current,
    recentDishes: [{ dishId, viewedAt: new Date().toISOString() }, ...current.recentDishes.filter(item => item.dishId !== dishId)],
  })), [])
  const setDisplayName = useCallback(displayName => setActivity(current => normalizeActivity({ ...current, displayName })), [])
  const value = useMemo(() => ({ ...activity, recordDishView, setDisplayName }), [activity, recordDishView, setDisplayName])
  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivity() {
  const context = useContext(ActivityContext)
  if (!context) throw new Error('useActivity requires ActivityProvider')
  return context
}
