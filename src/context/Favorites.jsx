import { createContext, useCallback, useContext, useMemo } from 'react'
import { usePersistedSection } from './LocalData'
import { normalizeFavorites } from '../data/persistedState'

const FavoritesContext = createContext(null)

/** Memory-only test favorites supplied by the isolated experience playground. */
export function FavoritesPreviewProvider({ value, children }) {
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

/** Dish and restaurant IDs stay separate, shared, and locally persistent. */
export function FavoritesProvider({ children }) {
  const [saved, setSaved] = usePersistedSection('favorites', normalizeFavorites, () => ({ dishIds: [], restaurantIds: [] }))
  const favoriteIds = saved.dishIds, restaurantIds = saved.restaurantIds
  const setFavoriteIds = useCallback(updater => setSaved(current => ({ ...current, dishIds: updater(current.dishIds) })), [setSaved])
  const setRestaurantIds = useCallback(updater => setSaved(current => ({ ...current, restaurantIds: updater(current.restaurantIds) })), [setSaved])
  const isRestaurantFavorite = useCallback(id => restaurantIds.includes(id), [restaurantIds])
  const toggleRestaurantFavorite = useCallback(id => {
    setRestaurantIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  }, [setRestaurantIds])

  const isFavorite = useCallback((id) => favoriteIds.includes(id), [favoriteIds])
  const toggleFavorite = useCallback((id) => {
    setFavoriteIds((current) =>
      current.includes(id) ? current.filter((favoriteId) => favoriteId !== id) : [...current, id],
    )
  }, [setFavoriteIds])

  const value = useMemo(() => ({ favoriteIds, restaurantIds, isFavorite, toggleFavorite, isRestaurantFavorite, toggleRestaurantFavorite }),
    [favoriteIds, restaurantIds, isFavorite, toggleFavorite, isRestaurantFavorite, toggleRestaurantFavorite])

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)

  if (!context) {
    throw new Error('useFavorites must be used inside a FavoritesProvider')
  }

  return context
}
