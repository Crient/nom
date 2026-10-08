import { createContext, useContext, useCallback, useMemo } from 'react'
import { createExperienceState, experienceReducer, visitDay } from '../data/experienceState'
import { usePersistedSection } from './LocalData'
import { normalizeExperience, serializeExperience } from '../data/persistedState'

const ExperienceContext = createContext(null)
let visitSequence = 0

/** A preview supplies an isolated in-memory value; it never uses persistence. */
export function ExperiencePreviewProvider({ value, children }) {
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>
}

export function ExperienceProvider({ children }) {
  const [state, setState] = usePersistedSection('experience', normalizeExperience, createExperienceState, serializeExperience)
  const dispatch = useCallback(action => setState(current => experienceReducer(current, action)), [setState])
  const actions = useMemo(() => ({
    startVisit({ dish, restaurant, returnState }) {
      const id = globalThis.crypto?.randomUUID?.() ?? `visit-${Date.now()}-${++visitSequence}`
      dispatch({ type: 'start', draft: { id, dishId: dish.id, restaurantId: restaurant.id, countryCode: dish.countryCode,
        restaurantName: restaurant.name,
        startedAt: new Date().toISOString(), returnState, verification: null, feedback: null } })
      return id
    },
    verifyVisit: (id, verification) => dispatch({ type: 'verify', id, verification }),
    saveFeedback: (id, feedback) => dispatch({ type: 'feedback', id, feedback }),
    completeVisit(id) { const date = new Date(); dispatch({ type: 'complete', id, day: visitDay(date), at: date.toISOString() }) },
    beginBox: id => dispatch({ type: 'begin-box', id }),
    openBox: id => dispatch({ type: 'open-box', id, at: new Date().toISOString() }),
    toggleCollectibleFavorite: key => dispatch({ type: 'favorite', key }),
  }), [dispatch])
  const value = useMemo(() => ({ state, ...actions }), [state, actions])
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>
}

export function useExperience() {
  const context = useContext(ExperienceContext)
  if (!context) throw new Error('useExperience requires ExperienceProvider')
  return context
}
