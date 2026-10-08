// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createJourneyStore, normalizeAccountCache } from './syncEngine'
import { createCloudRepository } from './cloudRepository'
import { defaultJourney, cloudRowsToJourney, journeyMutations, mealToRow, mergeJourneys, TABLES } from './cloudState'
import { identityCacheKey, meaningfulGuestData, migrateLegacyGuestStorage, readGuestJourney, clearAccountCache } from './identityStorage'
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS, readLocalState, writeLocalState } from './localPersistence'
import { normalizeExperience, serializeExperience } from './persistedState'
import { experienceReducer } from './experienceState'
import { mockSupabase, USER_A, USER_B, meal, at } from '../test/accountFixtures'

const stores = []
const account = (sdk, user = USER_A, options = {}) => {
  const store = createJourneyStore({ user, repository: createCloudRepository(sdk, user.id), ...options }); stores.push(store); return store
}
afterEach(() => { stores.forEach(store => store.stop()); stores.length = 0; vi.restoreAllMocks() })
const favorite = (store, id = 'nasi-goreng') => store.update('favorites', current => ({ ...current, dishIds: current.dishIds.includes(id) ? current.dishIds.filter(item => item !== id) : [...current.dishIds, id] }))
function guestEvents() {
  const data = defaultJourney()
  data.activity = { displayName: 'Leng', recentDishes: [{ dishId: 'num-banh-chok', viewedAt: at }] }
  data.favorites = { dishIds: ['num-banh-chok'], restaurantIds: ['google:nom-test-place'] }
  data.experience = normalizeExperience({ logs: [meal('prelude-one','2026-10-04'),meal('prelude-two','2026-10-05'),meal()], openedBoxes: [], favorites: [] })
  const id = 'box-visit-one'
  data.experience = experienceReducer(data.experience, { type: 'begin-box', id })
  data.experience = experienceReducer(data.experience, { type: 'open-box', id, at })
  data.experience = experienceReducer(data.experience, { type: 'favorite', key: 'cambodia:ziggy' })
  return data
}
function saveGuest(data) {
  for (const [section, value] of Object.entries(data)) writeLocalState(STORAGE_KEYS[section], section === 'experience' ? serializeExperience(value) : value)
}

