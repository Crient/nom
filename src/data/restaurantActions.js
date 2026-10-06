import { phoneUri, safeWebsiteUri } from '../../shared/placeMedia.js'
import { safeMapsUri } from '../../shared/nearbyRestaurants.js'

export function restaurantActionLinks(restaurant) {
  const directions = safeMapsUri(restaurant.directionsUri)
    ?? (restaurant.placeId ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurant.name)}&destination_place_id=${encodeURIComponent(restaurant.placeId)}` : safeMapsUri(restaurant.googleMapsUri))
  return { directions, call: phoneUri(restaurant.nationalPhoneNumber), website: safeWebsiteUri(restaurant.websiteUri) }
}

export function restaurantPriceLabel(level) {
  return ({ PRICE_LEVEL_FREE: 'Free', PRICE_LEVEL_INEXPENSIVE: '$', PRICE_LEVEL_MODERATE: '$$', PRICE_LEVEL_EXPENSIVE: '$$$', PRICE_LEVEL_VERY_EXPENSIVE: '$$$$' })[level] ?? null
}

export async function shareRestaurant({ restaurant, url = globalThis.location?.href,
  navigatorImpl = globalThis.navigator }) {
  const text = `Try ${restaurant.name} with Nom`
  if (navigatorImpl?.share) {
    try { await navigatorImpl.share({ title: restaurant.name, text, url }); return { message: 'Restaurant shared.' } }
    catch (error) { if (error?.name === 'AbortError') return { message: '' } }
  }
  try {
    if (!navigatorImpl?.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigatorImpl.clipboard.writeText(url)
    return { message: 'Restaurant link copied. Paste it into a message to a friend.' }
  } catch { return { message: 'Copy this restaurant link to share it.', manualUrl: url } }
}
