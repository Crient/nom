import { dishes } from '../data/dishes'

const normalize = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase()

/** Catalog browsing/search is separate from recommendation ranking and scoring. */
export function searchDishes(query, foodType = null) {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean)
  return dishes.filter(dish => (!foodType || dish.foodType === foodType) && words.every(word =>
    normalize([dish.id, dish.name, dish.country, ...dish.aliases, ...dish.preferenceFlavors, ...dish.descriptors, dish.shortDescription].join(' ')).includes(word)))
}

export function localMealTrends(logs) {
  const counts = new Map()
  for (const log of logs) counts.set(log.dishId, (counts.get(log.dishId) ?? 0) + 1)
  return dishes.filter(dish => counts.has(dish.id)).sort((a, b) => counts.get(b.id) - counts.get(a.id))
}

export function dishFromCode(value, origin) {
  let id = value.trim()
  if (!dishes.some(dish => dish.id === id)) {
    try {
      const url = new URL(id, origin)
      const path = url.protocol === 'nom:' && url.hostname === 'dish' ? url.pathname : url.origin === origin && url.pathname.startsWith('/recommendations/') ? url.pathname.slice('/recommendations'.length) : ''
      if (!/^\/[a-z0-9-]+$/.test(path)) return null
      id = path.slice(1)
    } catch { return null }
  }
  return dishes.find(dish => dish.id === id) ?? null
}
