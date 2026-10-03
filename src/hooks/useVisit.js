import { dishes } from '../data/dishes'
import { useExperience } from '../context/Experience'
import { useRestaurant } from './useRestaurant'

export function useVisit(visitId) {
  const { state } = useExperience()
  const log = state.logs.find(item => item.id === visitId)
  const visit = log ?? state.drafts[visitId]
  const dish = dishes.find(item => item.id === visit?.dishId)
  const data = useRestaurant(dish?.id, visit?.restaurantId)
  return { visit, log, dish, ...data }
}
