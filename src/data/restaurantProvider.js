import { mockRestaurants } from './mockRestaurants'
import { restaurantServesDish } from './mockRestaurantMenus'

/** Provider contract: findByDish({ dishId, signal }) -> Promise<{ restaurants,
 * source, notice }>. A live implementation can map its response to these fields
 * without coupling the page to an API SDK, key, or transport.
 */
export const mockRestaurantProvider = {
  async getById({ restaurantId, dishId, signal }) {
    signal?.throwIfAborted()
    const restaurant = mockRestaurants.find(item => item.id === restaurantId && restaurantServesDish(item, dishId)) ?? null
    return { restaurant: restaurant ? { ...restaurant, dishId } : null, source: 'mock' }
  },
  async findByDish({ dishId, signal }) {
    signal?.throwIfAborted()
    return {
      restaurants: mockRestaurants.filter(restaurant => restaurantServesDish(restaurant, dishId)).map(restaurant => ({ ...restaurant, dishId })),
      source: 'mock',
      notice: 'Development preview. Menus, distances, ratings, and opening hours are examples.',
    }
  },
}

export function findRestaurant(request) {
  return mockRestaurantProvider.getById(request)
}

export function findRestaurantsForDish(request) {
  return mockRestaurantProvider.findByDish(request)
}

/** Restaurant display controls only; never sort or score dish recommendations. */
export function selectRestaurants(restaurants, { sort = 'closest', rating = 0, price = 0, openOnly = false } = {}) {
  return restaurants.filter(restaurant =>
    restaurant.rating >= rating && (!price || restaurant.priceLevel === price) && (!openOnly || restaurant.isOpen),
  ).sort((a, b) => sort === 'rating' ? b.rating - a.rating : a.distance - b.distance)
}
