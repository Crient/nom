import { nearbyRestaurantService } from './nearbyRestaurantService'
import { mockRestaurants } from './mockRestaurants'
import { dedupeRestaurants, HOURS_FRESH_MS, isGoogleRestaurantId, mapsUriForPlaceId, restaurantIdentityIds } from '../../shared/nearbyRestaurants.js'
export { mockRestaurantProvider } from './mockRestaurantProvider'

/** Provider contract: findByDish({ dishId, coordinates, signal, refresh }) ->
 * Promise<{ restaurants, source, apiCalls, searchedAt }>. Production uses the
 * same-origin endpoint; mocks must be explicitly injected by tests.
 */
export function findRestaurant(request) {
  request.signal?.throwIfAborted()
  const restaurant = nearbyRestaurantService.getById(request)
    ?? (isGoogleRestaurantId(request.restaurantId) ? savedPlace(request.restaurantId, request.dishId) : null)
  return Promise.resolve({ restaurant, source: 'google-places' })
}

export function findRestaurantsForDish(request) {
  return nearbyRestaurantService.findByDish(request)
}

/** A collapsed venue remains saved when any known session alias was saved.
 * Removing the visible venue removes all currently saved aliases using the
 * existing ID-only domain operations; saving records only the chosen Place ID.
 */
export function restaurantFavoriteActions(restaurant, { isRestaurantFavorite, toggleRestaurantFavorite }) {
  const savedIds = restaurantIdentityIds(restaurant).filter(isRestaurantFavorite)
  return { liked: savedIds.length > 0, toggle: () => {
    for (const id of savedIds.length ? savedIds : [restaurant.id]) toggleRestaurantFavorite(id)
  } }
}

export function findSavedRestaurant(restaurantId) {
  const existing = nearbyRestaurantService.getById({ restaurantId })
  if (existing) return existing
  const legacy = mockRestaurants.find(place => place.id === restaurantId)
  if (legacy) return { id: restaurantId, name: legacy.name, source: 'legacy-preview',
    metadataOnly: true, attributions: [] }
  // Favorites persist permitted Place IDs even after venue coordinates expire.
  return isGoogleRestaurantId(restaurantId) ? savedPlace(restaurantId) : null
}

function savedPlace(restaurantId, dishId) {
  return { id: restaurantId, placeId: restaurantId.slice(7), dishId, name: 'Saved restaurant',
    source: 'google-places', metadataOnly: true, address: '', rating: null, userRatingCount: null,
    openNow: null, googleMapsUri: mapsUriForPlaceId(restaurantId), attributions: [] }
}

/** Restaurant display controls only; never sort or score dish recommendations. */
export function selectRestaurants(restaurants, { sort = 'closest', rating = 0, price = 0, openOnly = false } = {}) {
  return dedupeRestaurants(restaurants).filter(restaurant =>
    (!rating || (typeof restaurant.rating === 'number' && restaurant.rating >= rating))
    && (!price || restaurant.priceLevel === price)
    && (!openOnly || (restaurant.source === 'google-places'
      ? restaurant.openNow === true && Date.now() >= restaurant.observedAt && Date.now() - restaurant.observedAt < HOURS_FRESH_MS
      : restaurant.isOpen === true)),
  ).sort((a, b) => {
    const distance = (a.approximateDistanceMiles ?? a.distance ?? Infinity) - (b.approximateDistanceMiles ?? b.distance ?? Infinity)
    if (sort === 'rating' || sort === 'rating-ascending') {
      const aKnown = Number.isFinite(a.rating), bKnown = Number.isFinite(b.rating)
      if (aKnown !== bKnown) return aKnown ? -1 : 1
      if (aKnown && a.rating !== b.rating) return sort === 'rating' ? b.rating - a.rating : a.rating - b.rating
    }
    return distance || 0
  })
}