describe('identity-scoped caches and legacy Guest migration', () => {
  it('copies old bytes once, retains originals, and never overwrites a newer Guest scope', () => {
    writeLocalState(LEGACY_STORAGE_KEYS.activity, { displayName: 'Leng', recentDishes: [] })
    const raw = localStorage.getItem(LEGACY_STORAGE_KEYS.activity)
    expect(migrateLegacyGuestStorage()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.activity)).toBe(raw)
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.activity)).toBe(raw)
    writeLocalState(STORAGE_KEYS.activity, { displayName: 'New name', recentDishes: [] })
    migrateLegacyGuestStorage(); expect(readGuestJourney().activity.displayName).toBe('New name')
  })
  it('ignores neutral names, Discovery answers, and demo counters/unlocks as Guest activity', () => {
    const data = defaultJourney(); data.discovery.flavors = ['spicy']
    expect(meaningfulGuestData(data)).toBe(false)
    data.activity.displayName = 'Leng'; expect(meaningfulGuestData(data)).toBe(true)
  })
  it('restores G → A → G → B → G without sharing favorites or pending writes', async () => {
    const guest = createJourneyStore(); stores.push(guest); favorite(guest, 'num-banh-chok'); guest.stop()
    const sdk = mockSupabase(USER_A), a = account(sdk, USER_A, { online: () => false }); favorite(a)
    const aKey = localStorage.getItem(identityCacheKey(USER_A.id)); a.stop(); sdk.emit(null)
    expect(createJourneyStore().getSnapshot().data.favorites.dishIds).toEqual(['num-banh-chok'])
    sdk.emit(USER_B); const b = account(sdk, USER_B, { online: () => false }); favorite(b, 'lort-cha')
    expect(b.getSnapshot().data.favorites.dishIds).toEqual(['lort-cha'])
    b.stop(); sdk.emit(null)
    expect(createJourneyStore().getSnapshot().data.favorites.dishIds).toEqual(['num-banh-chok'])
    expect(localStorage.getItem(identityCacheKey(USER_A.id))).toBe(aKey)
    expect(sdk.writes).toEqual([])
  })
  it('backs up corrupt cached operations and rejects extra payload fields and malformed event IDs', () => {
    const key = identityCacheKey(USER_A.id), base = { data: { ...defaultJourney(), experience: serializeExperience(defaultJourney().experience) }, outbox: [
      { id: 'bad-one', kind: 'meal', target: 'x', payload: { id: 123 } },
      { id: 'bad-two', kind: 'dishFavorite', target: 'nasi-goreng', payload: { dish_id: 'nasi-goreng', is_active: true, user_id: USER_B.id } },
    ], guestDecision: null }
    writeLocalState(key, base)
    expect(readLocalState(key, normalizeAccountCache, () => null).outbox).toEqual([])
    expect(Object.keys(localStorage).some(item => item.startsWith(`${key}.recovery.`))).toBe(true)
  })
  it('deletion cache cleanup removes only the current account and its recovery records', () => {
    saveGuest(guestEvents()); localStorage.setItem(identityCacheKey(USER_A.id), 'A'); localStorage.setItem(`${identityCacheKey(USER_A.id)}.recovery.1`, 'backup')
    localStorage.setItem(identityCacheKey(USER_B.id), 'B'); clearAccountCache(USER_A.id)
    expect(localStorage.getItem(identityCacheKey(USER_A.id))).toBeNull()
    expect(localStorage.getItem(identityCacheKey(USER_B.id))).toBe('B')
    expect(readGuestJourney().activity.displayName).toBe('Leng')
  })
  it('removes account outbox records and receipts without touching another identity', () => {
    const sdk = mockSupabase(USER_A), a = account(sdk, USER_A, { online: () => false })
    favorite(a)
    const aPrefix = `${identityCacheKey(USER_A.id)}.outbox.`
    localStorage.setItem(`${aPrefix}ack.old`, '1')
    const bKey = `${identityCacheKey(USER_B.id)}.outbox.operation.other`
    localStorage.setItem(bKey, 'B'); saveGuest(guestEvents())
    clearAccountCache(USER_A.id)
    expect(Object.keys(localStorage).filter(key => key.startsWith(aPrefix))).toEqual([])
    expect(localStorage.getItem(bKey)).toBe('B')
    expect(readGuestJourney().activity.displayName).toBe('Leng')
  })
})

