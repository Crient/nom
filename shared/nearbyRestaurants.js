/** Shared, secret-free search rules. Country codes come from Nom's catalog. */
export const CUISINE_LABELS = Object.freeze({
  AE: 'Emirati', AR: 'Argentinian', AT: 'Austrian', BA: 'Bosnian', BR: 'Brazilian',
  CA: 'Canadian', CI: 'Ivorian', CN: 'Chinese', CO: 'Colombian', DE: 'German',
  DZ: 'Algerian', EG: 'Egyptian', ES: 'Spanish', ET: 'Ethiopian', FR: 'French',
  GB: 'British', GH: 'Ghanaian', GR: 'Greek', HU: 'Hungarian', ID: 'Indonesian',
  IN: 'Indian', IR: 'Iranian', IT: 'Italian', JM: 'Jamaican', JO: 'Jordanian',
  JP: 'Japanese', KE: 'Kenyan', KH: 'Cambodian', KR: 'Korean', LB: 'Lebanese',
  LK: 'Sri Lankan', MA: 'Moroccan', MM: 'Burmese', MX: 'Mexican', MY: 'Malaysian',
  NG: 'Nigerian', NP: 'Nepalese', PE: 'Peruvian', PH: 'Filipino', PK: 'Pakistani',
  PL: 'Polish', PR: 'Puerto Rican', PS: 'Palestinian', PT: 'Portuguese', SA: 'Saudi Arabian',
  SG: 'Singaporean', SN: 'Senegalese', SO: 'Somali', SV: 'Salvadoran', TR: 'Turkish',
  UA: 'Ukrainian', UG: 'Ugandan', US: 'American', UY: 'Uruguayan', VE: 'Venezuelan',
  VN: 'Vietnamese', YE: 'Yemeni', ZA: 'South African',
})

export const SEARCH_VERSION = 'places-text-v3'
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000
export const SEARCH_RADIUS_METERS = 50_000
export const MAX_NEARBY_DISTANCE_MILES = 250
export const ENOUGH_RESULTS = 8
export const PAGE_SIZE = 10
export const MAX_RESULTS = 10
export const HOURS_FRESH_MS = 5 * 60 * 1000

// Menu confirmation requires a separate, trustworthy menu evidence source.
export const DISH_MATCH_EVIDENCE = Object.freeze({
  EXACT_SEARCH: 'exact-search-match',
  CUISINE_FALLBACK: 'cuisine-fallback',
  CONFIRMED_MENU: 'confirmed-menu-item',
})

export function textSearchMatchEvidence(matchType) {
  if (matchType === 'exact-dish-search') return DISH_MATCH_EVIDENCE.EXACT_SEARCH
  if (matchType === 'cuisine-fallback') return DISH_MATCH_EVIDENCE.CUISINE_FALLBACK
  return null
}

export function nearbyDistanceBand(distance) {
  if (!Number.isFinite(distance) || distance < 0 || distance > MAX_NEARBY_DISTANCE_MILES) return null
  return distance <= 50 ? 'Nearby' : distance <= 150 ? 'Extended area' : 'Farther away'
}

export function validCoordinates(value) {
  return value && typeof value.latitude === 'number' && Number.isFinite(value.latitude)
    && Math.abs(value.latitude) <= 90 && typeof value.longitude === 'number'
    && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180
}

export function approximateArea(coordinates) {
  if (!validCoordinates(coordinates)) throw new Error('Invalid coordinates')
  return { latitude: Number(coordinates.latitude.toFixed(2)), longitude: Number(coordinates.longitude.toFixed(2)) }
}

export function searchKey(dishId, coordinates) {
  const area = approximateArea(coordinates)
  return `${SEARCH_VERSION}:${dishId}:${area.latitude.toFixed(2)}:${area.longitude.toFixed(2)}`
}

export function queriesForDish(dish) {
  const cuisine = CUISINE_LABELS[dish?.countryCode]
  if (!cuisine || typeof dish?.name !== 'string' || !dish.name.trim() || dish.name.length > 120) throw new Error('Unsupported canonical dish')
  return { cuisine, primary: `${dish.name} ${cuisine} restaurant`, fallback: `${cuisine} restaurant` }
}

export function haversineMiles(from, to) {
  if (!validCoordinates(from) || !validCoordinates(to)) return null
  const radians = value => value * Math.PI / 180
  const latitude = radians(to.latitude - from.latitude), longitude = radians(to.longitude - from.longitude)
  const a = Math.sin(latitude / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitude / 2) ** 2
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)))
}

