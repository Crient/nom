import records from '../data/catalog/records.json'
import { collectionCountries } from '../data/collectionDefinitions'
import { isGoogleRestaurantId } from '../../shared/nearbyRestaurants.js'

const HUBS = ['/home', '/explore', '/favorites', '/history', '/progress', '/profile', '/friends', '/friends/inbox', '/scan', '/collections', '/image-credits']

/** Internal origins only; no external URLs or arbitrary return routes. */
export function recommendationReturnTo(value, fallback = '/recommendations') {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback
  const path = value.split(/[?#]/)[0]
  return [...HUBS, '/recommendations', '/recommendations/more', '/recommendations/surprise', ...collectionCountries.map(country => `/collections/${country.id}`)].includes(path) ? value : fallback
}

export function discoveryDestination(value) {
  if (typeof value !== 'string') return '/recommendations'
  const match = /^\/recommendations\/([^/?#]+)(?:\/nearby(?:\/([^/?#]+))?)?$/.exec(value)
  if (!match || !records.some(dish => dish.id === match[1])) return '/recommendations'
  if (match[2]) {
    try {
      const restaurantId = decodeURIComponent(match[2])
      if (!/^[a-z0-9-]+$/.test(restaurantId) && !isGoogleRestaurantId(restaurantId)) return '/recommendations'
    } catch { return '/recommendations' }
  }
  return value
}
