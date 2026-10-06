import { readLocalState, writeLocalState, STORAGE_KEYS, REPAIRED_STATE } from './localPersistence'
import { identityCacheKey, readGuestJourney, meaningfulGuestData, guestJourneyFingerprint, meaningfulName } from './identityStorage'
import { normalizeActivity, normalizeDiscovery, normalizeExperience, normalizeFavorites, serializeExperience } from './persistedState'
import { defaultJourney, journeyMutations, mergeJourneys, mealFromRow } from './cloudState'
import { collectionCountries, collectibleDefinitions } from './collectionDefinitions'
import { createAccountOutbox, withAccountSyncLock } from './accountOutbox'

const fields = {
  profile: ['display_name', 'avatar_url'], dishFavorite: ['dish_id', 'is_active'], restaurantFavorite: ['restaurant_id', 'is_active'],
  dishView: ['dish_id', 'viewed_at'], collectibleFavorite: ['collectible_key', 'is_active'],
  meal: ['id', 'dish_id', 'restaurant_id', 'country_code', 'started_at', 'completed_at', 'local_day', 'verification_method', 'verified', 'verification_source', 'verification_checked_at', 'feedback_reaction', 'feedback_observations', 'feedback_note'],
  openedBox: ['box_id', 'visit_id', 'country_id', 'collectible_id', 'duplicate', 'opened_at'],
}
const order = ['profile', 'dishFavorite', 'restaurantFavorite', 'dishView', 'meal', 'openedBox', 'collectibleFavorite']
const serializeJourney = data => ({ ...data, experience: serializeExperience(data.experience) })

