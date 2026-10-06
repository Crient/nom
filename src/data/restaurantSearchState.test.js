import { describe, expect, it, vi } from 'vitest'
import { createRestaurantSearchState } from './restaurantSearchState'

const result = { source: 'google-places', restaurants: [], searchedAt: 1_790_000_000_000, apiCalls: 1 }
function fixture(options = {}) {
  const provider = vi.fn().mockResolvedValue(result), locate = vi.fn().mockResolvedValue({ latitude: 40, longitude: -75 })
  return { provider, locate, state: createRestaurantSearchState({ provider, locate, getCached: () => null, now: () => result.searchedAt, ...options }) }
}
const permissions = state => ({ query: vi.fn().mockResolvedValue({ state }) })
describe('opened-dish automatic nearby search', () => {
  it('deduplicates injected and cached results before publishing either surface', async () => {
    const venue = { id: 'google:a', placeId: 'a', name: 'Cafe Nom', address: '10 Main St', approximateDistanceMiles: 1 }
    const alias = { ...venue, id: 'google:b', placeId: 'b', name: 'CAFE NOM', rating: 4.5 }
    const data = { ...result, restaurants: [venue, venue, alias] }
    const cached = fixture({ getCached: () => data })
    expect(cached.state.getSnapshot('lort-cha').restaurants).toHaveLength(1)
    const live = fixture(); live.provider.mockResolvedValue(data)
    await live.state.search('lort-cha')
    expect(live.state.getSnapshot('lort-cha').restaurants).toHaveLength(1)
    expect(live.state.getSnapshot('lort-cha').restaurants[0].rating).toBe(4.5)
    expect(live.provider).toHaveBeenCalledTimes(1)
  })
  it('searches once after an existing grant and reuses results on rerender/back', async () => {
    const f = fixture(), permission = permissions('granted')
    await f.state.autoSearch('lort-cha', { permissions: permission })
    await f.state.autoSearch('lort-cha', { permissions: permission }); await f.state.autoSearch('lort-cha', { permissions: permission })
    expect(f.provider).toHaveBeenCalledTimes(1); expect(f.locate).toHaveBeenCalledTimes(1)
    expect(permission.query).toHaveBeenCalledTimes(1)
  })
  it('uses a valid cache without location acquisition, permission query or API calls', async () => {
    const f = fixture({ getCached: () => result }), permission = permissions('granted')
    await f.state.autoSearch('lort-cha', { permissions: permission })
    expect(f.state.getSnapshot('lort-cha').status).toBe('ready')
    expect(f.provider).not.toHaveBeenCalled(); expect(f.locate).not.toHaveBeenCalled(); expect(permission.query).not.toHaveBeenCalled()
  })
  it('keeps ungranted permission deliberate and publishes denied state without a search', async () => {
    const f = fixture()
    await f.state.autoSearch('lort-cha', { permissions: permissions('prompt') })
    expect(f.state.getSnapshot('lort-cha').status).toBe('idle'); expect(f.provider).not.toHaveBeenCalled()
    await f.state.autoSearch('lort-cha', { permissions: permissions('denied') })
    expect(f.state.getSnapshot('lort-cha')).toMatchObject({ errorCode: 'LOCATION_DENIED', locationStatus: 'denied' }); expect(f.locate).not.toHaveBeenCalled()
  })
  it('deduplicates concurrent granted checks and never automatically retries a failed search', async () => {
    const f = fixture(), permission = permissions('granted')
    f.provider.mockRejectedValue(Object.assign(new Error('QUOTA_LIMIT'), { code: 'QUOTA_LIMIT' }))
    await Promise.all([f.state.autoSearch('lort-cha', { permissions: permission }), f.state.autoSearch('lort-cha', { permissions: permission })])
    await f.state.autoSearch('lort-cha', { permissions: permission })
    expect(f.provider).toHaveBeenCalledTimes(1); expect(f.state.getSnapshot('lort-cha').errorCode).toBe('QUOTA_LIMIT')
  })
  it('does not search a dish abandoned while permission is being checked', async () => {
    const f = fixture(), controller = new AbortController()
    let resolve
    const pending = f.state.autoSearch('lort-cha', { signal: controller.signal, permissions: { query: () => new Promise(complete => { resolve = complete }) } })
    controller.abort(); resolve({ state: 'granted' }); await pending
    expect(f.locate).not.toHaveBeenCalled(); expect(f.provider).not.toHaveBeenCalled()
  })
  it('remembers a successful session grant when the Permissions API is unavailable', async () => {
    const f = fixture()
    await f.state.autoSearch('lort-cha', { permissions: {} }); expect(f.provider).not.toHaveBeenCalled()
    await f.state.search('lort-cha')
    await f.state.autoSearch('ramen', { permissions: {} })
    expect(f.provider.mock.calls.map(([request]) => request.dishId)).toEqual(['lort-cha', 'ramen'])
    f.state.reset(); await f.state.autoSearch('ramen', { permissions: {} }); expect(f.provider).toHaveBeenCalledTimes(2)
  })
})

