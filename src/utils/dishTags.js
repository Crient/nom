import { FOOD_TYPE_LABELS, FLAVOR_LABELS } from './sessionChips'

function titleCase(value) {
  return String(value)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function flavorLabel(id) {
  return FLAVOR_LABELS[id] ?? titleCase(id)
}

/**
 * Card tags are projected from structured dish fields. Adventure is reserved
 * when adventureLevel is 3 so a useful label is not crowded out by extra
 * descriptors.
 */
export function projectDishTags(dish, { matchedPreferenceFlavors = [], limit = 3 } = {}) {
  const tags = []
  const seen = new Set()
  const showAdventure = dish.adventureLevel === 3
  const fillLimit = showAdventure ? Math.max(limit - 1, 0) : limit

  const add = (label) => {
    if (!label || seen.has(label) || tags.length >= fillLimit) return
    seen.add(label)
    tags.push(label)
  }

  add(FOOD_TYPE_LABELS[dish.foodType] ?? titleCase(dish.foodType))

  const preferenceFlavors = dish.preferenceFlavors ?? []
  const matched = matchedPreferenceFlavors.filter((flavor) => preferenceFlavors.includes(flavor))
  const remaining = preferenceFlavors.filter((flavor) => !matched.includes(flavor))

  for (const flavor of [...matched, ...remaining]) {
    add(flavorLabel(flavor))
  }

  for (const descriptor of dish.descriptors ?? []) {
    add(titleCase(descriptor))
  }

  if (showAdventure && tags.length < limit && !seen.has('Adventure')) {
    tags.push('Adventure')
  }

  return tags
}
