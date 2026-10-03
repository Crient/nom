import { FOOD_TYPE_LABELS, FLAVOR_LABELS, REGION_CHIP_LABELS } from './sessionChips'

const ADVENTURE_COPY = {
  familiar: 'familiar',
  different: 'slightly different',
  adventurous: 'adventurous',
}

function joinReasons(reasons) {
  if (reasons.length < 2) return reasons[0] ?? ''
  if (reasons.length === 2) return reasons.join(' and ')
  return `${reasons.slice(0, -1).join(', ')}, and ${reasons.at(-1)}`
}

/** Explain earned matches only; display descriptors and inactive dimensions never count. */
export function whyMatched(session, result) {
  const { dish, breakdown, matchedAttributes } = result
  const reasons = []

  if (!breakdown.foodType.skipped && breakdown.foodType.matched) {
    reasons.push(`your craving for ${(FOOD_TYPE_LABELS[session.foodType] ?? session.foodType).toLowerCase()}`)
  }

  const flavors = breakdown.flavor.skipped ? [] : breakdown.flavor.matched.filter(
    (flavor) => session.flavors.includes(flavor) && matchedAttributes.preferenceFlavors.includes(flavor),
  )
  if (flavors.length) {
    reasons.push(`${joinReasons(flavors.map((flavor) => (FLAVOR_LABELS[flavor] ?? flavor).toLowerCase()))} flavors`)
  }

  const adventure = ADVENTURE_COPY[session.adventurousness]
  if (!breakdown.adventure.skipped && breakdown.adventure.distance === 0 && adventure) {
    reasons.push(`your ${adventure} preference`)
  }

  if (!breakdown.region.skipped && breakdown.region.matched) {
    reasons.push(`${REGION_CHIP_LABELS[session.region] ?? session.region} cuisine`)
  }

  if (reasons.length) {
    return `${dish.name} matches ${joinReasons(reasons)}.`
  }

  if (!breakdown.adventure.skipped && breakdown.adventure.earned > 0) {
    return `${dish.name}'s adventure level is a partial fit for your ${adventure} preference.`
  }

  return `${dish.name} has no exact matches with the preferences scored in this session.`
}
