/**
 * Preference relevance and user-visible compatibility are separate scores.
 *
 * Session shape: { foodType, flavors, adventurousness, region }
 * Open answers are excluded from relevance ranking and fully compatible for
 * display. Completed Surprise sessions use an ephemeral seed to spread ties
 * across countries/adventure levels without changing explicit relevance.
 *
 * Flavor scoring reads dish.preferenceFlavors only. dish.descriptors never
 * earn points.
 */

export const BASE_WEIGHTS = {
  foodType: 35,
  flavor: 30,
  adventure: 20,
  region: 15,
}

export const ADVENTURE_LEVEL = {
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

// Retain the previous relevance rule for Anything sessions only. Explicit
// food-type + region sessions use candidate tiers, not a score threshold.
export const REGION_PRIORITY_MIN_SCORE = 70
export const TOP_MATCH_COUNT = 3

// More Options can relax food type while retaining meaningful regional fit.
// With all dimensions active, region + half the chosen flavors + a one-level
// adventure fit earns 42. Region + adventure alone earns at most 35.
export const MORE_OPTIONS_MIN_SCORE = 40

/** Select the additional seven cards without changing Top Matches or scores.
 * Stable partitioning preserves the engine's score/tie order within each group.
 */
export function selectMoreOptions(session, results) {
  const remaining = results.slice(TOP_MATCH_COUNT)
  if (!session.region || isSurpriseMe(session.region)) return remaining.slice(0, 7)
  const relevant = remaining.filter(result => result.rankingScore >= MORE_OPTIONS_MIN_SCORE)
  // Anything + adventure Surprise Me can leave fewer than seven candidates
  // above the relevance threshold. Keep every relevant result, then fill only
  // the empty slots from the remaining regional/global ranking. Scores stay
  // attached to their original candidates; Top Matches is never changed.
  const fallback = relevant.length < 7
    ? [
      ...remaining.filter(result => result.rankingScore < MORE_OPTIONS_MIN_SCORE && result.dish.region === session.region),
      ...remaining.filter(result => result.rankingScore < MORE_OPTIONS_MIN_SCORE && result.dish.region !== session.region),
    ].slice(0, 7 - relevant.length)
    : []
  const candidates = [...relevant, ...fallback]
  return [
    ...candidates.filter(result => result.dish.region === session.region),
    ...candidates.filter(result => result.dish.region !== session.region),
  ].slice(0, 7)
}

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

function dishPreferenceFlavors(dish) {
  return Array.isArray(dish.preferenceFlavors) ? dish.preferenceFlavors : []
}

function adventureDistance(session, dish) {
  const wanted = ADVENTURE_LEVEL[session.adventurousness]
  if (!wanted || !dish.adventureLevel) return null
  return Math.abs(dish.adventureLevel - wanted)
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

  const preferenceFlavors = dishPreferenceFlavors(dish)
  const perFlavor = wanted.length === 0 ? 0 : available / wanted.length
  const matched = wanted.filter((flavor) => preferenceFlavors.includes(flavor))
  const missed = wanted.filter((flavor) => !preferenceFlavors.includes(flavor))

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
  const rankingScore = DIMENSIONS.reduce((sum, key) => sum + breakdown[key].earned, 0)
  const displayBreakdown = compatibilityBreakdown(session, dish)
  const displayMatchPercent = DIMENSIONS.reduce((sum, key) => sum + displayBreakdown[key].earned, 0)

  return {
    dish,
    rankingScore,
    // Legacy ranking alias retained for callers holding older result fixtures.
    score: rankingScore,
    displayMatchPercent,
    displayBreakdown,
    breakdown,
    matchedAttributes: {
      foodType: foodType.matched && !foodType.skipped,
      preferenceFlavors: flavor.matched,
      adventure: adventure.skipped ? null : adventure.fit,
      region: region.matched && !region.skipped,
    },
  }
}

/** Missing answers are excluded; intentional open answers earn compatibility.
 * Relevance still uses only explicit evidence and preferenceFlavors. */
function compatibilityBreakdown(session, dish) {
  const open = {
    foodType: session.foodType === 'anything',
    adventure: isSurpriseMe(session.adventurousness),
    region: isSurpriseMe(session.region),
  }
  const active = activeDimensions(session)
  const included = DIMENSIONS.filter(key => open[key] || active.includes(key))
  const total = included.reduce((sum, key) => sum + BASE_WEIGHTS[key], 0)
  const weight = key => included.includes(key) ? BASE_WEIGHTS[key] * 100 / total : 0
  const neutral = key => ({ available: weight(key), earned: weight(key), compatible: true, open: true, matched: false, skipped: false })
  return {
    foodType: open.foodType ? neutral('foodType') : scoreFoodType(session, dish, weight('foodType')),
    flavor: scoreFlavor(session, dish, weight('flavor')),
    adventure: open.adventure ? neutral('adventure') : scoreAdventure(session, dish, weight('adventure')),
    region: open.region ? neutral('region') : scoreRegion(session, dish, weight('region')),
  }
}

/** One independent seeded draw per identity: source order cannot dominate ties. */
function seededDraw(seed, id) {
  let hash = 2166136261
  for (const char of `${seed}:${id}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d)
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x846ca68b)
  hash ^= hash >>> 16
  return ((hash >>> 0) + 1) / 4294967297
}

/** Weighted sampling without replacement within relevance tiers. Lower-score
 * candidates never displace better evidence. Both open dimensions jointly
 * penalize repeated countries/levels, rather than overwriting each other. */
function sessionVariation(results, session, seed) {
  const priorities = new Map(results.map(result => [result.dish.id,
    -Math.log(seededDraw(seed, result.dish.id)) / Math.max(1, result.rankingScore) ** 2]))
  const countries = new Map(), levels = new Map(), selected = []
  let start = 0
  while (start < results.length) {
    let end = start + 1
    while (end < results.length && results[end].rankingScore === results[start].rankingScore) end++
    const remaining = results.slice(start, end)
    const cost = result => priorities.get(result.dish.id)
      * (isSurpriseMe(session.region) ? 1 + 3 * (countries.get(result.dish.country) ?? 0) : 1)
      * (isSurpriseMe(session.adventurousness) ? 1 + 3 * (levels.get(result.dish.adventureLevel) ?? 0) : 1)
    while (remaining.length) {
      remaining.sort((a, b) => cost(a) - cost(b) || a.dish.id.localeCompare(b.dish.id))
      const result = remaining.shift()
      selected.push(result)
      countries.set(result.dish.country, (countries.get(result.dish.country) ?? 0) + 1)
      levels.set(result.dish.adventureLevel, (levels.get(result.dish.adventureLevel) ?? 0) + 1)
    }
    start = end
  }
  return selected
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
    if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore
    return compareCatalogOrder(a, b, index)
  })
}

function prioritizeExplicitRegion(results, session) {
  if (!session.region || isSurpriseMe(session.region)) return results
  const regional = results.filter(result => result.dish.region === session.region)
  const selected = session.foodType === 'anything'
    ? regional.filter(result => result.rankingScore >= REGION_PRIORITY_MIN_SCORE).slice(0, TOP_MATCH_COUNT)
    : [
      ...regional.filter(result => result.dish.foodType === session.foodType),
      ...regional.filter(result => result.dish.foodType !== session.foodType),
    ].slice(0, TOP_MATCH_COUNT)
  if (!selected.length) return results
  const ids = new Set(selected.map(result => result.dish.id))
  // Food/region points are constant within each tier, so existing scores order
  // its flavor/adventure fit without changing percentages or tie policies.
  // Only a region with fewer than three dishes uses global Top 3 backfill.
  // The global tail stays intact; selectMoreOptions groups its additional cards.
  return [...selected, ...results.filter(result => !ids.has(result.dish.id))]
}

/**
 * Rank `catalog` for `session` without mutating either.
 */
export function recommend(session, catalog) {
  const weights = normalizeWeights(session)
  const index = catalogIndexMap(catalog)
  const scored = catalog.map((dish) => scoreDish(session, dish, weights))
  const ranked = sortByScore(scored, index)

  const surprise = isSurpriseMe(session.region) || isSurpriseMe(session.adventurousness)
  // Restored answers have no durable seed: a fixed fallback keeps them stable
  // and independent of catalog order until the next completed discovery.
  const varied = surprise
    ? sessionVariation(ranked, session, session.recommendationSeed ?? 'restored-session')
    : ranked
  return prioritizeExplicitRegion(varied, session)
}
