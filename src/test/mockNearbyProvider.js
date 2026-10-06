import { vi } from 'vitest'
import * as provider from '../data/restaurantProvider'
import { mockRestaurantProvider } from '../data/mockRestaurantProvider'
import { mockRestaurants } from '../data/mockRestaurants'
import { restaurantSearchState } from '../data/restaurantSearchState'
import { nearbyRestaurantService } from '../data/nearbyRestaurantService'

/** Explicit injection keeps legacy design/visit fixtures out of live production searches. */
export function installMockNearbyProvider() {
  restaurantSearchState.reset(); nearbyRestaurantService.clear()
  // These legacy design fixtures exercise manual search and visit flows.
  vi.spyOn(restaurantSearchState, 'autoSearch').mockResolvedValue()
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: resolve => resolve({ coords: { latitude: 40, longitude: -75 } }) } })
  vi.spyOn(provider, 'findRestaurantsForDish').mockImplementation(mockRestaurantProvider.findByDish)
  vi.spyOn(provider, 'findRestaurant').mockImplementation(mockRestaurantProvider.getById)
  vi.spyOn(provider, 'findSavedRestaurant').mockImplementation(id => mockRestaurants.find(restaurant => restaurant.id === id) ?? null)
}
