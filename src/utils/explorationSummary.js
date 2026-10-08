import { dishes } from '../data/dishes'

const byId = new Map(dishes.map(dish => [dish.id, dish]))

export function explorationSummary(state, recentDishes) {
  const loggedIds = new Set(state.logs.map(log => log.dishId))
  const explored = new Set([...loggedIds, ...recentDishes.map(item => item.dishId)])
  return { meals: state.logs.length, dishesLogged: loggedIds.size, dishesExplored: explored.size,
    countriesExplored: new Set([...explored].map(id => byId.get(id)?.countryCode).filter(Boolean)).size,
    collectibles: Object.keys(state.unlocks).length,
    unopenedBoxes: Object.values(state.boxes).filter(box => box.status !== 'opened'),
  }
}

export function activityEntries(logs, recentDishes) {
  return [...logs.map(log => ({ id: `meal:${log.id}`, dish: byId.get(log.dishId), date: log.completedAt, kind: 'meal',
    to: `/visits/${log.id}/logged`, label: log.verification.verified ? 'Meal logged · Verified' : 'Meal logged · Unverified' })),
  ...recentDishes.map(item => ({ id: `view:${item.dishId}`, dish: byId.get(item.dishId), date: item.viewedAt, kind: 'view',
    to: `/recommendations/${item.dishId}`, label: 'Dish explored' }))].filter(entry => entry.dish)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id))
}