describe('cached restaurant location revalidation', () => {
  const originalArea = { latitude: 42.36, longitude: -71.06 }
  const cached = { ...result, searchArea: originalArea, restaurants: [
    { id: 'google:boston', name: 'Boston place', latitude: 42.37, longitude: -71.06, approximateDistanceMiles: 0.69 },
  ] }
  it('renders cached text immediately and recalculates without another Places request', async () => {
    const f = fixture({ getCached: () => cached })
    f.locate.mockResolvedValue({ latitude: 42.38, longitude: -71.06 })
    const pending = f.state.revalidateCached('lort-cha', { permissions: permissions('granted') })
    expect(f.state.getSnapshot('lort-cha')).toMatchObject({ status: 'ready', revalidatingLocation: true, restaurants: [{ name: 'Boston place' }] })
    await pending
    expect(f.state.getSnapshot('lort-cha')).toMatchObject({ status: 'ready', apiCalls: 0, previousSearchArea: true })
    expect(f.state.getSnapshot('lort-cha').restaurants[0].approximateDistanceMiles).toBeCloseTo(0.69, 1)
    expect(f.provider).not.toHaveBeenCalled()
  })
  it('removes distant cached matches after relocation and restores them on returning to the original area', async () => {
    const f = fixture({ getCached: () => cached })
    f.locate.mockResolvedValueOnce({ latitude: 34.05, longitude: -118.24 }).mockResolvedValueOnce(originalArea)
    await f.state.revalidateCached('lort-cha', { permissions: permissions('granted') })
    expect(f.state.getSnapshot('lort-cha')).toMatchObject({ restaurants: [], previousSearchArea: true })
    expect(f.state.getSnapshot('lort-cha').locationNotice).toContain('previous search area')
    await f.state.revalidateCached('lort-cha', { permissions: permissions('granted') })
    expect(f.state.getSnapshot('lort-cha')).toMatchObject({ restaurants: [{ name: 'Boston place' }], previousSearchArea: false, locationNotice: null })
    expect(f.provider).not.toHaveBeenCalled()
  })
  it('does not prompt for location when permission is ungranted', async () => {
    const f = fixture({ getCached: () => cached })
    await f.state.revalidateCached('lort-cha', { permissions: permissions('prompt') })
    expect(f.state.getSnapshot('lort-cha').locationNotice).toContain('last search location')
    expect(f.locate).not.toHaveBeenCalled(); expect(f.provider).not.toHaveBeenCalled()
  })
  it('deduplicates concurrent cached checks', async () => {
    const f = fixture({ getCached: () => cached })
    f.locate.mockResolvedValue(originalArea)
    await Promise.all([f.state.revalidateCached('lort-cha', { permissions: permissions('granted') }),
      f.state.revalidateCached('lort-cha', { permissions: permissions('granted') })])
    expect(f.locate).toHaveBeenCalledTimes(1); expect(f.provider).not.toHaveBeenCalled()
  })
  it('does not let an older location check overwrite an explicit refresh', async () => {
    const f = fixture({ getCached: () => cached })
    let finishOldLocation
    f.locate.mockImplementationOnce(() => new Promise(resolve => { finishOldLocation = resolve }))
      .mockResolvedValueOnce({ latitude: 34.05, longitude: -118.24 })
    const pending = f.state.revalidateCached('lort-cha', { permissions: permissions('granted') })
    await Promise.resolve()
    f.provider.mockResolvedValue({ ...result, restaurants: [{ id: 'google:la', name: 'LA place', latitude: 34.05, longitude: -118.24, approximateDistanceMiles: 0 }] })
    await f.state.search('lort-cha', { refresh: true })
    finishOldLocation(originalArea); await pending
    expect(f.state.getSnapshot('lort-cha').restaurants[0].name).toBe('LA place')
    expect(f.provider).toHaveBeenCalledTimes(1)
  })
  it('keeps text and labels the old distances when current location fails', async () => {
    const f = fixture({ getCached: () => cached })
    f.locate.mockRejectedValue(new Error('Location unavailable'))
    await f.state.revalidateCached('lort-cha', { permissions: permissions('granted') })
    expect(f.state.getSnapshot('lort-cha')).toMatchObject({ status: 'ready', revalidatingLocation: false, restaurants: [{ name: 'Boston place' }] })
    expect(f.state.getSnapshot('lort-cha').locationNotice).toContain('could not be checked')
    expect(f.provider).not.toHaveBeenCalled()
  })
})
