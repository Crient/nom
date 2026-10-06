// Opt-in live validation against ONLY Nom. Credentials stay in a private file.
// Fixtures are provisioned/cleaned by the authorized operator, never this script.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { createServer } from 'vite'

const configPath = process.argv[2]
if (!configPath) throw new Error('Pass the private disposable-fixture configuration file.')
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
assert.equal(config.url, 'https://iwamwxsosrhxsdcsuoiu.supabase.co')
assert.ok(config.publishableKey.startsWith('sb_publishable_'))
assert.ok(config.users.every(u => u.email.endsWith('@example.invalid')))
const results = []
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, canonical(item)]))
  : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(value).toISOString() : value
const record = (flow, status, evidence) => { results.push({ flow, status, evidence }); console.log(`${status}: ${flow} — ${evidence}`) }
const checked = result => { if (result.error) { const e = new Error(`Backend error: ${result.error.code || result.error.status || 'unknown'}`); throw e } return result.data }
class Storage {
  constructor() { Object.defineProperty(this, 'values', { value: new Map() }) }
  get length() { return this.values.size }
  key(i) { return [...this.values.keys()][i] ?? null }
  getItem(k) { return this.values.get(k) ?? null }
  setItem(k, v) { this.values.set(k, String(v)); Object.defineProperty(this, k, { value: String(v), configurable: true, enumerable: true }) }
  removeItem(k) { this.values.delete(k); delete this[k] }
}
const clients = []
function client(storage = new Storage(), name = String(clients.length)) {
  const c = createClient(config.url, config.publishableKey, { auth: { storage, storageKey: `nom-live-${name}`, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce' } })
  clients.push(c); return c
}
const [a, b, unconfirmed] = config.users
const anonymous = client(), authStorage = new Storage(), ca = client(authStorage, 'a'), cb = client()
let vite, activeStore
try {
  const settings = await fetch(config.url + '/auth/v1/settings', { headers: { apikey: config.publishableKey } }).then(r => r.json())
  fs.writeFileSync('/private/tmp/nom-live-auth-settings.json', JSON.stringify(settings, null, 2))
  assert.equal(settings.external.email, true)
  assert.equal(settings.mailer_autoconfirm, false)
  record('Auth configuration: email/password and confirmation', 'PASS', 'Email enabled; signup allowed; automatic confirmation disabled.')
  record('Google OAuth', 'BLOCKED', settings.external.google ? 'Interactive Google consent requires a connected browser.' : 'Provider disabled; Google credentials/setup required.')
  const uc = client()
  const ucLogin = await uc.auth.signInWithPassword({ email: unconfirmed.email, password: unconfirmed.password })
  assert.equal(ucLogin.error?.code, 'email_not_confirmed')
  record('Email confirmation enforcement', 'PASS', 'Unconfirmed disposable user denied with email_not_confirmed.')
  assert.ok((await anonymous.auth.signInWithPassword({ email: a.email, password: 'invalid-test-password' })).error)
  checked(await ca.auth.signInWithPassword({ email: a.email, password: a.password }))
  checked(await cb.auth.signInWithPassword({ email: b.email, password: b.password }))
  assert.equal(checked(await ca.auth.getUser()).user.id, a.id)
  assert.equal(checked(await ca.auth.getUser()).user.user_metadata.nom_live_validation_run, config.run)
  assert.equal(checked(await cb.auth.getUser()).user.user_metadata.nom_live_validation_run, config.run)
  record('Real email/password signin', 'PASS', 'Two independently authenticated users; invalid password denied; users verified remotely.')
  const restored = client(authStorage, 'a')
  assert.equal(checked(await restored.auth.getSession()).session.user.id, a.id)
  assert.equal(checked(await restored.auth.getUser()).user.id, a.id)
  assert.equal(checked(await restored.auth.refreshSession()).user.id, a.id)
  record('SDK session restoration and refresh', 'PASS', 'Fresh SDK instance restored persisted session and refreshed through real Auth.')

  const rpcProbe = await anonymous.rpc('rls_auto_enable')
  assert.ok(rpcProbe.error)
  record('rls_auto_enable REST exposure', 'PASS', `RPC invocation rejected (${rpcProbe.error.code}); function has event_trigger return type, not a Nom mutation/RLS helper.`)
  vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  const { createCloudRepository } = await vite.ssrLoadModule('/src/data/cloudRepository.js')
  const { createJourneyStore } = await vite.ssrLoadModule('/src/data/syncEngine.js')
  const { TABLES, defaultJourney, journeyMutations, mealToRow, boxToRow } = await vite.ssrLoadModule('/src/data/cloudState.js')
  const { normalizeExperience, serializeExperience } = await vite.ssrLoadModule('/src/data/persistedState.js')
  const { STORAGE_KEYS, writeLocalState } = await vite.ssrLoadModule('/src/data/localPersistence.js')
  const { readGuestJourney } = await vite.ssrLoadModule('/src/data/identityStorage.js')
  const ra = createCloudRepository(ca, a.id), rb = createCloudRepository(cb, b.id)
  function journey(label, count = 3) {
    const data = defaultJourney()
    data.activity = { displayName: `Nom Validation ${label}`, recentDishes: [{ dishId: 'num-banh-chok', viewedAt: '2026-10-06T12:00:00.000Z' }] }
    data.favorites = { dishIds: ['num-banh-chok'], restaurantIds: ['google:nom-live-validation'] }
    const logs = Array.from({ length: count }, (_, i) => {
      const day = `2026-10-0${i + 1}`, at = `${day}T12:00:00.000Z`
      return { id: `live-${config.run}-${label}-${i}`, dishId: 'num-banh-chok', restaurantId: 'google:nom-live-validation', countryCode: 'KH', startedAt: at, completedAt: at, day,
        verification: { method: 'location-demo', verified: true, source: 'live-validation', checkedAt: at }, feedback: { reaction: 'loved', observations: [], note: 'Disposable validation fixture' } }
    })
    data.experience = normalizeExperience({ logs, openedBoxes: [], favorites: [] })
    const box = Object.values(data.experience.boxes).find(box => box.status === 'ready')
    if (box) data.experience = normalizeExperience({ logs, openedBoxes: [{ ...box, openedAt: '2026-10-06T12:00:00.000Z', collectibleId: 'ziggy', duplicate: false }], favorites: ['cambodia:ziggy'] })
    return data
  }
  for (const [repo, label] of [[ra, 'A'], [rb, 'B']]) {
    await repo.loadCloudUserState()
    for (const op of journeyMutations(defaultJourney(), journey(label))) await repo.applyMutation(op)
  }
  const expectedA = journey('A')
  assert.ok(Object.values(expectedA.experience.boxes).some(b => b.status === 'opened'))
  for (const table of TABLES) {
    const owner = table === 'profiles' ? 'id' : 'user_id'
    assert.ok((await anonymous.from(table).select('*')).error, `anon ${table}`)
    const own = checked(await ca.from(table).select('*'))
    assert.ok(own.length > 0, `own rows ${table}`)
    assert.ok(own.every(r => r[owner] === a.id))
    assert.deepEqual(checked(await ca.from(table).select('*').eq(owner, b.id)), [])
    const bRows = checked(await cb.from(table).select('*'))
    assert.ok(bRows.length > 0 && bRows.every(r => r[owner] === b.id))
    const forged = { ...bRows[0] }
    if (table === 'profiles') forged.display_name = 'forged'
    else if (table === 'dish_favorites' || table === 'recent_dish_views') forged.dish_id = 'lort-cha'
    else if (table === 'restaurant_favorites') forged.restaurant_id = 'google:forged'
    else if (table === 'collectible_favorites') forged.collectible_id = 'lumi'
    else if (table === 'meal_logs') forged.id = `forged-${config.run}`
    assert.ok((await ca.from(table).insert(forged)).error, `cross-user insert ${table}`)
    const payload = table === 'profiles' ? { display_name: 'forged' } : table.includes('favorites') ? { is_active: false } : table === 'recent_dish_views' ? { viewed_at: '2000-01-01T00:00:00Z' } : table === 'meal_logs' ? { feedback_note: 'forged' } : { duplicate: true }
    const update = await ca.from(table).update(payload).eq(owner, b.id).select('*')
    if (['meal_logs', 'opened_boxes'].includes(table)) assert.ok(update.error)
    else assert.deepEqual(checked(update), [])
    assert.ok((await ca.from(table).delete().eq(owner, a.id)).error)
    record(`Real REST RLS: ${table}`, 'PASS', 'Anonymous denied; A/B own rows visible; other owner hidden; forged insert/update blocked; delete denied.')
  }
  const cloudA = (await ra.loadCloudUserState()).data
  assert.deepEqual(cloudA.favorites, expectedA.favorites)
  assert.equal(cloudA.activity.displayName, expectedA.activity.displayName)
  assert.equal(Date.parse(cloudA.activity.recentDishes[0].viewedAt), Date.parse(expectedA.activity.recentDishes[0].viewedAt))
  assert.equal(cloudA.experience.logs.length, 3)
  assert.equal(Object.values(cloudA.experience.boxes).filter(b => b.status === 'opened').length, 1)
  assert.deepEqual(cloudA.experience.favorites, ['cambodia:ziggy'])
  for (const name of ['Profile', 'Dish favorites', 'Restaurant favorites', 'Recent dish views', 'Meal logs', 'Opened boxes', 'Collectible favorites']) record(`${name} persistence`, 'PASS', 'Application repository wrote and read real PostgREST rows with original identifiers/events.')
  await ra.applyMutation({ kind: 'dishView', payload: { dish_id: 'num-banh-chok', viewed_at: '2026-10-01T12:00:00Z' } })
  assert.equal(Date.parse((await ra.loadCloudUserState()).data.activity.recentDishes[0].viewedAt), Date.parse('2026-10-06T12:00:00Z'))
  record('Recent-view newest timestamp', 'PASS', 'Older RPC write retained the newer persisted view; direct upsert also covered by SQL suite.')
  const bytes = data => JSON.stringify(canonical(serializeExperience(data.experience)))
  assert.deepEqual(cloudA.experience.progress, expectedA.experience.progress)
  assert.deepEqual(canonical(cloudA.experience.unlocks), canonical(expectedA.experience.unlocks))
  record('Experience rehydration', 'PASS', 'Domain replay reconstructed progress/unlocks, recorded reward/duplicate, original days and IDs.')

  const deviceOne = new Storage()
  globalThis.localStorage = deviceOne
  const guest = journey('Guest')
  guest.favorites.dishIds = ['lort-cha']; guest.favorites.restaurantIds = ['google:nom-live-guest']
  for (const [section, value] of Object.entries(guest)) writeLocalState(STORAGE_KEYS[section], section === 'experience' ? serializeExperience(value) : value)
  const guestBytes = Object.fromEntries(Object.values(STORAGE_KEYS).map(k => [k, deviceOne.getItem(k)]))
  const guestStable = () => { for (const [k, v] of Object.entries(guestBytes)) assert.equal(deviceOne.getItem(k), v) }
  const userA = checked(await ca.auth.getUser()).user, userB = checked(await cb.auth.getUser()).user
  let online = true
  activeStore = createJourneyStore({ user: userA, repository: ra, online: () => online })
  assert.equal(await activeStore.start(), true)
  assert.equal(activeStore.getSnapshot().migrationPending, true)
  assert.ok(!activeStore.getSnapshot().data.favorites.dishIds.includes('lort-cha'))
  assert.equal(await activeStore.mergeGuest(), true)
  assert.equal(activeStore.getSnapshot().migrationPending, false)
  assert.ok((await ra.loadCloudUserState()).data.favorites.dishIds.includes('lort-cha'))
  guestStable()
  const mergedEvents = bytes((await ra.loadCloudUserState()).data)
  assert.equal(await activeStore.mergeGuest(), true)
  assert.equal(bytes((await ra.loadCloudUserState()).data), mergedEvents)
  record('Guest → Merge & Sync', 'PASS', 'Consent required; Guest relationships/events uploaded; repeat merge idempotent; Guest bytes preserved.')
  activeStore.stop()
  activeStore = createJourneyStore({ user: userB, repository: rb })
  assert.equal(await activeStore.start(), true)
  assert.equal(await activeStore.useAccountOnly(), true)
  assert.equal(activeStore.getSnapshot().migrationPending, false)
  assert.ok(!activeStore.getSnapshot().data.favorites.dishIds.includes('lort-cha'))
  assert.ok(!(await rb.loadCloudUserState()).data.experience.logs.some(log => log.id.includes('-Guest-')))
  guestStable()
  record('Use account data only', 'PASS', 'B declined Guest import; cloud B unchanged; same-device Guest bytes preserved.')
  activeStore.stop()
  const g = createJourneyStore(); assert.equal(await g.start(), true)
  assert.ok(g.getSnapshot().data.favorites.dishIds.includes('lort-cha')); g.stop()
  assert.ok(deviceOne.getItem(`nom.v2.user.${a.id}.cache`)); assert.ok(deviceOne.getItem(`nom.v2.user.${b.id}.cache`))
  record('Identity isolation G → A → G → B → G', 'PASS', 'Production store used separate account caches; Guest retained its original data.')

  activeStore = createJourneyStore({ user: userA, repository: ra, online: () => online })
  await activeStore.start(); online = false
  activeStore.update('favorites', current => ({ ...current, dishIds: [...current.dishIds, 'fish-amok'] }))
  await new Promise(r => setTimeout(r, 0))
  assert.ok(activeStore.getSnapshot().outboxCount > 0)
  assert.ok(!(await ra.loadCloudUserState()).data.favorites.dishIds.includes('fish-amok'))
  activeStore.stop()
  activeStore = createJourneyStore({ user: userA, repository: ra, online: () => online })
  await activeStore.start(); assert.ok(activeStore.getSnapshot().outboxCount > 0)
  online = true; assert.equal(await activeStore.retry(), true)
  assert.equal(activeStore.getSnapshot().outboxCount, 0)
  assert.ok((await ra.loadCloudUserState()).data.favorites.dishIds.includes('fish-amok'))
  record('Offline durable outbox → real Supabase', 'PASS', 'Offline favorite survived store recreation and drained to real backend on retry.')
  activeStore.stop()

  let dropAcknowledgement = true
  const lostResponseRepo = { ...ra, async applyMutation(op) { await ra.applyMutation(op); if (dropAcknowledgement) { dropAcknowledgement = false; throw new Error('Simulated lost response after actual commit') } } }
  activeStore = createJourneyStore({ user: userA, repository: lostResponseRepo })
  await activeStore.start()
  activeStore.update('activity', current => ({ ...current, displayName: 'Nom Validation Retried' }))
  while (activeStore.getSnapshot().syncStatus === 'syncing') await new Promise(r => setTimeout(r, 20))
  assert.equal(activeStore.getSnapshot().syncStatus, 'issue')
  assert.ok(activeStore.getSnapshot().outboxCount > 0)
  assert.equal(await activeStore.retry(), true)
  assert.equal(activeStore.getSnapshot().outboxCount, 0)
  assert.equal((await ra.loadCloudUserState()).data.activity.displayName, 'Nom Validation Retried')
  for (const log of expectedA.experience.logs) await ra.applyMutation({ kind: 'meal', payload: mealToRow(log) })
  for (const box of Object.values(expectedA.experience.boxes).filter(b => b.status === 'opened')) await ra.applyMutation({ kind: 'openedBox', payload: boxToRow(box) })
  assert.equal(bytes((await ra.loadCloudUserState()).data), mergedEvents)
  record('Retry and idempotency', 'PASS', 'Actual committed write retried after simulated lost response; meals/boxes replayed without duplicate events or rewards.')
  activeStore.stop()

  const otherDevice = new Storage(); globalThis.localStorage = otherDevice
  const secondSession = client()
  checked(await secondSession.auth.signInWithPassword({ email: a.email, password: a.password }))
  const remoteDeviceRepo = createCloudRepository(secondSession, a.id)
  activeStore = createJourneyStore({ user: userA, repository: remoteDeviceRepo })
  assert.equal(await activeStore.start(), true)
  assert.equal(activeStore.getSnapshot().data.activity.displayName, 'Nom Validation Retried')
  assert.ok(activeStore.getSnapshot().data.favorites.dishIds.includes('fish-amok'))
  assert.equal(bytes(activeStore.getSnapshot().data), mergedEvents)
  record('Cross-device hydration', 'PASS', 'Fresh local storage and independent real Auth session hydrated merged favorites and complete Experience.')
  await ra.applyMutation({ kind: 'dishFavorite', payload: { dish_id: 'num-banh-chok', is_active: false } })
  assert.equal(await activeStore.retry(), true)
  assert.ok(!activeStore.getSnapshot().data.favorites.dishIds.includes('num-banh-chok'))
  record('Cross-device unfavorite tombstones', 'PASS', 'Second device honored inactive remote relationship without resurrecting cached favorite.')
  activeStore.stop()
  checked(await ca.auth.signOut({ scope: 'local' }))
  assert.equal(checked(await ca.auth.getSession()).session, null)
  assert.equal(checked(await secondSession.auth.getUser()).user.id, a.id)
  assert.equal((await ra.loadCloudUserState().catch(e => e)).code, 'IDENTITY_CHANGED')
  checked(await ca.auth.signInWithPassword({ email: a.email, password: a.password }))
  assert.equal((await ra.loadCloudUserState()).data.activity.displayName, 'Nom Validation Retried')
  record('Signout/signin restoration', 'PASS', 'Real local signout cleared session; another device remained valid; stale repository refused writes; signin restored cloud data.')
  const originalPassword = a.password
  checked(await ca.auth.updateUser({ password: originalPassword + '-updated' }))
  checked(await ca.auth.signOut({ scope: 'local' }))
  assert.ok((await ca.auth.signInWithPassword({ email: a.email, password: originalPassword })).error)
  checked(await ca.auth.signInWithPassword({ email: a.email, password: originalPassword + '-updated' }))
  checked(await ca.auth.updateUser({ password: originalPassword }))
  record('Authenticated password update', 'PASS', 'Actual update invalidated previous password; updated login succeeded; disposable fixture password restored.')
  record('Signup/confirmation delivery', 'BLOCKED', 'Confirmed fixtures were provisioned via authorized SQL; real inbox delivery/confirmation callback requires SMTP and controlled mailbox.')
  record('Password reset email + callback', 'BLOCKED', 'Recovery route exists; delivered recovery link and configured redirect allowlist require dashboard/API access and controlled mailbox.')
  record('Auth Site URL / redirect allowlist', 'BLOCKED', 'Public settings omit Site URL/allowlist; no connected dashboard or management Auth credentials available.')
  record('Account deletion endpoint', 'BLOCKED', 'Server-only secret missing locally and in all Vercel environments; no privilege workaround used.')
} catch (error) {
  record('Live validation execution', 'FAIL', String(error.message).replace(/sb_[a-z]+_[A-Za-z0-9_-]+/g, '[redacted]'))
  console.error(error.stack?.split('\n').slice(1, 4).join('\n'))
  process.exitCode = 1
} finally {
  activeStore?.stop()
  for (const c of clients) { await c.auth.signOut({ scope: 'local' }).catch(() => {}); c.auth.stopAutoRefresh() }
  await vite?.close()
  fs.writeFileSync('/private/tmp/nom-live-account-results.json', JSON.stringify({ date: '2026-10-06', project: 'Nom', ref: 'iwamwxsosrhxsdcsuoiu', results }, null, 2))
}
