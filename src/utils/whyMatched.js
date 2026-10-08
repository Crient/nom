import { FOOD_TYPE_LABELS, FLAVOR_LABELS, REGION_CHIP_LABELS } from './sessionChips'

const ADVENTURE_COPY = {
  familiar: 'familiar',
  different: 'slightly different',
  adventurous: 'adventurous',
}

const FLAVOR_FEEL = {
  comforting: 'a cozy, satisfying meal', spicy: 'a little heat in your meal', fresh: 'a lighter, refreshing choice',
  rich: 'a fuller, indulgent meal', crispy: 'a satisfying crunch', tangy: 'a bright, lively flavor profile',
}

function joinReasons(reasons) {
  if (reasons.length < 2) return reasons[0] ?? ''
  if (reasons.length === 2) return reasons.join(' and ')
  return `${reasons.slice(0, -1).join(', ')}, and ${reasons.at(-1)}`
}

/** Explain only actual preference matches; numeric compatibility lives in the badge. */
export function whyMatched(session, result) {
  return explainEvidence(session, result)
}

function explainEvidence(session, result) {
  const { dish, breakdown, matchedAttributes } = result
  const reasons = []

  if (!breakdown.foodType.skipped && breakdown.foodType.matched) {
    reasons.push(`your ${(FOOD_TYPE_LABELS[session.foodType] ?? session.foodType).toLowerCase()} craving`)
  }

  const flavors = breakdown.flavor.skipped ? [] : breakdown.flavor.matched.filter(
    (flavor) => session.flavors.includes(flavor) && matchedAttributes.preferenceFlavors.includes(flavor),
  )

  const adventure = ADVENTURE_COPY[session.adventurousness]
  if (!breakdown.adventure.skipped && breakdown.adventure.distance === 0 && adventure) {
    reasons.push(`your ${adventure} preference`)
  }

  if (!breakdown.region.skipped && breakdown.region.matched) {
    reasons.push(`${REGION_CHIP_LABELS[session.region] ?? session.region} cuisine`)
  }

  if (flavors.length) {
    const profile = joinReasons(flavors.map(flavor => (FLAVOR_LABELS[flavor] ?? flavor).toLowerCase()))
    const feel = FLAVOR_FEEL[flavors[0]] ?? 'the flavor profile you selected'
    return `${dish.name} matches ${profile} flavors for ${feel}. ${reasons.length
      ? `It also fits ${joinReasons(reasons)}.` : 'These are flavors you picked.'}`
  }

  if (reasons.length) {
    return `${dish.name} fits ${joinReasons(reasons)}.`
  }

  if (!breakdown.adventure.skipped && breakdown.adventure.earned > 0) {
    return `${dish.name} offers something a little different to explore. Try changing your choices if you’d like a closer fit.`
  }

  return `${dish.name} is a dish worth discovering. Explore it for something new.`
}
