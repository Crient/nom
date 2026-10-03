import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { readLocalState, writeLocalState, STORAGE_KEYS } from '../data/localPersistence'
import { normalizeFavorites } from '../data/persistedState'

const FavoritesContext = createContext(null)

/** Dish and restaurant IDs stay separate, shared, and locally persistent. */
export function FavoritesProvider({ children }) {
  const [saved] = useState(() => readLocalState(STORAGE_KEYS.favorites, normalizeFavorites, () => ({ dishIds: [], restaurantIds: [] })))
  const [favoriteIds, setFavoriteIds] = useState(saved.dishIds)
  const [restaurantIds, setRestaurantIds] = useState(saved.restaurantIds)
  useEffect(() => { writeLocalState(STORAGE_KEYS.favorites, { dishIds: favoriteIds, restaurantIds }) }, [favoriteIds, restaurantIds])
  const isRestaurantFavorite = useCallback(id => restaurantIds.includes(id), [restaurantIds])
  const toggleRestaurantFavorite = useCallback(id => {
    setRestaurantIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  }, [])

  const isFavorite = useCallback((id) => favoriteIds.includes(id), [favoriteIds])
  const toggleFavorite = useCallback((id) => {
    setFavoriteIds((current) =>
      current.includes(id) ? current.filter((favoriteId) => favoriteId !== id) : [...current, id],
    )
  }, [])

  const value = useMemo(() => ({ isFavorite, toggleFavorite, isRestaurantFavorite, toggleRestaurantFavorite }),
    [isFavorite, toggleFavorite, isRestaurantFavorite, toggleRestaurantFavorite])

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)

  if (!context) {
    throw new Error('useFavorites must be used inside a FavoritesProvider')
  }

  return context
}
