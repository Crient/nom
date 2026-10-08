import { validPlaceId } from '../shared/placeMedia.js'
import { validCoordinates } from '../shared/nearbyRestaurants.js'

export async function getVerificationRestaurant(restaurantId, apiKey, fetchImpl = globalThis.fetch) {
  const placeId = typeof restaurantId === 'string' && restaurantId.startsWith('google:') ? restaurantId.slice(7) : null
  if (!validPlaceId(placeId) || !apiKey) throw new Error('Restaurant unavailable')
  const response = await fetchImpl(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
    headers:{'X-Goog-Api-Key':apiKey,'X-Goog-FieldMask':'id,displayName,formattedAddress,location,businessStatus,types'},
    redirect:'error',signal:AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error('Restaurant unavailable')
  const value = await response.json(), location = { latitude:value.location?.latitude,longitude:value.location?.longitude }
  if (value.id !== placeId || !validCoordinates(location) || value.businessStatus !== 'OPERATIONAL'
    || !(value.types ?? []).some(t=>['restaurant','cafe','bakery','food','meal_takeaway'].includes(t))) throw new Error('Restaurant unavailable')
  return { id:restaurantId,name:value.displayName?.text ?? '',address:value.formattedAddress ?? '',...location }
}