function validOperation(item) {
  if (!item || typeof item.id !== 'string' || !item.id || typeof item.target !== 'string' || !fields[item.kind]
    || (item.clock !== undefined && (!Number.isSafeInteger(item.clock) || item.clock < 0))
    || !item.payload || typeof item.payload !== 'object' || Array.isArray(item.payload)
    || !Object.keys(item.payload).every(key => fields[item.kind].includes(key))) return false
  const p = item.payload, timestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
  if (item.kind === 'profile') return item.target === 'profile' && typeof p.display_name === 'string'
    && p.display_name === normalizeActivity({ displayName: p.display_name, recentDishes: [] }).displayName
    && (p.avatar_url == null || typeof p.avatar_url === 'string' && /^https:\/\//.test(p.avatar_url) && p.avatar_url.length <= 2048)
  if (item.kind === 'dishFavorite' || item.kind === 'dishView') {
    if (normalizeFavorites({ dishIds: [p.dish_id], restaurantIds: [] }).dishIds.length !== 1 || item.target !== p.dish_id) return false
    return item.kind === 'dishView' ? timestamp(p.viewed_at) : typeof p.is_active === 'boolean'
  }
  if (item.kind === 'restaurantFavorite') return item.target === p.restaurant_id && typeof p.is_active === 'boolean'
    && normalizeFavorites({ dishIds: [], restaurantIds: [p.restaurant_id] }).restaurantIds.length === 1
  if (item.kind === 'collectibleFavorite') {
    if (typeof p.collectible_key !== 'string' || item.target !== p.collectible_key || typeof p.is_active !== 'boolean') return false
    const [country, collectible, extra] = p.collectible_key.split(':')
    return !extra && collectionCountries.some(item => item.id === country) && collectibleDefinitions.some(item => item.id === collectible)
  }
  if (item.kind === 'meal') {
    if (item.target !== p.id || !timestamp(p.completed_at) || !timestamp(p.started_at) || !timestamp(p.verification_checked_at)) return false
    const log = normalizeExperience({ logs: [mealFromRow(p)], openedBoxes: [], favorites: [] }).logs[0]
    return Boolean(log && log.countryCode === p.country_code && !/^qa-/i.test(log.id)
      && !['qa-preview', 'demo-seed'].includes(p.verification_source) && typeof p.verification_source === 'string')
  }
  return item.target === p.box_id && typeof p.visit_id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(p.visit_id)
    && !/^qa-/i.test(p.visit_id) && p.box_id === `box-${p.visit_id}` && timestamp(p.opened_at) && typeof p.duplicate === 'boolean'
    && collectionCountries.some(item => item.id === p.country_id) && collectibleDefinitions.some(item => item.id === p.collectible_id)
}

export function normalizeAccountCache(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid account cache')
  const defaults = defaultJourney(), data = {}, normalizers = { activity: normalizeActivity, discovery: normalizeDiscovery, favorites: normalizeFavorites, experience: normalizeExperience }
  let repaired = false
  for (const section of Object.keys(defaults)) {
    try { data[section] = normalizers[section](value.data[section]); if (data[section][REPAIRED_STATE]) repaired = true }
    catch { data[section] = defaults[section]; repaired = true }
  }
  const seen = new Set()
  const outbox = Array.isArray(value.outbox) ? value.outbox.filter(item => {
    try { if (!validOperation(item) || seen.has(item.id)) return false; seen.add(item.id); return true } catch { return false }
  }) : []
  if (outbox.length !== value.outbox?.length) repaired = true
  const guestDecision = value.guestDecision && /^[a-f0-9]+-[a-f0-9]+$/.test(value.guestDecision.fingerprint)
    && ['merging', 'merged', 'declined'].includes(value.guestDecision.status) ? value.guestDecision : null
  const result = { data, outbox, guestDecision }
  if (repaired) Object.defineProperty(result, REPAIRED_STATE, { value: true })
  return result
}

/** Reconcile the latest cloud snapshot with only unacknowledged operations.
 * Cached stale favorites are never unioned back into accepted tombstones. */
export function overlayPending(cloud, outbox, cached) {
  const data = { ...cloud, discovery: cached.discovery, activity: { ...cloud.activity, recentDishes: [...cloud.activity.recentDishes] },
    favorites: { dishIds: [...cloud.favorites.dishIds], restaurantIds: [...cloud.favorites.restaurantIds] } }
  const events = serializeExperience(cloud.experience)
  const favorites = new Set(events.favorites)
  const toggle = (list, id, active) => active ? [...new Set([...list, id])] : list.filter(item => item !== id)
  for (const { kind, payload } of outbox) {
    if (kind === 'profile') data.activity.displayName = payload.display_name
    if (kind === 'dishFavorite') data.favorites.dishIds = toggle(data.favorites.dishIds, payload.dish_id, payload.is_active)
    if (kind === 'restaurantFavorite') data.favorites.restaurantIds = toggle(data.favorites.restaurantIds, payload.restaurant_id, payload.is_active)
    if (kind === 'dishView') {
      const previous = data.activity.recentDishes.find(view => view.dishId === payload.dish_id)
      if (!previous || Date.parse(previous.viewedAt) < Date.parse(payload.viewed_at)) data.activity.recentDishes = [
        ...data.activity.recentDishes.filter(view => view.dishId !== payload.dish_id), { dishId: payload.dish_id, viewedAt: payload.viewed_at }]
    }
    if (kind === 'meal' && !events.logs.some(log => log.id === payload.id)) events.logs.push(mealFromRow(payload))
    if (kind === 'openedBox' && !events.openedBoxes.some(box => box.id === payload.box_id)) events.openedBoxes.push({ id: payload.box_id, visitId: payload.visit_id,
      countryId: payload.country_id, collectibleId: payload.collectible_id, duplicate: payload.duplicate, openedAt: payload.opened_at })
    if (kind === 'collectibleFavorite') { if (payload.is_active) favorites.add(payload.collectible_key); else favorites.delete(payload.collectible_key) }
  }
  events.logs.sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.id.localeCompare(b.id))
  data.activity = normalizeActivity({ ...data.activity, recentDishes: data.activity.recentDishes.sort((a, b) => Date.parse(b.viewedAt) - Date.parse(a.viewedAt)) })
  data.favorites = normalizeFavorites(data.favorites)
  data.experience = normalizeExperience({ ...events, favorites: [...favorites] })
  data.experience.drafts = cached.experience.drafts
  for (const box of Object.values(data.experience.boxes)) if (box.status === 'ready' && cached.experience.boxes[box.id]?.status === 'opening') box.status = 'opening'
  return data
}

