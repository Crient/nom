import storefront from '../assets/experience/storefront.webp'
import { dishes } from './dishes'
import { CAMBODIAN_MENU_IDS } from './mockRestaurantMenus'

/** Figma menu previews only. Not claims of live menu availability. */
export const restaurantDetails = {
  'preview-thmor-da': {
    image: storefront,
    imageCrop: true,
    about: 'Small, no-frills outfit serving homestyle Cambodian favorites like salads, soup & seafood.',
  },
}

export function restaurantPresentation(restaurant, dish) {
  const presentation = restaurantDetails[restaurant.id] ?? { image: restaurant.image,
    about: `A development restaurant preview in ${restaurant.address} serving ${restaurant.cuisine} food.`,
  }
  const ids = [dish.id, ...CAMBODIAN_MENU_IDS.filter(id => id !== dish.id)].slice(0, 3)
  return { ...presentation, menu: ids.map(id => dishes.find(item => item.id === id)).filter(Boolean)
    .map(item => ({ name: item.name, dishId: item.id, image: item.image })) }
}
