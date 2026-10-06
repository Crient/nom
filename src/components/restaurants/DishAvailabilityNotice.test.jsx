// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import DishAvailabilityNotice from './DishAvailabilityNotice'
import { restaurantMatchLabel } from './RestaurantFacts'
import { textSearchMatchEvidence, DISH_MATCH_EVIDENCE } from '../../../shared/nearbyRestaurants.js'

const dish = { id: 'lort-cha', name: 'Lort Cha' }
let root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(() => root.unmount()) })
async function render(restaurant = {}, selected = dish) {
  await act(() => root.render(<DishAvailabilityNotice dish={selected} restaurant={restaurant} />))
}

describe('dish availability is advice, never inferred menu confirmation', () => {
  it.each([
    ['exact-dish-search', 'exact-search-match', 'Matched for Lort Cha'],
    ['cuisine-fallback', 'cuisine-fallback', 'Cambodian restaurant nearby'],
  ])('keeps %s unconfirmed with a call-ahead notice', async (matchType, evidence, label) => {
    const restaurant = { source: 'google-places', matchType, cuisine: 'Cambodian' }
    expect(textSearchMatchEvidence(matchType)).toBe(evidence)
    expect(textSearchMatchEvidence(matchType)).not.toBe(DISH_MATCH_EVIDENCE.CONFIRMED_MENU)
    expect(restaurantMatchLabel(restaurant, dish)).toBe(label)
    await render(restaurant)
    expect(document.body.textContent).toContain('Looking for Lort Cha?')
    expect(document.body.textContent).toContain("Dish availability isn't confirmed.")
    expect(document.body.textContent).toContain('We recommend calling ahead before making the trip.')
    expect(document.body.textContent).not.toMatch(/Serves Lort Cha|Lort Cha available here|Get Lort Cha here/)
  })
  it('does not accept a confirmed menu state through Text Search', () => {
    expect(textSearchMatchEvidence('confirmed-menu-item')).toBeNull()
    expect(textSearchMatchEvidence(undefined)).toBeNull()
  })
  it('places a direct Call restaurant action with valid returned phone details', async () => {
    await render({ nationalPhoneNumber: '(617) 555-1234', approximateDistanceMiles: 4 })
    const call = document.querySelector('.restaurant-call-ahead a')
    expect(call.textContent).toBe('Call restaurant')
    expect(call.getAttribute('href')).toBe('tel:6175551234')
    expect(document.body.textContent).not.toContain('before traveling')
  })
  it.each([undefined, '', 'javascript:alert(1)'])('handles absent/invalid phone %s without a broken call action', async phone => {
    await render({ nationalPhoneNumber: phone })
    expect(document.querySelector('.restaurant-call-ahead a')).toBeNull()
    expect(document.body.textContent).toContain('Check the restaurant’s menu or Google Maps listing')
  })
  it('adds measured travel advice for an extended-distance restaurant', async () => {
    await render({ approximateDistanceMiles: 82.8, nationalPhoneNumber: '+1 617 555 1234' })
    expect(document.body.textContent).toContain('This restaurant is ~83 miles away. Call ahead to confirm Lort Cha before traveling.')
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })
  it('does not invent a selected dish when none exists', async () => {
    await render({}, null)
    expect(document.querySelector('aside')).toBeNull()
  })
})