describe('explicit Guest consent, idempotent events, and two-device hydration', () => {
  it('decline loads account data, preserves Guest bytes, and uploads no Guest events', async () => {
    saveGuest(guestEvents()); const before = localStorage.getItem(STORAGE_KEYS.experience)
    const sdk = mockSupabase(USER_A); sdk.rows.profiles.push({ id: USER_A.id, display_name: 'Cloud name' })
    const store = account(sdk); await store.start()
    expect(store.getSnapshot().migrationPending).toBe(true)
    expect(sdk.rows.meal_logs).toEqual([])
    await store.useAccountOnly()
    expect(store.getSnapshot().data.activity.displayName).toBe('Cloud name')
    expect(store.getSnapshot().data.experience.logs).toEqual([])
    expect(localStorage.getItem(STORAGE_KEYS.experience)).toBe(before)
    store.stop(); expect(account(sdk).getSnapshot().migrationPending).toBe(false)
  })
  it('merges every supported relationship and event once, preserving cloud names and original reward choices', async () => {
    const guest = guestEvents(); expect(guest.experience.boxes['box-visit-one'].status).toBe('opened'); saveGuest(guest)
    const sdk = mockSupabase(USER_A); sdk.rows.profiles.push({ id: USER_A.id, display_name: 'Cloud name' })
    const store = account(sdk); await store.start()
    const [one, two] = await Promise.all([store.mergeGuest(), store.mergeGuest()]); expect(one && two).toBe(true)
    await store.mergeGuest()
    expect(sdk.rows.meal_logs).toHaveLength(3); expect(sdk.rows.opened_boxes).toHaveLength(1)
    expect(sdk.rows.collectible_favorites).toHaveLength(1); expect(sdk.rows.restaurant_favorites).toHaveLength(1)
    expect(sdk.rows.opened_boxes[0]).toMatchObject({ collectible_id: 'ziggy', duplicate: false, box_id: 'box-visit-one' })
    expect(store.getSnapshot().data.activity.displayName).toBe('Cloud name')
    expect(store.getSnapshot().migrationPending).toBe(false)
    expect(store.getSnapshot().outboxCount).toBe(0)
    expect(readGuestJourney().activity.displayName).toBe('Leng')
    const secondDevice = account(mockSupabase(USER_A, sdk.rows)); await secondDevice.start()
    expect(serializeExperience(secondDevice.getSnapshot().data.experience)).toEqual(serializeExperience(store.getSnapshot().data.experience))
    expect(secondDevice.getSnapshot().data.favorites).toEqual(store.getSnapshot().data.favorites)
    expect(secondDevice.getSnapshot().data.experience.logs.at(-1).day).toBe('2026-10-06')
  })
  it('uses approved Guest name before Google metadata, but meaningful cloud name wins', async () => {
    saveGuest(guestEvents()); const user = { ...USER_A, user_metadata: { full_name: 'Google name' } }
    const sdk = mockSupabase(user), store = account(sdk, user); await store.start()
    expect(sdk.rows.profiles[0].display_name).toBe('Explorer')
    await store.mergeGuest(); expect(sdk.rows.profiles[0].display_name).toBe('Leng')
  })
  it('uses provider name when there is no meaningful Guest data and no cloud name', async () => {
    const user = { ...USER_A, user_metadata: { full_name: 'Google name' } }, sdk = mockSupabase(user)
    const store = account(sdk, user); await store.start()
    expect(store.getSnapshot().migrationPending).toBe(false); expect(sdk.rows.profiles[0].display_name).toBe('Google name')
  })
  it('queues no Discovery answers, unfinished visits, derived progress, demo rewards, or QA logs', () => {
    const before = defaultJourney(), after = defaultJourney(); after.discovery.flavors = ['spicy']
    after.experience.progress.cambodia.count = 100
    after.experience.drafts['draft-only'] = meal('draft-only')
    after.experience.logs = [meal('qa-event'), { ...meal('seed-event'), verification: { ...meal().verification, source: 'demo-seed' } }]
    expect(journeyMutations(before, after)).toEqual([])
  })
  it('never changes current Discovery answers when cloud history arrives', async () => {
    const sdk = mockSupabase(USER_A), store = account(sdk)
    store.update('discovery', current => ({ ...current, foodType: 'anything', flavors: ['spicy', 'comforting'], adventurousness: 'surprise-me', region: 'surprise-me' }))
    sdk.rows.meal_logs.push({ ...mealToRow(meal()), user_id: USER_A.id })
    await store.start()
    expect(store.getSnapshot().data.discovery.flavors).toEqual(['spicy', 'comforting'])
    expect(store.getSnapshot().data.experience.logs).toHaveLength(1)
    expect(sdk.writes.every(item => !item.row || !('flavors' in item.row))).toBe(true)
  })
  it('keeps Discovery and unfinished drafts local without cloud reads or sync-status flicker', async () => {
    const sdk = mockSupabase(USER_A), store = account(sdk); await store.start()
    const requests = sdk.requests.length, writes = sdk.writes.length
    sdk.auth.getSession.mockClear()
    store.update('discovery', current => ({ ...current, flavors: ['spicy'] }))
    store.update('experience', current => ({ ...current, drafts: { unfinished: meal('unfinished') } }))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(store.getSnapshot()).toMatchObject({ syncStatus: 'synced', outboxCount: 0 })
    expect(sdk.auth.getSession).not.toHaveBeenCalled()
    expect(sdk.requests).toHaveLength(requests); expect(sdk.writes).toHaveLength(writes)
    expect(store.getSnapshot().data.experience.drafts.unfinished.id).toBe('unfinished')
    const reload = account(sdk, USER_A, { online: () => false })
    expect(reload.getSnapshot().data.discovery.flavors).toEqual(['spicy'])
    await store.retry(); expect(sdk.requests.length).toBeGreaterThan(requests)
  })
  it('still flushes pending cloud work when a local-only edit occurs', async () => {
    let online = false
    const sdk = mockSupabase(USER_A), store = account(sdk, USER_A, { online: () => online })
    favorite(store); online = true
    store.update('discovery', current => ({ ...current, flavors: ['spicy'] }))
    await store.retry()
    expect(sdk.rows.dish_favorites[0].is_active).toBe(true)
    expect(store.getSnapshot()).toMatchObject({ syncStatus: 'synced', outboxCount: 0 })
    expect(store.getSnapshot().data.discovery.flavors).toEqual(['spicy'])
  })
})

