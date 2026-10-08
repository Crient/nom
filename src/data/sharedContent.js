import { dishes } from './dishes'
const dishId = /^[a-z0-9-]{1,100}$/
const placeId = /^google:[A-Za-z0-9_-]{1,250}$/
export function normalizeSharedContent(content) {
  if (!content || typeof content !== 'object') return null
  if (['dish', 'recommendation'].includes(content.type) && dishId.test(content.id ?? '')) return { type: content.type, id: content.id }
  if (content.type === 'restaurant' && placeId.test(content.id ?? '') && dishId.test(content.dishId ?? '')) return { type: 'restaurant', id: content.id, dishId: content.dishId }
  return null
}
export function sharedItemDestination(item) {
  const ref = normalizeSharedContent({ type: item?.content_type, id: item?.content_id, dishId: item?.dish_id })
  if (!ref || !dishes.some(dish => dish.id === (ref.dishId ?? ref.id))) return null
  // Shared references never replay somebody else's preferences, match score or rewards.
  return ref.type === 'restaurant' ? `/recommendations/${ref.dishId}/nearby/${encodeURIComponent(ref.id)}?shared=1`
    : `/recommendations/${ref.id}?shared=1`
}
export function sharedItemTitle(item) {
  if (item.content_type === 'restaurant') return 'Restaurant on Google Maps'
  return dishes.find(dish => dish.id === item.content_id)?.name ?? 'Unavailable dish'
}
export const isSharedContext = search => new URLSearchParams(search).get('shared') === '1'
export const sharedContextQuery = '?shared=1'
