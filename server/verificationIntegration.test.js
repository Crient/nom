import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { createVisitVerificationHandler } from './visitVerificationHandler.js'
import { signRestaurantQr, verificationSigningKey } from './restaurantQr.js'
import { createVisitVerificationApi } from '../src/data/liveVisitVerification.js'
import { mealToRow, mealFromRow } from '../src/data/cloudState.js'
import { createExperienceState, experienceReducer } from '../src/data/experienceState.js'
import { normalizeExperience } from '../src/data/persistedState.js'
import { fixtureSigningSecret } from '../src/test/verificationFixtures.js'

let db
const now = Date.parse('2026-10-07T12:00:00Z')
const restaurant = { id: 'google:trusted-place', name: 'Casa Portugal', address: '120 Cambridge Street Boston MA 02139', latitude: 42.37, longitude: -71.1 }
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;`)
  for (const name of ['202610060001_nom_accounts.sql', '20261006234854_nom_visit_verification.sql']) {
    await db.exec(readFileSync(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8'))
  }
}, 30000)
afterAll(async () => { await db?.close() })

async function fixture() {
  const owner = randomUUID(); await db.query('insert into auth.users values($1)', [owner])
  const repo = {
    ready: async () => true, user: async () => owner,
    budget: async subject => (await db.query('select public.consume_nom_verification_budget($1) as ok', [subject])).rows[0].ok,
    find: async id => (await db.query('select * from public.visit_verifications where visit_id=$1', [id])).rows[0],
    grant: async row => (await db.query('select public.issue_nom_visit_verification($1::jsonb) as result', [JSON.stringify(row)])).rows[0].result,
  }
  const handler = createVisitVerificationHandler({ now: () => now, repositoryFactory: () => repo,
    getConfig: () => ({ url: 'https://iwamwxsosrhxsdcsuoiu.supabase.co', secret: fixtureSigningSecret, placesKey: 'fixture-only',
      ocrKey: 'fixture-only', qrPartners: [restaurant.id] }), restaurantProvider: async () => restaurant,
    ocrFactory: () => ({ analyze: async () => ({ text: 'Casa Portugal\n120 Cambridge Street Boston MA 02139\n2026-10-07\nTOTAL 42.00', confidence: .98 }) }),
  })
  // Synthetic same-origin HTTP adapter. No Google, Supabase or mailbox calls.
  const fetchImpl = async (_, options) => {
    const req = { method: options.method ?? 'GET', body: options.body && JSON.parse(options.body), headers: {
      host: 'nom.test', origin: 'https://nom.test', ...Object.fromEntries(Object.entries(options.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])),
    } }
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v }, end(body) { this.body = JSON.parse(body) } }
    await handler(req, res)
    return { ok: res.statusCode === 200, status: res.statusCode, json: async () => res.body }
  }
  const api = createVisitVerificationApi({ fetchImpl, getToken: async () => 'synthetic-session' })
  const visit = { id: randomUUID(), dishId: 'lort-cha', restaurantId: restaurant.id, countryCode: 'KH', startedAt: new Date(now).toISOString() }
  return { owner, visit, api }
}
async function claim(owner, payload, token) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false)`)
  try { return await db.query('select public.record_nom_verified_meal($1::jsonb,$2)', [JSON.stringify(payload), token]) }
  finally { await db.exec('reset role') }
}
describe('verification client → actual handler → local PostgreSQL → hydration', () => {
  it.each(['location', 'qr', 'receipt'])('accepts controlled %s evidence once and restores account progress', async method => {
    const { owner, visit, api } = await fixture()
    expect(await api.capabilities()).toMatchObject({ location: true, qr: true, receipt: true })
    const evidence = method === 'location' ? { samples: [{ latitude: restaurant.latitude, longitude: restaurant.longitude, accuracy: 8, timestamp: now }] }
      : method === 'qr' ? { qrToken: signRestaurantQr({ restaurantId: restaurant.id, issuedAt: now / 1000, expiresAt: now / 1000 + 90, nonce: randomUUID() }, verificationSigningKey(fixtureSigningSecret)) }
        : { receipt: { type: 'image/jpeg', base64: Buffer.from([255, 216, 255, 224, 0, 2]).toString('base64') } }
    const result = await api.verify(visit, method, evidence)
    expect(result.result).toBe('verified'); expect(result.verification).toMatchObject({ verified: true, method, source: 'nom-server' })
    expect((await api.verify(visit, method, evidence)).verification.id).toBe(result.verification.id)
    const state = experienceReducer(experienceReducer(createExperienceState(), { type: 'start', draft: { ...visit,
      verification: result.verification, feedback: { reaction: 'loved', observations: [], note: 'Fixture meal' } } }),
      { type: 'complete', id: visit.id, at: new Date(now).toISOString(), day: '2026-10-07' })
    expect(state.progress.cambodia).toEqual({ meals: 1, count: 1 })
    const { verification_claim_token, ...row } = mealToRow(state.logs[0])
    await claim(owner, row, verification_claim_token); await claim(owner, row, verification_claim_token)
    // Match PostgREST's JSON transport: ISO timestamp strings and date-only local_day.
    const stored = JSON.parse(JSON.stringify((await db.query('select *,local_day::text as local_day from public.meal_logs where user_id=$1', [owner])).rows))
    expect(stored).toHaveLength(1)
    const restored = normalizeExperience({ logs: stored.map(mealFromRow), openedBoxes: [], favorites: [] })
    expect(restored.progress.cambodia).toEqual(state.progress.cambodia)
    expect(restored.logs[0].feedback.note).toBe('Fixture meal')
    const records = (await db.query('select * from public.visit_verifications where user_id=$1', [owner])).rows
    expect(JSON.stringify(records)).not.toMatch(/latitude|longitude|samples|base64|TOTAL 42/)
    await db.query('delete from auth.users where id=$1', [owner])
    expect((await db.query('select id from public.visit_verifications where user_id=$1', [owner])).rows).toEqual([])
    expect((await db.query('select id from public.meal_logs where user_id=$1', [owner])).rows).toEqual([])
  })
})
