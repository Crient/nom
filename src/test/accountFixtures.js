import { vi } from 'vitest'
import { TABLES } from '../data/cloudState'

export const USER_A = { id: '00000000-0000-4000-8000-00000000000a', email: 'a@example.test', user_metadata: {}, app_metadata: { provider: 'email' } }
export const USER_B = { ...USER_A, id: '00000000-0000-4000-8000-00000000000b', email: 'b@example.test' }
export const at = '2026-10-06T12:00:00.000Z'
export function meal(id = 'visit-one', day = '2026-10-06') {
  return { id, dishId: 'num-banh-chok', restaurantId: 'google:nom-test-place', countryCode: 'KH', startedAt: at, completedAt: `${day}T12:00:00.000Z`, day,
    verification: { method: 'location-demo', verified: true, source: 'development', checkedAt: at },
    feedback: { reaction: 'loved', observations: [], note: 'Tasty' } }
}

/** Mock SDK/REST transport; this is NOT a substitute for PostgreSQL RLS tests. */
export function mockSupabase(initialUser = null, database) {
  const rows = database ?? Object.fromEntries(TABLES.map(table => [table, []]))
  let session = initialUser ? { user: initialUser, access_token: 'test-access', refresh_token: 'test-refresh' } : null
  const listeners = new Set(), writes = [], requests = [], client = { rows, writes, requests, fail: false, beforeWrite: null }
  const emit = (user, event = user ? 'SIGNED_IN' : 'SIGNED_OUT') => {
    session = user ? { user, access_token: 'test-access', refresh_token: 'test-refresh', provider_token: 'never-store-google-token' } : null
    for (const listener of listeners) listener(event, session)
  }
  client.emit = emit
  client.auth = {
    getSession: vi.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: vi.fn(listener => { listeners.add(listener); return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } } }),
    signInWithOAuth: vi.fn(async () => ({ data: { url: 'https://example.test/oauth' }, error: null })),
    signUp: vi.fn(async () => ({ data: { user: USER_A, session: null }, error: null })),
    signInWithPassword: vi.fn(async () => { emit(USER_A); return { data: { session }, error: null } }),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    updateUser: vi.fn(async () => ({ data: { user: session?.user }, error: null })),
    exchangeCodeForSession: vi.fn(async () => { emit(USER_A); return { data: { session }, error: null } }),
    refreshSession: vi.fn(async () => ({ data: { session }, error: null })),
    signOut: vi.fn(async () => { emit(null); return { error: null } }),
  }
  client.from = vi.fn(table => {
    const filters = [], orders = []
    const query = {
      select() { return query }, eq(key, value) { filters.push([key, value]); return query }, order(key) { orders.push(key); return query },
      async range(start, end) {
        requests.push({ table, filters: [...filters] })
        if (client.fail) return { error: { code: 'NETWORK' } }
        return { data: rows[table].filter(row => filters.every(([key, value]) => row[key] === value))
          .sort((a, b) => { for (const key of orders) { const n = String(a[key]).localeCompare(String(b[key])); if (n) return n } return 0 }).slice(start, end + 1), error: null }
      },
      async upsert(row, options) {
        await client.beforeWrite?.(table, row)
        if (client.fail) return { error: { code: 'NETWORK' } }
        writes.push({ table, row: structuredClone(row), options })
        const keys = options.onConflict.split(','), found = rows[table].find(item => keys.every(key => item[key] === row[key]))
        if (found && !options.ignoreDuplicates) Object.assign(found, row, { updated_at: new Date().toISOString() })
        else if (!found) rows[table].push({ ...row, updated_at: new Date().toISOString() })
        return { data: null, error: null }
      },
    }
    return query
  })
  client.rpc = vi.fn(async (name, args) => {
    if (client.fail) return { error: { code: 'NETWORK' } }
    const user_id = session?.user.id, row = rows.recent_dish_views.find(item => item.user_id === user_id && item.dish_id === args.p_dish_id)
    writes.push({ rpc: name, args })
    if (row) { if (Date.parse(row.viewed_at) < Date.parse(args.p_viewed_at)) row.viewed_at = args.p_viewed_at }
    else rows.recent_dish_views.push({ user_id, dish_id: args.p_dish_id, viewed_at: args.p_viewed_at })
    return { data: null, error: null }
  })
  return client
}
