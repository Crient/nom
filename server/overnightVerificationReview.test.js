import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { describe, it, expect, vi } from 'vitest'
import { verifyLocation, verifyReceipt } from './verificationPolicy.js'
import { signRestaurantQr, validateRestaurantQr, verificationSigningKey } from './restaurantQr.js'
import { decodeReceiptUpload } from './receiptOcrProvider.js'
import { collectFreshLocation } from '../src/data/liveVisitVerification.js'
import { fixtureSigningSecret } from '../src/test/verificationFixtures.js'
import { signProof } from './verificationSignature.js'

// Offline investigation evidence; none of these fixtures reaches a provider.
const now = Date.parse('2026-10-07T12:00:00Z')
const venue = { id: 'google:trusted-place', name: 'Café Casa & Co', address: '120 Cambridge Street Boston MA 02139', latitude: 0, longitude: 0 }
const hash = s => createHash('sha256').update(s).digest('hex')
const sample = (meters = 0, extra = {}) => ({ latitude: meters / (3958.7613 * 1609.344 * Math.PI / 180), longitude: 0, accuracy: 0, timestamp: now, ...extra })
const receipt = date => `CAFE CASA AND CO\n120 Cambridge Street Boston MA 02139\n${date}\nTOTAL 42.00`

describe('overnight controlled evidence boundaries', () => {
  it.each([[149.99, 'verified'], [150, 'verified'], [150.01, 'too_far'], [1000000, 'too_far']])('geofence at %s meters is %s', (distance, result) => {
    expect(verifyLocation([sample(distance)], venue, now).result).toBe(result)
  })
  it.each([[179.99, 'verified'], [180.01, 'too_far']])('caps the accuracy allowance at 30 meters (%s)', (distance, result) => {
    expect(verifyLocation([sample(distance, { accuracy: 100 })], venue, now).result).toBe(result)
  })
  it.each([null, [], [sample(0, { latitude: NaN })], [sample(0, { accuracy: -1 })], [sample(0, { timestamp: now - 30001 })], Array(4).fill(sample())])('fails closed for malformed or expired samples %#', samples => {
    expect(verifyLocation(samples, venue, now).result).not.toBe('verified')
  })
  it('cancels stalled GPS without extra samples or waiting for the full timeout', async () => {
    const controller = new AbortController(), geolocation = { getCurrentPosition: vi.fn() }
    const pending = collectFreshLocation({ geolocation, signal: controller.signal })
    await Promise.resolve()
    controller.abort()
    expect(await pending).toEqual({ result: 'cancelled' })
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1)
  })
  const key = verificationSigningKey(fixtureSigningSecret)
  const qr = extra => ({ restaurantId: venue.id, nonce: randomUUID(), issuedAt: now / 1000, expiresAt: now / 1000 + 90, ...extra })
  it.each([
    [{ issuedAt: now / 1000 + 3 }, 'invalid_code'],
    [{ expiresAt: now / 1000 }, 'invalid_code'],
    [{ issuedAt: now / 1000 - 100, expiresAt: now / 1000 - 1 }, 'expired_code'],
    [{ expiresAt: now / 1000 + 121 }, 'invalid_code'],
    [{ restaurantId: 'google:other-place' }, 'wrong_restaurant'],
    [{ nonce: 'not-a-uuid' }, 'invalid_code'],
  ])('rejects invalid signed QR metadata %#', (extra, result) => {
    expect(validateRestaurantQr(signRestaurantQr(qr(extra), key), venue.id, key, now).result).toBe(result)
  })
  it('rejects a QR restaurant changed without resigning, and malformed ordinary codes', () => {
    const parts = signRestaurantQr(qr(), key).split('.')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url'))
    parts[1] = Buffer.from(JSON.stringify({ ...payload, restaurantId: 'google:other-place' })).toString('base64url')
    for (const token of [parts.join('.'), '', 'nomqr1.bad.bad', 'https://restaurant.example/menu', signRestaurantQr(qr(), Buffer.alloc(32))]) {
      expect(validateRestaurantQr(token, venue.id, key, now).result).toBe('invalid_code')
    }
  })
  it('accepts normalized merchant accents, punctuation and the matching branch', () => {
    expect(verifyReceipt({ text: receipt('2026-10-07'), confidence: .85 }, venue, now).result).toBe('verified')
  })
  it.each([
    ['', 'could_not_verify'], ['2026-10-01', 'old_receipt'], ['2026-10-08', 'old_receipt'],
    ['2026-02-30', 'old_receipt'], ['2026-10-07\n2026-10-06', 'could_not_verify'],
  ])('rejects missing, old, future, invalid or ambiguous receipt dates %#', (date, result) => {
    expect(verifyReceipt({ text: receipt(date), confidence: .98 }, venue, now).result).toBe(result)
  })
  it.each([.849, 1.1, NaN])('rejects unreadable/untrusted OCR confidence %s', confidence => {
    expect(verifyReceipt({ text: receipt('2026-10-07'), confidence }, venue, now).result).toBe('could_not_verify')
  })
  it('does not accept another merchant or branch', () => {
    for (const text of [receipt('2026-10-07').replace('CAFE CASA AND CO', 'OTHER MERCHANT'), receipt('2026-10-07').replace('120 Cambridge Street Boston MA 02139', '900 Ocean Avenue Miami FL 33101')]) {
      expect(verifyReceipt({ text, confidence: .99 }, venue, now).result).toBe('wrong_restaurant')
    }
  })
  it.each([
    { type: 'image/svg+xml', base64: Buffer.from('<svg onload="alert(1)"/>').toString('base64') },
    { type: 'image/jpeg', base64: '!!!!' }, { type: 'image/png', base64: '' },
    { type: 'image/jpeg', base64: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64') },
    { type: 'image/jpeg', base64: Buffer.concat([Buffer.from([255, 216, 255]), Buffer.alloc(2000000)]).toString('base64') },
  ])('rejects malicious, mismatched or oversized upload %# before OCR', upload => {
    expect(() => decodeReceiptUpload(upload)).toThrow(/Invalid receipt/)
  })
})

