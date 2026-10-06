import records from '../data/catalog/records.json'
import { collectionCountries } from '../data/collectionDefinitions'

const HUBS = ['/home', '/explore', '/favorites', '/history', '/progress', '/profile', '/scan', '/collections', '/image-credits']

/** Internal origins only; no external URLs or arbitrary return routes. */
export function recommendationReturnTo(value, fallback = '/recommendations') {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback
  const path = value.split(/[?#]/)[0]
  return [...HUBS, '/recommendations', '/recommendations/more', '/recommendations/surprise', ...collectionCountries.map(country => `/collections/${country.id}`)].includes(path) ? value : fallback
}

export function discoveryDestination(value) {
  if (typeof value !== 'string') return '/recommendations'
  const match = /^\/recommendations\/([^/?#]+)(?:\/nearby(?:\/([a-z0-9-]+))?)?$/.exec(value)
  return match && records.some(dish => dish.id === match[1]) ? value : '/recommendations'
}
