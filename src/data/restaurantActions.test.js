import { describe, expect, it, vi } from 'vitest'
import { restaurantActionLinks, restaurantPriceLabel, shareRestaurant } from './restaurantActions'

const restaurant = { placeId: 'selected-place', name: 'Real venue', directionsUri: 'https://www.google.com/maps/dir/?destination_place_id=selected-place', nationalPhoneNumber: '(617) 555-1234', websiteUri: 'https://restaurant.example' }
describe('selected restaurant actions without Google calls', () => {
  it('uses the returned directions, national phone and website', () => {
    expect(restaurantActionLinks(restaurant)).toEqual({ directions: restaurant.directionsUri, call: 'tel:6175551234', website: 'https://restaurant.example/' })
  })
  it('handles missing/unsafe contact fields and supplies key-free Maps directions', () => {
    const links = restaurantActionLinks({ ...restaurant, directionsUri: 'javascript:alert(1)', nationalPhoneNumber: 'tel:evil', websiteUri: 'https://user:password@example.com' })
    expect(links.call).toBeNull(); expect(links.website).toBeNull()
    expect(new URL(links.directions).searchParams.get('destination_place_id')).toBe(restaurant.placeId)
    expect(links.directions).not.toContain('key=')
    expect(restaurantPriceLabel('PRICE_LEVEL_MODERATE')).toBe('$$'); expect(restaurantPriceLabel(undefined)).toBeNull()
  })
  it('shares an invitation through the native share API', async () => {
    const share = vi.fn().mockResolvedValue()
    expect(await shareRestaurant({ restaurant, url: 'https://nom.example/restaurant', navigatorImpl: { share } })).toEqual({ message: 'Restaurant shared.' })
    expect(share).toHaveBeenCalledWith({ title: 'Real venue', text: 'Try Real venue with Nom', url: 'https://nom.example/restaurant' })
  })
  it('falls back to copying when sharing is unsupported or fails', async () => {
    const writeText = vi.fn().mockResolvedValue()
    await shareRestaurant({ restaurant, url: 'https://nom.example/restaurant', navigatorImpl: { clipboard: { writeText } } })
    expect(writeText).toHaveBeenLastCalledWith('https://nom.example/restaurant')
    await shareRestaurant({ restaurant, url: 'https://nom.example/restaurant', navigatorImpl: { share: vi.fn().mockRejectedValue(new Error('Unavailable')), clipboard: { writeText } } })
    expect(writeText).toHaveBeenLastCalledWith('https://nom.example/restaurant')
  })
  it('offers manual copying and respects native share cancellation', async () => {
    expect(await shareRestaurant({ restaurant, url: 'https://nom.example/restaurant', navigatorImpl: {} })).toMatchObject({ manualUrl: 'https://nom.example/restaurant' })
    const writeText = vi.fn()
    expect(await shareRestaurant({ restaurant, navigatorImpl: { share: vi.fn().mockRejectedValue(Object.assign(new Error(), { name: 'AbortError' })), clipboard: { writeText } } })).toEqual({ message: '' })
    expect(writeText).not.toHaveBeenCalled()
  })
})
