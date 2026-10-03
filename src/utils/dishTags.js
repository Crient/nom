import { FOOD_TYPE_LABELS, FLAVOR_LABELS, ADVENTURE_CHIP_LABELS } from './sessionChips'

// Display-only descriptors stay distinct from the six scoring flavors.
export const DESCRIPTOR_LABELS = {
  savory: 'Savory', smoky: 'Smoky', bold: 'Bold', light: 'Light', sweet: 'Sweet',
  umami: 'Umami', aromatic: 'Aromatic', herbal: 'Herbal', creamy: 'Creamy', nutty: 'Nutty',
  charred: 'Charred', fermented: 'Fermented', garlicky: 'Garlicky', buttery: 'Buttery',
  earthy: 'Earthy', chewy: 'Chewy', tender: 'Tender', juicy: 'Juicy',
}

function flavorLabel(id) {
  return FLAVOR_LABELS[id]
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

  add(FOOD_TYPE_LABELS[dish.foodType])

  const preferenceFlavors = dish.preferenceFlavors ?? []
  const matched = matchedPreferenceFlavors.filter((flavor) => preferenceFlavors.includes(flavor))
  const remaining = preferenceFlavors.filter((flavor) => !matched.includes(flavor))

  for (const flavor of [...matched, ...remaining]) {
    add(flavorLabel(flavor))
  }

  for (const descriptor of dish.descriptors ?? []) {
    add(DESCRIPTOR_LABELS[descriptor])
  }

  if (showAdventure && tags.length < limit && !seen.has(ADVENTURE_CHIP_LABELS.adventurous)) {
    tags.push(ADVENTURE_CHIP_LABELS.adventurous)
  }

  return tags
}
