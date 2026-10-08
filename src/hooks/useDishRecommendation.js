import { useLocation } from 'react-router-dom'
import { useRecommendations } from './useRecommendations'
import { randomSurpriseResults, isRandomSurprise } from '../utils/surpriseStrategy'
import { dishes } from '../data/dishes'
import { isSharedContext } from '../data/sharedContent'

export function useDishRecommendation(dishId) {
  const recommendations = useRecommendations(), location = useLocation()
  const surprise = isRandomSurprise(location.search)
  const shared = isSharedContext(location.search)
  if (shared) {
    const dish = dishes.find(item => item.id === dishId)
    return { ...recommendations, results: dish ? [{ dish, selectionStrategy: 'sharedV1' }] : [], shared: true, surprise: false, chips: [], ready: true }
  }
  const results = surprise ? randomSurpriseResults : recommendations.results
  return { ...recommendations, results, surprise, chips: surprise ? [] : recommendations.chips,
    ready: surprise ? results.some(result => result.dish.id === dishId) : recommendations.ready }
}