describe('durable offline outbox and server conflict rules', () => {
  it('retains both mutations when two stores start from the same offline cache', async () => {
    const sdk = mockSupabase(USER_A), options = { online: () => false }
    const a = account(sdk, USER_A, options), b = account(sdk, USER_A, options)
    favorite(a, 'lort-cha'); favorite(b, 'num-banh-chok')
    a.stop(); b.stop()
    const reloaded = account(sdk, USER_A, options)
    expect(reloaded.getSnapshot().data.favorites.dishIds.sort()).toEqual(['lort-cha', 'num-banh-chok'])
    expect(reloaded.getSnapshot().outboxCount).toBe(2)
    reloaded.stop()
    const connected = account(sdk); await connected.start()
    expect(sdk.rows.dish_favorites.filter(row => row.is_active).map(row => row.dish_id).sort()).toEqual(['lort-cha', 'num-banh-chok'])
    expect(connected.getSnapshot().outboxCount).toBe(0)
  })
  it('recovers both operations even if an interleaved writer replaces the shared snapshot', () => {
    const sdk = mockSupabase(USER_A), options = { online: () => false }
    const a = account(sdk, USER_A, options), b = account(sdk, USER_A, options)
    favorite(a, 'lort-cha')
    const staleSnapshot = localStorage.getItem(identityCacheKey(USER_A.id))
    favorite(b, 'num-banh-chok')
    localStorage.setItem(identityCacheKey(USER_A.id), staleSnapshot)
    const reloaded = account(sdk, USER_A, options)
    expect(reloaded.getSnapshot().data.favorites.dishIds.sort()).toEqual(['lort-cha', 'num-banh-chok'])
    expect(reloaded.getSnapshot().outboxCount).toBe(2)
  })
  it('preserves another store’s pending event and an unfavorite tombstone', async () => {
    const sdk = mockSupabase(USER_A)
    sdk.rows.dish_favorites.push({ user_id: USER_A.id, dish_id: 'nasi-goreng', is_active: true })
    const initial = account(sdk); await initial.start(); initial.stop()
    const options = { online: () => false }, a = account(sdk, USER_A, options), b = account(sdk, USER_A, options)
    favorite(a)
    b.update('experience', current => normalizeExperience({ ...serializeExperience(current), logs: [meal()] }))
    const reload = account(sdk, USER_A, options)
    expect(reload.getSnapshot().outboxCount).toBe(2)
    expect(reload.getSnapshot().data.favorites.dishIds).toEqual([])
    expect(reload.getSnapshot().data.experience.logs.map(log => log.id)).toEqual(['visit-one'])
    const connected = account(sdk); await connected.start()
    expect(sdk.rows.dish_favorites[0].is_active).toBe(false)
    expect(sdk.rows.meal_logs).toHaveLength(1)
  })
  it('does not resurrect acknowledged operations when a stale store saves or reloads', async () => {
    const sdk = mockSupabase(USER_A), stale = account(sdk, USER_A, { online: () => false })
    favorite(stale)
    const oldSnapshot = localStorage.getItem(identityCacheKey(USER_A.id))
    const connected = account(sdk); await connected.start(); favorite(connected); await connected.retry()
    expect(sdk.rows.dish_favorites[0].is_active).toBe(false)
    stale.update('discovery', current => ({ ...current, flavors: ['spicy'] }))
    expect(stale.getSnapshot().outboxCount).toBe(0)
    expect(stale.getSnapshot().data.favorites.dishIds).toEqual([])
    localStorage.setItem(identityCacheKey(USER_A.id), oldSnapshot)
    const reload = account(sdk); await reload.start()
    expect(reload.getSnapshot().outboxCount).toBe(0)
    expect(reload.getSnapshot().data.favorites.dishIds).toEqual([])
    expect(sdk.writes.filter(write => write.table === 'dish_favorites')).toHaveLength(2)
  })
  it('serializes simultaneous drains and applies later toggles deterministically', async () => {
    let online = false
    const sdk = mockSupabase(USER_A), options = { online: () => online, now: () => new Date(at) }
    const a = account(sdk, USER_A, options); favorite(a)
    const b = account(sdk, USER_A, options); favorite(b)
    online = true
    await Promise.all([a.retry(), b.retry()])
    expect(sdk.rows.dish_favorites[0].is_active).toBe(false)
    expect(sdk.writes.filter(write => write.table === 'dish_favorites')).toHaveLength(2)
    expect(a.getSnapshot().outboxCount + b.getSnapshot().outboxCount).toBe(0)
  })
  it('refreshes a running offline store on another tab’s storage event', async () => {
    const sdk = mockSupabase(USER_A), options = { online: () => false }
    const a = account(sdk, USER_A, options), b = account(sdk, USER_A, options)
    await b.start(); favorite(a, 'lort-cha')
    window.dispatchEvent(new StorageEvent('storage', { key: identityCacheKey(USER_A.id) }))
    expect(b.getSnapshot().outboxCount).toBe(1)
    expect(b.getSnapshot().data.favorites.dishIds).toEqual(['lort-cha'])
  })
  it('migrates legacy snapshot operations once without resurrecting acknowledged mutations', async () => {
    const key = identityCacheKey(USER_A.id), data = defaultJourney()
    writeLocalState(key, { data: { ...data, experience: serializeExperience(data.experience) }, guestDecision: null,
      outbox: [{ id: 'legacy-operation', kind: 'dishFavorite', target: 'nasi-goreng', payload: { dish_id: 'nasi-goreng', is_active: true } }] })
    const oldSnapshot = localStorage.getItem(key), sdk = mockSupabase(USER_A), store = account(sdk)
    await store.start(); localStorage.setItem(key, oldSnapshot)
    const reload = account(sdk); await reload.start()
    expect(reload.getSnapshot().outboxCount).toBe(0)
    expect(sdk.writes.filter(write => write.table === 'dish_favorites')).toHaveLength(1)
  })
  it('retains the original order when migrating legacy in-flight and newer toggle operations', async () => {
    const data = defaultJourney(), key = identityCacheKey(USER_A.id)
    writeLocalState(key, { data: { ...data, experience: serializeExperience(data.experience) }, guestDecision: null,
      outbox: [{ id: 'z-original', kind: 'dishFavorite', target: 'nasi-goreng', payload: { dish_id: 'nasi-goreng', is_active: true } },
        { id: 'a-newer', kind: 'dishFavorite', target: 'nasi-goreng', payload: { dish_id: 'nasi-goreng', is_active: false } }] })
    const sdk = mockSupabase(USER_A), store = account(sdk); await store.start()
    expect(sdk.rows.dish_favorites[0].is_active).toBe(false)
    expect(store.getSnapshot().data.favorites.dishIds).toEqual([])
  })
  it('keeps a mutation in memory with an explicit error when durable storage fails, then retries', async () => {
    let online = false
    const sdk = mockSupabase(USER_A), store = account(sdk, USER_A, { online: () => online })
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    favorite(store)
    expect(store.getSnapshot()).toMatchObject({ outboxCount: 1, syncStatus: 'issue' })
    expect(store.getSnapshot().data.favorites.dishIds).toEqual(['nasi-goreng'])
    setItem.mockRestore(); online = true; await store.retry()
    expect(store.getSnapshot().outboxCount).toBe(0)
    expect(sdk.rows.dish_favorites[0].is_active).toBe(true)
  })
  it('preserves unacknowledged changes when saving the acknowledgement fails', async () => {
    let online = false
    const sdk = mockSupabase(USER_A), store = account(sdk, USER_A, { online: () => online })
    favorite(store)
    const original = localStorage.setItem.bind(localStorage)
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key.includes('.outbox.ack.')) throw new Error('Quota exceeded')
      original(key, value)
    })
    online = true; expect(await store.retry()).toBe(false)
    expect(store.getSnapshot()).toMatchObject({ syncStatus: 'issue', outboxCount: 1 })
    setItem.mockRestore(); expect(await store.retry()).toBe(true)
    expect(store.getSnapshot().outboxCount).toBe(0)
    expect(sdk.rows.dish_favorites).toHaveLength(1)
  })
  it('uses an account-specific browser lock for a cloud drain', async () => {
    const request = vi.fn((_key, run) => run())
    vi.stubGlobal('navigator', { locks: { request } })
    try {
      const sdk = mockSupabase(USER_A), store = account(sdk); await store.start()
      expect(request).toHaveBeenCalledWith(`${identityCacheKey(USER_A.id)}.sync`, expect.any(Function))
    } finally { vi.unstubAllGlobals() }
  })
  it('keeps another store’s newer toggle when acknowledging an in-flight operation', async () => {
    const sdk = mockSupabase(USER_A), a = account(sdk); await a.start()
    let release, entered
    const enteredPromise = new Promise(resolve => { entered = resolve })
    sdk.beforeWrite = table => table === 'dish_favorites' ? new Promise(resolve => { release = resolve; entered() }) : null
    favorite(a); const flush = a.retry(); await enteredPromise
    const b = account(sdk, USER_A, { online: () => false }); favorite(b)
    expect(b.getSnapshot().outboxCount).toBe(2)
    sdk.beforeWrite = null; release(); await flush
    expect(sdk.rows.dish_favorites[0].is_active).toBe(false)
    expect(sdk.writes.filter(write => write.table === 'dish_favorites')).toHaveLength(2)
    expect(account(sdk, USER_A, { online: () => false }).getSnapshot().outboxCount).toBe(0)
  })
  it('uses distinct fallback operation IDs across stores created at the same time', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(undefined)
    const sdk = mockSupabase(USER_A), options = { online: () => false, now: () => new Date(at) }
    const a = account(sdk, USER_A, options), b = account(sdk, USER_A, options)
    favorite(a, 'lort-cha'); favorite(b, 'num-banh-chok')
    const reload = account(sdk, USER_A, options)
    expect(reload.getSnapshot().outboxCount).toBe(2)
    expect(reload.getSnapshot().data.favorites.dishIds.sort()).toEqual(['lort-cha', 'num-banh-chok'])
  })
  it('rejects malformed outbox records and preserves recovery bytes without recursively backing them up', async () => {
    const sdk = mockSupabase(USER_A), offline = account(sdk, USER_A, { online: () => false })
    favorite(offline)
    const key = `${identityCacheKey(USER_A.id)}.outbox.operation.invalid`
    localStorage.setItem(key, '{')
    const store = account(sdk); await store.start(); await store.retry()
    expect(sdk.rows.dish_favorites).toHaveLength(1)
    expect(store.getSnapshot().outboxCount).toBe(0)
    const backups = Object.keys(localStorage).filter(item => item.startsWith(`${key}.recovery.`))
    expect(backups.length).toBeGreaterThan(0)
    expect(backups.every(item => !/\.recovery\.\d+\.recovery\./.test(item))).toBe(true)
    expect(localStorage.getItem(backups[0])).toBe('{')
  })
  it('optimistically updates offline, survives reload, flushes once and hydrates another device', async () => {
    let online = false
    const sdk = mockSupabase(USER_A), first = account(sdk, USER_A, { online: () => online })
    await first.start(); favorite(first)
    expect(first.getSnapshot()).toMatchObject({ syncStatus: 'offline', outboxCount: 1 })
    expect(JSON.parse(localStorage.getItem(identityCacheKey(USER_A.id))).data.outbox).toHaveLength(1)
    first.stop(); const reloaded = account(sdk, USER_A, { online: () => online })
    expect(reloaded.getSnapshot().data.favorites.dishIds).toEqual(['nasi-goreng'])
    online = true; await reloaded.retry(); await reloaded.retry()
    expect(reloaded.getSnapshot()).toMatchObject({ syncStatus: 'synced', outboxCount: 0 })
    expect(sdk.writes.filter(item => item.table === 'dish_favorites')).toHaveLength(1)
    const second = account(mockSupabase(USER_A, sdk.rows)); await second.start()
    expect(second.getSnapshot().data.favorites.dishIds).toEqual(['nasi-goreng'])
  })
  it('does not resurrect an unfavorite from a stale cached snapshot', async () => {
    const sdk = mockSupabase(USER_A), store = account(sdk); await store.start(); favorite(store); await store.retry()
    sdk.rows.dish_favorites[0].is_active = false
    await store.retry(); expect(store.getSnapshot().data.favorites.dishIds).toEqual([])
    expect(store.getSnapshot().outboxCount).toBe(0)
  })
  it('newest cloud view survives an older offline operation', async () => {
    let online = false; const sdk = mockSupabase(USER_A), store = account(sdk, USER_A, { online: () => online })
    store.update('activity', current => ({ ...current, recentDishes: [{ dishId: 'nasi-goreng', viewedAt: '2026-10-01T12:00:00Z' }] }))
    sdk.rows.recent_dish_views.push({ user_id: USER_A.id, dish_id: 'nasi-goreng', viewed_at: at })
    online = true; await store.retry()
    expect(sdk.rows.recent_dish_views[0].viewed_at).toBe(at)
    expect(store.getSnapshot().data.activity.recentDishes[0].viewedAt).toBe(at)
    expect(sdk.rpc).toHaveBeenCalledWith('record_nom_dish_view', { p_dish_id: 'nasi-goreng', p_viewed_at: '2026-10-01T12:00:00Z' })
  })
  it('retains network-failed work and bounds background retries', async () => {
    const callbacks = [], timers = { setTimeout: vi.fn((cb, wait) => { callbacks.push(cb); return wait }), clearTimeout: vi.fn() }
    const sdk = mockSupabase(USER_A); sdk.fail = true
    const store = account(sdk, USER_A, { timers }); favorite(store); await store.retry()
    for (let index = 0; index < 3; index++) { callbacks[index]?.(); await store.start() }
    expect(store.getSnapshot()).toMatchObject({ syncStatus: 'issue', outboxCount: 1 })
    expect(timers.setTimeout.mock.calls.map(call => call[1])).toEqual([5000, 20000, 60000])
    sdk.fail = false; await store.retry(); expect(store.getSnapshot().outboxCount).toBe(0)
  })
  it('preserves a newer toggle made while the previous write is in flight', async () => {
    const sdk = mockSupabase(USER_A), store = account(sdk); await store.start()
    let release, entered; const enteredPromise = new Promise(resolve => { entered = resolve })
    sdk.beforeWrite = (table) => table === 'dish_favorites' ? new Promise(resolve => { release = resolve; entered() }) : null
    favorite(store); const flush = store.retry(); await enteredPromise
    favorite(store); sdk.beforeWrite = null; release(); await flush
    expect(sdk.rows.dish_favorites[0].is_active).toBe(false)
    expect(store.getSnapshot().data.favorites.dishIds).toEqual([])
    expect(store.getSnapshot().outboxCount).toBe(0)
  })
  it('stops queued User A writes when the SDK session has become User B', async () => {
    const sdk = mockSupabase(USER_A), store = account(sdk, USER_A, { online: () => false }); favorite(store)
    sdk.emit(USER_B)
    await expect(createCloudRepository(sdk, USER_A.id).applyMutation({ kind: 'dishFavorite', payload: { dish_id: 'nasi-goreng', is_active: true } })).rejects.toMatchObject({ code: 'IDENTITY_CHANGED' })
    expect(sdk.rows.dish_favorites).toEqual([])
    expect(store.getSnapshot().outboxCount).toBe(1)
  })
  it('StrictMode start-stop-start shares a flight and event keys remain stable', async () => {
    const sdk = mockSupabase(USER_A), store = account(sdk)
    store.update('experience', () => normalizeExperience({ logs: [meal()], openedBoxes: [], favorites: [] }))
    const first = store.start(); store.stop(); const second = store.start(); await Promise.all([first, second])
    expect(sdk.rows.profiles).toHaveLength(1); expect(sdk.rows.meal_logs).toHaveLength(1)
    expect(sdk.writes.filter(item => item.table === 'meal_logs')).toHaveLength(1)
  })
  it('resumes a partially uploaded merge after reload without reuploading acknowledged events', async () => {
    saveGuest(guestEvents()); const sdk = mockSupabase(USER_A), store = account(sdk); await store.start()
    sdk.beforeWrite = table => { if (table === 'opened_boxes') sdk.fail = true }
    expect(await store.mergeGuest()).toBe(false)
    expect(sdk.rows.meal_logs).toHaveLength(3); expect(sdk.rows.opened_boxes).toHaveLength(0)
    expect(store.getSnapshot().migrationInProgress).toBe(true)
    store.stop(); sdk.fail = false; sdk.beforeWrite = null
    const resumed = account(sdk); await resumed.start()
    expect(sdk.rows.meal_logs).toHaveLength(3); expect(sdk.rows.opened_boxes).toHaveLength(1)
    expect(sdk.writes.filter(item => item.table === 'meal_logs')).toHaveLength(3)
    expect(resumed.getSnapshot()).toMatchObject({ migrationPending: false, outboxCount: 0, syncStatus: 'synced' })
  })
})