export function createJourneyStore({ user = null, repository = null, online = () => globalThis.navigator?.onLine !== false, now = () => new Date(), timers = globalThis } = {}) {
  const userId = user?.id, guest = readGuestJourney(), cacheKey = userId ? identityCacheKey(userId) : null
  const cache = userId ? readLocalState(cacheKey, normalizeAccountCache, () => ({ data: defaultJourney(), outbox: [], guestDecision: null })) : { data: guest, outbox: [], guestDecision: null }
  const journal = userId ? createAccountOutbox(cacheKey, validOperation, cache.outbox) : null
  let outbox = journal?.read() ?? [], decision = cache.guestDecision, decisionDirty = false, active = true, flight = null, mergeFlight = null, retryTimer = null, retryCount = 0, lastCloud = null, sequence = 0, writerId = null
  const metadataName = normalizeActivity({ displayName: user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? 'Explorer', recentDishes: [] }).displayName
  const avatar = /^https:\/\//.test(user?.user_metadata?.avatar_url ?? '') ? user.user_metadata.avatar_url : null
  const fingerprint = guestJourneyFingerprint(guest)
  let snapshot = { data: userId ? overlayPending(cache.data, outbox, cache.data) : cache.data, outboxCount: outbox.length,
    migrationPending: Boolean(userId && meaningfulGuestData(guest) && (decision?.fingerprint !== fingerprint || decision.status === 'merging')),
    migrationInProgress: decision?.status === 'merging', syncStatus: userId ? online() ? 'syncing' : 'offline' : 'guest', syncError: null, avatarUrl: avatar }
  const listeners = new Set()
  const publish = patch => { snapshot = { ...snapshot, ...patch, outboxCount: outbox.length }; for (const listener of listeners) listener() }
  function reconcile(authoritative = false) {
    const shared = readLocalState(cacheKey, normalizeAccountCache, () => cache)
    outbox = journal.read()
    if (!decisionDirty) decision = shared.guestDecision
    publish({ data: overlayPending(authoritative ? snapshot.data : shared.data, outbox, snapshot.data),
      migrationPending: Boolean(meaningfulGuestData(guest) && (decision?.fingerprint !== fingerprint || decision.status === 'merging')),
      migrationInProgress: decision?.status === 'merging' })
  }
  function persist(authoritative = false) {
    if (userId) {
      const durable = journal.flush()
      reconcile(authoritative)
      if (!durable) return false
      const saved = writeLocalState(cacheKey, { data: serializeJourney(snapshot.data), outbox, guestDecision: decision })
      if (saved) decisionDirty = false
      return durable && saved
    }
    return Object.entries(snapshot.data).map(([section, value]) => writeLocalState(STORAGE_KEYS[section], section === 'experience' ? serializeExperience(value) : value)).every(Boolean)
  }
  function enqueue(mutations) {
    for (const mutation of mutations) {
      const id = globalThis.crypto?.randomUUID?.() ?? `operation-${writerId ??= `${now().getTime()}-${Math.random().toString(36).slice(2)}`}-${++sequence}`
      journal.append(mutation, id, now().getTime())
    }
    outbox = journal.read()
  }
  function scheduleRetry() {
    if (!active || !online() || retryTimer || retryCount >= 3) return
    const wait = [5000, 20000, 60000][retryCount++]
    retryTimer = timers.setTimeout(() => { retryTimer = null; synchronize() }, wait)
  }
  function failure(error) {
    if (!active) return false
    publish({ syncStatus: online() ? 'issue' : 'offline', syncError: error?.code === 'IDENTITY_CHANGED' ? error.message : 'Changes stay in this account’s local cache. Check your connection or account setup, then Retry.' })
    if (error?.code !== 'IDENTITY_CHANGED') scheduleRetry()
    return false
  }
  async function synchronize() {
    if (!active || !userId || !repository) return false
    if (flight) return flight
    if (!online()) { publish({ syncStatus: 'offline', syncError: null }); return false }
    publish({ syncStatus: 'syncing', syncError: null })
    flight = withAccountSyncLock(`${cacheKey}.sync`, async () => {
      try {
        if (!active) return false
        if (!journal.flush()) throw new Error('Pending changes could not be saved')
        reconcile()
        lastCloud = await repository.loadCloudUserState()
        if (!active) return false
        outbox = journal.read()
        let data = overlayPending(lastCloud.data, outbox, snapshot.data)
        if (!outbox.some(item => item.kind === 'profile') && !meaningfulName(lastCloud.profile?.display_name)) {
          // Identity metadata is a fallback, never a Guest import. While consent
          // is pending leave the cloud name neutral so an approved Guest name
          // can take precedence over a brand-new provider profile.
          if (!snapshot.migrationPending && meaningfulName(metadataName)) enqueue([{ kind: 'profile', target: 'profile', payload: { display_name: metadataName } }])
          if (!meaningfulName(data.activity.displayName)) data.activity = { ...data.activity, displayName: metadataName }
        }
        publish({ data, avatarUrl: lastCloud.profile?.avatar_url ?? avatar }); persist(true)
        let uploaded = false
        while (outbox.length && active) {
          if (!online()) { publish({ syncStatus: 'offline' }); return false }
          const operation = [...outbox].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0]
          await repository.applyMutation(operation)
          if (!active) return false
          if (!journal.acknowledge(operation.id)) throw new Error('Acknowledgement could not be saved')
          outbox = journal.read()
          uploaded = true; persist(); publish({})
        }
        if (!active) return false
        if (uploaded) {
          lastCloud = await repository.loadCloudUserState()
          if (!active) return false
          outbox = journal.read()
          publish({ data: overlayPending(lastCloud.data, outbox, snapshot.data), avatarUrl: lastCloud.profile?.avatar_url ?? avatar })
          persist(true)
        }
        if (!outbox.length && decision?.status === 'merging') {
          decision = { ...decision, status: 'merged' }
          decisionDirty = true
          publish({ migrationPending: false, migrationInProgress: false })
        }
        const saved = persist()
        retryCount = 0
        if (retryTimer) { timers.clearTimeout(retryTimer); retryTimer = null }
        publish({ syncStatus: outbox.length ? 'syncing' : saved ? 'synced' : 'issue',
          syncError: saved ? null : 'This browser could not save the account cache. Keep this tab open while syncing.' })
        return true
      } catch (error) { return failure(error) }
      finally { flight = null; if (active && outbox.length && snapshot.syncStatus === 'syncing') queueMicrotask(synchronize) }
    })
    return flight
  }
  const store = {
    scope: userId ? `user.${userId}` : 'guest', userId,
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    update(section, updater) {
      if (!active) return
      const value = typeof updater === 'function' ? updater(snapshot.data[section]) : updater
      const data = { ...snapshot.data, [section]: value }
      const mutations = userId ? journeyMutations(snapshot.data, data) : []
      if (mutations.length) enqueue(mutations)
      publish({ data, syncStatus: userId ? mutations.length ? online() ? 'syncing' : 'offline' : snapshot.syncStatus : 'guest' })
      const saved = persist()
      if (userId && !saved) publish({ syncStatus: 'issue', syncError: 'This browser could not save pending changes. Keep this tab open and Retry.' })
      if (userId && outbox.length) queueMicrotask(synchronize)
    },
    start() { active = true; if (userId) { globalThis.addEventListener?.('storage', storageChanged); return synchronize() }; persist(); return Promise.resolve(true) },
    stop() { active = false; globalThis.removeEventListener?.('storage', storageChanged); if (retryTimer) timers.clearTimeout(retryTimer); retryTimer = null },
    retry() { retryCount = 0; if (retryTimer) timers.clearTimeout(retryTimer); retryTimer = null; return synchronize() },
    useAccountOnly() {
      if (!userId || !active || decision?.status === 'merging') return
      decision = { fingerprint: guestJourneyFingerprint(readGuestJourney()), status: 'declined' }
      decisionDirty = true
      publish({ migrationPending: false, migrationInProgress: false }); persist(); return synchronize()
    },
    mergeGuest() {
      if (mergeFlight) return mergeFlight
      if (!userId || !active) return Promise.resolve(false)
      if (decision?.status === 'merging') return synchronize()
      mergeFlight = (async () => {
        if (!await synchronize() || !active || !lastCloud) return false
        const local = readGuestJourney()
        const base = { ...snapshot.data, activity: { ...snapshot.data.activity, displayName: lastCloud.profile?.display_name ?? 'Explorer' } }
        const data = mergeJourneys(base, local, metadataName)
        enqueue(journeyMutations(base, data))
        decision = { fingerprint: guestJourneyFingerprint(local), status: 'merging' }
        decisionDirty = true
        publish({ data, migrationInProgress: true, syncStatus: 'syncing' }); persist()
        return synchronize()
      })().catch(failure).finally(() => { mergeFlight = null })
      return mergeFlight
    },
  }
  function storageChanged(event) {
    if (!active || !userId || (event.key !== null && event.key !== cacheKey && !event.key?.startsWith(journal.prefix))) return
    reconcile()
    if (outbox.length) queueMicrotask(synchronize)
  }
  return store
}
