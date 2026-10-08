import { dishes } from '../data/dishes'
import { useExperience } from '../context/Experience'
import { useRestaurant } from './useRestaurant'

export function useVisit(visitId) {
  const { state } = useExperience()
  const log = state.logs.find(item => item.id === visitId)
  const visit = log ?? state.drafts[visitId]
  const dish = dishes.find(item => item.id === visit?.dishId)
  const data = useRestaurant(dish?.id, visit?.restaurantId)
  // Fresh provider/session details win; a recovered name is display context only.
  const restaurant = data.restaurant?.metadataOnly && visit?.restaurantName
    ? { ...data.restaurant, name: visit.restaurantName } : data.restaurant
  return { visit, log, dish, ...data, restaurant }
}
