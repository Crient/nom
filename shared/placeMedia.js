import { safeMapsUri } from './nearbyRestaurants.js'

export const MEDIA_SESSION_TTL_MS = 10 * 60 * 1000
export const PHOTO_WIDTH_PX = 800
export const MAX_REVIEWS = 3
export const validPlaceId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,256}$/.test(value)
export const validPhotoName = value => typeof value === 'string' && /^places\/[A-Za-z0-9_-]{1,256}\/photos\/[A-Za-z0-9_-]{1,2000}$/.test(value)

export function safeWebsiteUri(value) {
  if (typeof value !== 'string' || value.length > 2048) return null
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null } catch { return null }
}

export function phoneUri(value) {
  if (typeof value !== 'string') return null
  const match = value.match(/^(\+?[0-9 ().-]{3,40})(?:\s*(?:ext\.?|x)\s*([0-9]{1,8}))?$/i)
  if (!match) return null
  const digits = match[1].replace(/[^0-9]/g, '')
  return digits.length >= 5 && digits.length <= 15 ? `tel:${match[1].startsWith('+') ? '+' : ''}${digits}${match[2] ? `;ext=${match[2]}` : ''}` : null
}

export function safeHttpsUri(value) {
  if (typeof value !== 'string' || value.length > 4096) return null
  try {
    const url = new URL(value.startsWith('//') ? `https:${value}` : value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export function safePhotoUri(value) {
  const uri = safeHttpsUri(value)
  if (!uri) return null
  const url = new URL(uri)
  return (url.hostname.endsWith('.googleusercontent.com') || url.hostname.endsWith('.ggpht.com'))
    && !url.searchParams.has('key') && !url.searchParams.has('api_key') ? uri : null
}

export function normalizePhoto(photo, placeId, observedAt) {
  if (!validPhotoName(photo?.name) || !photo.name.startsWith(`places/${placeId}/photos/`)
      || !Array.isArray(photo.authorAttributions) || photo.authorAttributions.length > 10) return null
  const authors = []
  for (const author of photo.authorAttributions) {
    const uri = safeHttpsUri(author?.uri)
    if (typeof author?.displayName !== 'string' || !author.displayName.trim() || !uri) return null
    authors.push({ displayName: author.displayName, uri, photoUri: safePhotoUri(author.photoUri) })
  }
  const googleMapsUri = safeMapsUri(photo.googleMapsUri)
  // Current policy requires a direct link to the individual source photo.
  if (!googleMapsUri) return null
  return { name: photo.name, authorAttributions: authors, googleMapsUri, observedAt }
}
