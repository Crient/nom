import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const FavoritesContext = createContext(null)

/** Favorite dish IDs shared across screens for the current in-memory session. */
export function FavoritesProvider({ children }) {
  const [favoriteIds, setFavoriteIds] = useState([])

  const isFavorite = useCallback((id) => favoriteIds.includes(id), [favoriteIds])
  const toggleFavorite = useCallback((id) => {
    setFavoriteIds((current) =>
      current.includes(id) ? current.filter((favoriteId) => favoriteId !== id) : [...current, id],
    )
  }, [])

  const value = useMemo(() => ({ isFavorite, toggleFavorite }), [isFavorite, toggleFavorite])

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)

  if (!context) {
    throw new Error('useFavorites must be used inside a FavoritesProvider')
  }

  return context
}