export function safeMapsUri(value) {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && (
      url.hostname === 'maps.google.com' || url.hostname === 'maps.app.goo.gl'
      || (['google.com', 'www.google.com'].includes(url.hostname) && url.pathname.startsWith('/maps'))
    ) ? url.href : null
  } catch { return null }
}

export function isGoogleRestaurantId(value) {
  return typeof value === 'string' && /^google:[A-Za-z0-9_-]{1,256}$/.test(value)
}

export function mapsUriForPlaceId(id) {
  if (!isGoogleRestaurantId(id)) return null
  return `https://www.google.com/maps/search/?api=1&query=restaurant&query_place_id=${encodeURIComponent(id.slice(7))}`
}

const normalizedVenueText = value => typeof value === 'string' ? value.normalize('NFKD')
  .replace(/\p{M}/gu, '').toLocaleLowerCase('en').replace(/&/g, ' and ')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim() : ''

function venueRichness(venue) {
  let score = venue.metadataOnly ? -100 : 0
  if (typeof venue.name === 'string' && venue.name.trim()) score += 1
  for (const field of ['address', 'rating', 'userRatingCount', 'openNow', 'openingHours', 'websiteUri', 'nationalPhoneNumber']) {
    const value = venue[field]
    if (value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length)) score += 1
  }
  if (venue.photo?.name) score += 3
  return score
}

/** Alias IDs are session metadata only. Persisted favorites remain plain IDs. */
export function restaurantIdentityIds(venue) {
  return [...new Set([venue?.id, ...(Array.isArray(venue?.aliasIds) ? venue.aliasIds.slice(0, PAGE_SIZE * 2) : [])]
    .filter(id => typeof id === 'string' && id && (venue?.source !== 'google-places' || isGoogleRestaurantId(id))))]
}

function preferredVenue(first, second) {
  const richness = venueRichness(second) - venueRichness(first)
  const distance = venue => Number.isFinite(venue.approximateDistanceMiles) ? venue.approximateDistanceMiles
    : Number.isFinite(venue.distance) ? venue.distance : Infinity
  const firstDistance = distance(first), secondDistance = distance(second)
  const exact = venue => venue.matchType === 'exact-dish-search' ? 1 : 0
  const winner = richness > 0 || (!richness && (secondDistance < firstDistance
    || (secondDistance === firstDistance && exact(second) > exact(first)))) ? second : first
  // Identical venue observations may enrich a fallback; retain the honest primary
  // search provenance rather than claiming that a menu item was confirmed.
  const result = { ...winner, aliasIds: [...new Set([...restaurantIdentityIds(first), ...restaurantIdentityIds(second)])] }
  const sameDish = first.dishId === second.dishId
  return sameDish && (exact(first) || exact(second)) ? { ...result, matchType: 'exact-dish-search',
    matchEvidence: winner.matchEvidence === DISH_MATCH_EVIDENCE.CONFIRMED_MENU ? winner.matchEvidence
      : textSearchMatchEvidence('exact-dish-search') } : result
}

/** First collapse Place IDs, then defensively collapse complete name/address
 * identities. Empty addresses and metadata-only placeholders never alias venues.
 * Keep stable input order; callers apply their own distance/rating ordering.
 */
export function dedupeRestaurants(restaurants = []) {
  const byId = new Map(), unidentified = []
  for (const venue of restaurants) {
    if (!venue || typeof venue !== 'object') continue
    const rawId = venue.placeId || venue.id
    const id = typeof rawId === 'string' && rawId.startsWith('google:') ? rawId.slice(7) : rawId
    if (!id) { unidentified.push(venue); continue }
    byId.set(id, byId.has(id) ? preferredVenue(byId.get(id), venue) : venue)
  }
  const result = [], byVenue = new Map()
  for (const venue of [...byId.values(), ...unidentified]) {
    const name = normalizedVenueText(venue.name), address = normalizedVenueText(venue.address)
    const key = !venue.metadataOnly && name && address ? `${name}\n${address}` : null
    if (key && byVenue.has(key)) {
      const index = byVenue.get(key)
      result[index] = preferredVenue(result[index], venue)
    } else {
      if (key) byVenue.set(key, result.length)
      result.push(venue)
    }
  }
  return result
}

export function openingLabel(restaurant, now = Date.now()) {
  if (restaurant.source !== 'google-places') return restaurant.isOpen === true ? 'Open' : restaurant.isOpen === false ? 'Closed' : null
  if (typeof restaurant.openNow !== 'boolean' || !Number.isFinite(restaurant.observedAt)) return null
  const current = now >= restaurant.observedAt && now - restaurant.observedAt < HOURS_FRESH_MS
  return current ? (restaurant.openNow ? 'Open now' : 'Closed') : `Hours at last search: ${restaurant.openNow ? 'open' : 'closed'}`
}
