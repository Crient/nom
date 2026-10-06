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

/** Explain explicit evidence and any neutral compatibility separately.
 * Display descriptors never earn preference evidence. */
export function whyMatched(session, result) {
  const evidence = explainEvidence(session, result)
  const display = result.displayBreakdown
  const open = ['foodType', 'adventure', 'region'].filter(key => display?.[key].open)
  if (!open.length) return evidence
  const names = { foodType: 'food type', adventure: 'adventure level', region: 'region' }
  const points = value => Number(value.toFixed(2))
  const compatible = open.reduce((sum, key) => sum + display[key].earned, 0)
  const explicit = Object.values(display).filter(part => !part.open).reduce((sum, part) => sum + part.earned, 0)
  return `${evidence} You're open to any ${joinReasons(open.map(key => names[key]))}: ${points(compatible)} compatible points plus ${points(explicit)} explicit-preference points give ${Math.round(result.displayMatchPercent)}% compatibility (rounded).`
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
      ? `It also fits ${joinReasons(reasons)}.` : `Your ${flavors.map(flavor => FLAVOR_LABELS[flavor] ?? flavor).join(' + ')} ${flavors.length === 1 ? 'choice contributes' : 'choices contribute'} to this match.`}`
  }

  if (reasons.length) {
    return `${dish.name} fits ${joinReasons(reasons)}. A meal choice shaped by the preferences you selected.`
  }

  if (!breakdown.adventure.skipped && breakdown.adventure.earned > 0) {
    return `${dish.name}'s adventure level is a partial fit for your ${adventure} preference. Consider it an exploration option, or adjust your tags for a closer fit.`
  }

  return `${dish.name} has no exact matches with the preferences scored in this session. Adjust your tags for a closer fit, or explore this dish for something new.`
}
