/**
 * Deterministic V1 recommendation scorer.
 *
 * Session shape: { foodType, flavors, adventurousness, region }
 * surprise-me is never a numeric match value. It drops that dimension from
 * the score and, after ranking, spreads tied results so they are not all the
 * same country (region Surprise Me) or the same familiarity (adventure
 * Surprise Me).
 */

export const BASE_WEIGHTS = {
  foodType: 35,
  flavor: 30,
  adventure: 20,
  region: 15,
}

export const FAMILIARITY = {
  familiar: 1,
  different: 2,
  adventurous: 3,
}

export const ADVENTURE_FIT = {
  exact: 1,
  oneLevel: 0.6,
  twoLevels: 0.2,
}

export const SURPRISE_ME = 'surprise-me'

const DIMENSIONS = ['foodType', 'flavor', 'adventure', 'region']

export function isSurpriseMe(value) {
  return value === SURPRISE_ME
}

export function activeDimensions(session) {
  const active = []

  if (session.foodType && session.foodType !== 'anything') {
    active.push('foodType')
  }

  if (Array.isArray(session.flavors) && session.flavors.length > 0) {
    active.push('flavor')
  }

  if (session.adventurousness && !isSurpriseMe(session.adventurousness)) {
    active.push('adventure')
  }

  if (session.region && !isSurpriseMe(session.region)) {
    active.push('region')
  }

  return active
}

/**
 * Rescale the base weights of active dimensions so a perfect match is 100.
 */
export function normalizeWeights(session) {
  const active = activeDimensions(session)
  const rawTotal = active.reduce((sum, key) => sum + BASE_WEIGHTS[key], 0)
  const scale = rawTotal === 0 ? 0 : 100 / rawTotal

  const weights = {
    foodType: 0,
    flavor: 0,
    adventure: 0,
    region: 0,
  }

  for (const key of active) {
    weights[key] = BASE_WEIGHTS[key] * scale
  }

  return weights
}

function selectedFlavors(session) {
  return Array.isArray(session.flavors) ? session.flavors : []
}

function adventureDistance(session, dish) {
  const wanted = FAMILIARITY[session.adventurousness]
  if (!wanted || !dish.familiarity) return null
  return Math.abs(dish.familiarity - wanted)
}

function adventureFactor(distance) {
  if (distance === 0) return ADVENTURE_FIT.exact
  if (distance === 1) return ADVENTURE_FIT.oneLevel
  return ADVENTURE_FIT.twoLevels
}

function scoreFoodType(session, dish, available) {
  if (available === 0) {
    return { available: 0, earned: 0, matched: false, skipped: true }
  }

  const matched = dish.foodType === session.foodType
  return { available, earned: matched ? available : 0, matched, skipped: false }
}

function scoreFlavor(session, dish, available) {
  const wanted = selectedFlavors(session)

  if (available === 0) {
    return { available: 0, earned: 0, matched: [], missed: wanted, skipped: true }
  }

  const perFlavor = wanted.length === 0 ? 0 : available / wanted.length
  const matched = wanted.filter((flavor) => dish.flavors.includes(flavor))
  const missed = wanted.filter((flavor) => !dish.flavors.includes(flavor))

  return {
    available,
    earned: perFlavor * matched.length,
    matched,
    missed,
    skipped: false,
  }
}

function scoreAdventure(session, dish, available) {
  if (available === 0) {
    return { available: 0, earned: 0, skipped: true, distance: null, fit: null }
  }

  const distance = adventureDistance(session, dish)
  const fit = adventureFactor(distance)
  return {
    available,
    earned: available * fit,
    skipped: false,
    distance,
    fit,
  }
}

function scoreRegion(session, dish, available) {
  if (available === 0) {
    return { available: 0, earned: 0, matched: false, skipped: true }
  }

  const matched = dish.region === session.region
  return { available, earned: matched ? available : 0, matched, skipped: false }
}

export function scoreDish(session, dish, weights = normalizeWeights(session)) {
  const foodType = scoreFoodType(session, dish, weights.foodType)
  const flavor = scoreFlavor(session, dish, weights.flavor)
  const adventure = scoreAdventure(session, dish, weights.adventure)
  const region = scoreRegion(session, dish, weights.region)

  const breakdown = { foodType, flavor, adventure, region }
  const score = DIMENSIONS.reduce((sum, key) => sum + breakdown[key].earned, 0)

  return {
    dish,
    score,
    breakdown,
    matchedAttributes: {
      foodType: foodType.matched && !foodType.skipped,
      flavors: flavor.matched,
      adventure: adventure.skipped ? null : adventure.fit,
      region: region.matched && !region.skipped,
    },
  }
}

function catalogIndexMap(catalog) {
  const index = new Map()
  catalog.forEach((dish, position) => {
    index.set(dish.id, position)
  })
  return index
}

function compareCatalogOrder(a, b, index) {
  return (index.get(a.dish.id) ?? 0) - (index.get(b.dish.id) ?? 0)
}

function sortByScore(results, index) {
  return [...results].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return compareCatalogOrder(a, b, index)
  })
}

function greedySpread(group, keyFn, index) {
  if (group.length <= 1) return group

  const remaining = [...group]
  const selected = []

  while (remaining.length > 0) {
    const counts = {}
    for (const item of selected) {
      const key = String(keyFn(item))
      counts[key] = (counts[key] || 0) + 1
    }

    remaining.sort((a, b) => {
      const countA = counts[String(keyFn(a))] || 0
      const countB = counts[String(keyFn(b))] || 0
      if (countA !== countB) return countA - countB
      return compareCatalogOrder(a, b, index)
    })

    selected.push(remaining.shift())
  }

  return selected
}

/**
 * Reorder only within equal-score groups. A lower score never jumps a higher
 * one; variety is a tie policy, not a second scorer.
 */
function spreadEqualScores(results, keyFn, index) {
  const groups = []

  for (const item of results) {
    const current = groups[groups.length - 1]
    if (current && current[0].score === item.score) {
      current.push(item)
    } else {
      groups.push([item])
    }
  }

  return groups.flatMap((group) => greedySpread(group, keyFn, index))
}

function applySurprisePolicies(results, session, index) {
  let ranked = results

  if (isSurpriseMe(session.region)) {
    ranked = spreadEqualScores(ranked, (item) => item.dish.country, index)
  }

  if (isSurpriseMe(session.adventurousness)) {
    ranked = spreadEqualScores(ranked, (item) => item.dish.familiarity, index)
  }

  return ranked
}

/**
 * Rank `catalog` for `session` without mutating either.
 */
export function recommend(session, catalog) {
  const weights = normalizeWeights(session)
  const index = catalogIndexMap(catalog)
  const scored = catalog.map((dish) => scoreDish(session, dish, weights))
  const ranked = sortByScore(scored, index)

  return applySurprisePolicies(ranked, session, index)
}