describe('canonical source-event replay', () => {
  it('consumes an existing earned credit when merged chronology moves a historical box milestone', () => {
    const guest = guestEvents(), rows = Object.fromEntries(TABLES.map(table => [table, []]))
    rows.meal_logs = [mealToRow(meal('cloud-earlier', '2026-10-03'))]
    const merged = mergeJourneys(cloudRowsToJourney(rows), guest)
    expect(merged.experience.boxes['box-visit-one']).toMatchObject({ status: 'opened', collectibleId: 'ziggy', duplicate: false })
    expect(merged.experience.boxes['box-cloud-earlier']).toBeUndefined()
    expect(merged.experience.progress.cambodia.count).toBe(1)
    expect(Object.values(merged.experience.boxes)).toHaveLength(1)
  })
  it('never rerolls a malformed explicit reward or invents credit for an unverified opening', () => {
    const data = guestEvents(), event = serializeExperience(data.experience).openedBoxes[0]
    const invalid = normalizeExperience({ logs: data.experience.logs, openedBoxes: [{ ...event, collectibleId: 'unknown' }], favorites: [] })
    expect(invalid.boxes['box-visit-one'].status).toBe('ready')
    const unverified = { ...meal(), verification: { ...meal().verification, method: 'unverified', verified: false } }
    expect(normalizeExperience({ logs: [unverified], openedBoxes: [event], favorites: [] }).boxes).toEqual({})
  })
  it('retains local_day and explicit collectible choices rather than rerolling', () => {
    const data = guestEvents(), rows = Object.fromEntries(TABLES.map(table => [table, []]))
    rows.meal_logs = data.experience.logs.map(mealToRow)
    rows.opened_boxes = [{ box_id: 'box-visit-one', visit_id: 'visit-one', country_id: 'cambodia', collectible_id: 'ziggy', duplicate: false, opened_at: at }]
    const hydrated = cloudRowsToJourney(rows)
    expect(hydrated.experience.boxes['box-visit-one']).toMatchObject({ collectibleId: 'ziggy', duplicate: false, openedAt: at })
    expect(hydrated.experience.logs.at(-1).day).toBe('2026-10-06')
    expect(serializeExperience(normalizeExperience(serializeExperience(hydrated.experience)))).toEqual(serializeExperience(hydrated.experience))
  })
  it('merges stable IDs, ignores invalid locked favorites, and preserves account-local drafts', () => {
    const a = guestEvents(), g = guestEvents(); a.activity.displayName = 'Cloud'; a.experience.drafts.pending = meal('pending')
    g.experience.favorites.push('cambodia:invalid')
    const merged = mergeJourneys(a, g)
    expect(merged.experience.logs).toHaveLength(3); expect(Object.values(merged.experience.boxes)).toHaveLength(1)
    expect(merged.experience.favorites).toEqual(['cambodia:ziggy']); expect(merged.experience.drafts.pending).toBeTruthy()
  })
})