async function database(verification = true) {
  const db = new PGlite()
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;`)
  await db.exec(readFileSync(new URL('../supabase/migrations/202610060001_nom_accounts.sql', import.meta.url), 'utf8'))
  if (verification) await migrate(db)
  return db
}
const migrate = db => db.exec(readFileSync(new URL('../supabase/migrations/20261006234854_nom_visit_verification.sql', import.meta.url), 'utf8'))
async function asUser(db, owner, fn) {
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false)`)
  try { return await fn() } finally { await db.exec('reset role') }
}
async function legacyMeal(db, owner, id, method = 'location-demo') {
  await asUser(db, owner, () => db.query(`insert into public.meal_logs(user_id,id,dish_id,restaurant_id,country_code,started_at,completed_at,local_day,verification_method,verified,verification_source,verification_checked_at,feedback_reaction,feedback_note)
    values($1,$2,'lort-cha','google:trusted-place','KH',now(),now(),current_date,$3,$4,'development',now(),'loved','Keep my history')`, [owner, id, method, method !== 'unverified']))
}
async function verifiedMeal(db, owner, dish) {
  const token = 'a'.repeat(43), at = new Date(now).toISOString()
  const p = { id: randomUUID(), visit_id: randomUUID(), user_id: owner, subject_hash: hash(owner), claim_hash: hash(token), dish_id: dish,
    restaurant_id: venue.id, country_code: 'KH', method: 'location', verified_at: at, distance_meters: 0, accuracy_meters: 8,
    receipt_confidence: null, qr_nonce: null, evidence_hash: null, image_hash: null, version: 1 }
  Object.assign(p, signProof(p, fixtureSigningSecret))
  await db.query('select public.issue_nom_visit_verification($1::jsonb)', [JSON.stringify(p)])
  await asUser(db, owner, () => db.query('select public.record_nom_verified_meal($1::jsonb,$2)', [JSON.stringify({ id: p.visit_id, dish_id: dish, restaurant_id: venue.id, country_code: 'KH',
    started_at: at, verification_id: p.id, feedback_reaction: 'loved', feedback_observations: [], feedback_note: '' }), token]))
  return p
}
describe('migration compatibility regression (local PostgreSQL)', () => {
  it('legacy openings no longer consume new verified credits or steer reward selection', async () => {
    const db = await database(false), owner = randomUUID(), id = randomUUID()
    try {
      await db.query('insert into auth.users values($1)', [owner]); await legacyMeal(db, owner, id)
      await asUser(db, owner, () => db.query("insert into public.opened_boxes values($1,$2,$3,'cambodia','ziggy',false,now())", [owner, 'box-' + id, id]))
      await migrate(db)
      const legacy = (await db.query('select verified,verification_status,feedback_note from public.meal_logs where id=$1', [id])).rows[0]
      expect(legacy).toEqual({ verified: false, verification_status: 'unverified', feedback_note: 'Keep my history' })
      let proof
      for (const dish of ['lort-cha', 'fish-amok', 'num-banh-chok']) proof = await verifiedMeal(db, owner, dish)
      expect((await db.query('select count(*)::int as n from public.meal_logs where verified')).rows[0].n).toBe(3)
      // BEFORE: the previous guard counted all openings: used=1, credits=1,
      // rejecting the first genuinely earned box. Freeze that calculation here.
      const before = (await db.query("select (select count(*) from public.opened_boxes where user_id=$1) as used,(select count(distinct(dish_id,local_day))/3 from public.meal_logs where user_id=$1 and verified) as credits", [owner])).rows[0]
      expect(Number(before.used)).toBe(1); expect(Number(before.credits)).toBe(1)
      const insert = () => db.query("insert into public.opened_boxes values($1,$2,$3,'cambodia','lumi',true,now()) on conflict(user_id,box_id) do nothing", [owner, 'box-' + proof.visit_id, proof.visit_id])
      const sql=readFileSync(new URL('../supabase/migrations/20261006234854_nom_visit_verification.sql',import.meta.url),'utf8')
      const revised=sql.match(/create function nom_private\.guard_verified_box\(\)[\s\S]*?end \$\$;/)[0].replace('create function','create or replace function')
      await db.exec(readFileSync(new URL('./test-fixtures/pre-revision-box-guard.sql',import.meta.url),'utf8'))
      await asUser(db,owner,()=>expect(insert()).rejects.toThrow(/No verified box credit/))
      await db.exec(revised)
      await asUser(db, owner, insert); await asUser(db, owner, insert)
      expect((await db.query('select collectible_id,duplicate from public.opened_boxes where visit_id=$1', [proof.visit_id])).rows).toEqual([{collectible_id:'ziggy',duplicate:false}])
      expect((await db.query('select count(*)::int as n from public.opened_boxes')).rows[0].n).toBe(2)
    } finally { await db.close() }
  }, 30000)
  it('migration-first accepts current-HEAD simulated writes as unverified legacy history', async () => {
    const db = await database(), owner = randomUUID()
    try {
      await db.query('insert into auth.users values($1)', [owner])
      const id=randomUUID();await legacyMeal(db, owner, id)
      expect((await db.query('select verified,verification_method,verification_source,feedback_note from public.meal_logs where id=$1',[id])).rows[0])
        .toEqual({verified:false,verification_method:'unverified',verification_source:'legacy',feedback_note:'Keep my history'})
    } finally { await db.close() }
  }, 30000)
  it('keeps old unverified writes inside the Production hydration whitelist', async () => {
    const db = await database(), owner = randomUUID(), id = randomUUID()
    try {
      await db.query('insert into auth.users values($1)', [owner]); await legacyMeal(db, owner, id, 'unverified')
      expect((await db.query('select verification_method,verified from public.meal_logs where id=$1', [id])).rows[0]).toEqual({ verification_method: 'unverified', verified: false })
    } finally { await db.close() }
  }, 30000)
  it('proves app-first sends columns missing from the account-only schema', async () => {
    const db = await database(false)
    try { await expect(db.query('select verification_status from public.meal_logs')).rejects.toThrow(/does not exist/) }
    finally { await db.close() }
  }, 30000)
})
