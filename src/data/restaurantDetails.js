import storefront from '../assets/experience/storefront.webp'
import { dishes } from './dishes'
import { CUISINE_LABELS } from '../../shared/nearbyRestaurants.js'

/** Figma menu previews only. Not claims of live menu availability. */
export const restaurantDetails = {
  'preview-thmor-da': {
    image: storefront,
    imageCrop: true,
    about: 'Small, no-frills outfit serving homestyle Cambodian favorites like salads, soup & seafood.',
  },
}

export function restaurantPresentation(restaurant, dish) {
  if (restaurant.source === 'google-places') return { image: dish.image, imageCrop: false, menu: [],
    about: 'Nearby search result. Dish availability has not been verified.' }
  const presentation = restaurantDetails[restaurant.id] ?? { image: restaurant.image,
    about: `A development restaurant preview in ${restaurant.address} serving ${restaurant.cuisine} food.`,
  }
  const ids = [dish.id, ...dishes.filter(item => item.countryCode === dish.countryCode && item.id !== dish.id).map(item => item.id)].slice(0, 3)
  return { ...presentation, cuisine: CUISINE_LABELS[dish.countryCode], menu: ids.map(id => dishes.find(item => item.id === id)).filter(Boolean)
    .map(item => ({ name: item.name, dishId: item.id, image: item.image })) }
}
