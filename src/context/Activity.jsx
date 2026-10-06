import { createContext, useCallback, useContext, useMemo } from 'react'
import { usePersistedSection } from './LocalData'
import { EMPTY_ACTIVITY, normalizeActivity } from '../data/persistedState'

const ActivityContext = createContext(null)

/** Local display name and actual dish views. Meal history remains in Experience. */
export function ActivityProvider({ children }) {
  const [activity, setActivity] = usePersistedSection('activity', normalizeActivity, () => EMPTY_ACTIVITY)
  const recordDishView = useCallback(dishId => setActivity(current => normalizeActivity({ ...current,
    recentDishes: [{ dishId, viewedAt: new Date().toISOString() }, ...current.recentDishes.filter(item => item.dishId !== dishId)],
  })), [setActivity])
  const setDisplayName = useCallback(displayName => setActivity(current => normalizeActivity({ ...current, displayName })), [setActivity])
  const value = useMemo(() => ({ ...activity, recordDishView, setDisplayName }), [activity, recordDishView, setDisplayName])
  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivity() {
  const context = useContext(ActivityContext)
  if (!context) throw new Error('useActivity requires ActivityProvider')
  return context
}
