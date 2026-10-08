import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest'
let db
const ids = ['a', 'b', 'c', 'd'].map(letter => `00000000-0000-4000-8000-00000000000${letter}`)
const [a,b,c,d] = ids
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,is_anonymous boolean not null default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;`)
  for (const id of ids) await db.query('insert into auth.users(id) values($1)', [id])
  for (const file of ['202610060001_nom_accounts.sql','20261006234854_nom_visit_verification.sql']) {
    await db.exec(readFileSync(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'))
  }
  await db.query('insert into public.profiles(id,display_name) values($1,$2)',[a,'Private account name'])
  await db.query(`insert into public.meal_logs(user_id,id,dish_id,restaurant_id,country_code,started_at,completed_at,local_day,verification_method,verified,verification_source,verification_checked_at,feedback_reaction)
    values($1,'preserved-history','lort-cha','google:existing','KH',now(),now(),current_date,'unverified',false,'manual',now(),'liked')`,[a])
  await db.exec(readFileSync(new URL('../supabase/migrations/20261008051711_nom_friends.sql',import.meta.url),'utf8'))
}, 30000)
afterAll(async () => { await db?.close() })
async function asUser(id, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`)
  try { return await fn() } finally { await db.exec('reset role') }
}
async function rpc(owner, name, args = []) {
  return asUser(owner, async () => (await db.query(`select public.${name}(${args.map((_,index) => '$' + (index+1)).join(',')}) as result`, args)).rows[0].result)
}
const snapshot = owner => rpc(owner,'get_nom_social')
const request = (owner = a, handle = 'bravo') => rpc(owner,'send_nom_friend_request',[handle])
const respond = (owner,id,accept = true) => rpc(owner,'respond_nom_friend_request',[id,accept])
async function friends() { const id = await request(); await respond(b,id); return id }
const share = (owner = a, overrides = {}) => {
  const row = { id: randomUUID(), receiver: 'bravo', type: 'dish', content: 'lort-cha', dish: null, message: '', ...overrides }
  return rpc(owner,'send_nom_shared_item',Object.values(row))
}
beforeEach(async () => {
  await db.exec('truncate public.nom_social_profiles cascade')
  for (const [index,handle] of ['alpha','bravo','charlie','delta'].entries()) {
    await rpc(ids[index],'register_nom_social_profile',[handle,handle.toUpperCase()])
  }
})
describe('local PostgreSQL Friends migration: actual RPC/RLS/security', () => {
  it('is additive, keeps every account table, enables social RLS and removes DML/PUBLIC/anon privileges', async () => {
    expect((await db.query("select count(*)::int as count from pg_class where relnamespace='public'::regnamespace and relname in ('profiles','meal_logs','opened_boxes','visit_verifications')")).rows[0].count).toBe(4)
    const tables = ['nom_social_profiles','nom_friend_requests','nom_friendships','nom_shared_items']
    for (const table of tables) {
      expect((await db.query('select relrowsecurity from pg_class where relname=$1',[table])).rows[0].relrowsecurity).toBe(true)
      await asUser(a, async () => await expect(db.query(`delete from public.${table}`)).rejects.toThrow(/permission denied/))
    }
    const funcs = (await db.query("select p.oid::regprocedure::text as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('register_nom_social_profile','search_nom_users','send_nom_friend_request','respond_nom_friend_request','cancel_nom_friend_request','remove_nom_friend','send_nom_shared_item','open_nom_shared_item','get_nom_social','list_nom_shared_items')")).rows
    expect(funcs).toHaveLength(10)
    for (const { signature } of funcs) expect((await db.query('select has_function_privilege(\'anon\',$1,\'execute\') as allowed',[signature])).rows[0].allowed).toBe(false)
  })
  it('search returns only opt-in handle/name, with bounded prefix search and escaped wildcard input', async () => {
    expect(await rpc(a,'search_nom_users',['BR'])).toEqual([{handle:'bravo',display_name:'BRAVO'}])
    expect(await rpc(a,'search_nom_users',['%_'])).toEqual([])
    expect(await rpc(a,'search_nom_users',['b'])).toEqual([])
    expect(JSON.stringify(await snapshot(a))).not.toContain(a)
    expect((await asUser(a,() => db.query('select * from public.nom_social_profiles'))).rows).toHaveLength(1)
    await expect(rpc(a,'register_nom_social_profile',['changed','A'])).rejects.toThrow(/cannot be changed/)
    await expect(rpc(b,'register_nom_social_profile',['alpha','B'])).rejects.toThrow()
  })
  it('preserves existing private profiles/meal history and does not publish them into user search', async () => {
    expect((await asUser(a,()=>db.query('select display_name from public.profiles'))).rows).toEqual([{display_name:'Private account name'}])
    expect((await asUser(a,()=>db.query('select id,verified from public.meal_logs'))).rows).toEqual([{id:'preserved-history',verified:false}])
    expect(await rpc(b,'search_nom_users',['Private'])).toEqual([])
  })
  it('uses fixed empty search paths and only reviewed grants for privileged social functions', async () => {
    const functions = (await db.query("select p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='nom_social_private' or (n.nspname='public' and p.proname in ('register_nom_social_profile','search_nom_users','send_nom_friend_request','respond_nom_friend_request','cancel_nom_friend_request','remove_nom_friend','send_nom_shared_item','open_nom_shared_item','get_nom_social','list_nom_shared_items'))")).rows
    expect(functions).toHaveLength(12)
    for (const fn of functions) { expect(fn.prosecdef).toBe(true);expect(fn.proconfig).toContain('search_path=""') }
    await asUser(a,async()=>await expect(db.query('select nom_social_private.require_handle()')).rejects.toThrow(/permission denied/))
  })
  it('rejects anonymous clients, anonymous Auth users and users who did not opt in', async () => {
    await db.exec('set role anon')
    try { await expect(db.query('select public.get_nom_social()')).rejects.toThrow(/permission denied/); await expect(db.query('select * from public.nom_shared_items')).rejects.toThrow(/permission denied/) } finally { await db.exec('reset role') }
    const uid = randomUUID(); await db.query('insert into auth.users(id,is_anonymous) values($1,true)',[uid])
    await expect(rpc(uid,'register_nom_social_profile',['anonymous','Anon'])).rejects.toThrow(/Sign in/)
    await db.query('delete from public.nom_social_profiles where handle=\'delta\'')
    expect((await snapshot(d)).profile).toBeNull()
    await expect(request(d)).rejects.toThrow(/identity first/)
  })
  it('sends once, rejects self, non-existing and reverse pending duplicates; caller identity is derived', async () => {
    const id = await request(); expect(await request()).toBe(id)
    expect((await snapshot(b)).incoming[0].handle).toBe('alpha')
    expect((await snapshot(a)).outgoing[0].id).toBe(id)
    await expect(request(a,'alpha')).rejects.toThrow(/Invalid friend/)
    await expect(request(a,'missing')).rejects.toThrow(/Invalid friend/)
    await expect(request(b,'alpha')).rejects.toThrow(/incoming request/)
    await asUser(c, async () => { await expect(db.query('insert into public.nom_friend_requests(sender_handle,receiver_handle) values(\'alpha\',\'bravo\')')).rejects.toThrow(/permission denied/) })
  })
  it('only receiver accepts; friendship is mutual, unique and unrelated users cannot read it', async () => {
    const id = await request()
    await expect(respond(a,id)).rejects.toThrow(/unavailable/); await expect(respond(c,id)).rejects.toThrow(/unavailable/)
    await respond(b,id); await respond(b,id)
    expect((await snapshot(a)).friends.map(friend => friend.handle)).toEqual(['bravo'])
    expect((await snapshot(b)).friends.map(friend => friend.handle)).toEqual(['alpha'])
    expect((await asUser(c,() => db.query('select * from public.nom_friendships'))).rows).toEqual([])
    await asUser(c, async () => await expect(db.query('insert into public.nom_friendships(user_a,user_b) values(\'alpha\',\'charlie\')')).rejects.toThrow(/permission denied/))
    await expect(request()).rejects.toThrow(/Already friends/)
    expect((await db.query('select * from public.nom_friendships')).rows).toHaveLength(1)
  })
  it('declines without friendship, restricts cancellation to sender and rate-limits declined retries', async () => {
    const id = await request(); await respond(b,id,false); await respond(b,id,false)
    expect((await snapshot(a)).friends).toEqual([]); await expect(respond(b,id,true)).rejects.toThrow(/resolved/)
    await expect(request()).rejects.toThrow(/wait/)
    const another = await request(c); await expect(rpc(a,'cancel_nom_friend_request',[another])).rejects.toThrow(/unavailable/)
    await rpc(c,'cancel_nom_friend_request',[another]); expect((await snapshot(b)).incoming).toEqual([])
  })
  it('removes both sides, prevents old accept replay from restoring friendship and blocks further shares', async () => {
    const id = await friends(); await rpc(a,'remove_nom_friend',['bravo'])
    expect((await snapshot(a)).friends).toEqual([]); expect((await snapshot(b)).friends).toEqual([])
    await expect(respond(b,id)).rejects.toThrow(/resolved/); await expect(share()).rejects.toThrow(/accepted friend/)
    expect((await db.query('select * from public.nom_friendships')).rows).toHaveLength(0)
  })
  it('nonparticipant removal cannot remove somebody else’s friendship', async () => {
    await friends(); await rpc(c,'remove_nom_friend',['bravo']); expect((await snapshot(a)).friends).toHaveLength(1)
  })
  it.each(['dish','restaurant','recommendation'])('sends a %s stable reference and note only to an accepted friend', async type => {
    await expect(share(a,{type})).rejects.toThrow(/accepted friend/); await friends()
    const id = await share(a,{type,content: type === 'restaurant' ? 'google:venue' : 'lort-cha',dish:type === 'restaurant' ? 'lort-cha' : null,message:'Want to try this?'})
    const rows = (await asUser(b,() => db.query('select * from public.nom_shared_items'))).rows
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({id,content_type:type,sender_handle:'alpha',receiver_handle:'bravo',message:'Want to try this?',opened_at:null})
    expect((await rpc(b,'list_nom_shared_items'))[0].sender_name).toBe('ALPHA')
    expect((await snapshot(b)).unread).toBe(1)
  })
  it('isolates sent/received shares, blocks forged sends and sender/unrelated read-state changes', async () => {
    await friends(); const id = await share()
    expect((await asUser(a,() => db.query('select * from public.nom_shared_items'))).rows).toHaveLength(1)
    expect((await asUser(c,() => db.query('select * from public.nom_shared_items'))).rows).toEqual([])
    await expect(rpc(a,'open_nom_shared_item',[id])).rejects.toThrow(/unavailable/)
    await expect(rpc(c,'open_nom_shared_item',[id])).rejects.toThrow(/unavailable/)
    await asUser(c, async () => await expect(db.query('insert into public.nom_shared_items(id,sender_handle,receiver_handle,content_type,content_id) values($1,\'alpha\',\'bravo\',\'dish\',\'lort-cha\')',[randomUUID()])).rejects.toThrow(/permission denied/))
    await rpc(b,'open_nom_shared_item',[id]); const opened = (await rpc(b,'list_nom_shared_items'))[0].opened_at
    await rpc(b,'open_nom_shared_item',[id]); expect((await rpc(b,'list_nom_shared_items'))[0].opened_at).toBe(opened)
    expect((await snapshot(b)).unread).toBe(0)
  })
  it('send retries are idempotent; changed payload/recipient and oversized notes are rejected', async () => {
    await friends(); const id = randomUUID(); await share(a,{id,message:'hello'}); await share(a,{id,message:'hello'})
    expect((await rpc(b,'list_nom_shared_items'))).toHaveLength(1)
    await expect(share(a,{id,message:'changed'})).rejects.toThrow(/conflict/)
    await expect(share(a,{message:'x'.repeat(281)})).rejects.toThrow(/Invalid/)
    await share(a,{message:'🙂'.repeat(280)})
  })
  it('rejects malformed references and restaurant references without dish context', async () => {
    await friends()
    for (const overrides of [{type:'chat'}, {content:'https://evil.invalid'}, {type:'restaurant',content:'google:venue',dish:null}, {type:'restaurant',content:'qa-place',dish:'lort-cha'}]) {
      await expect(share(a,overrides)).rejects.toThrow()
    }
  })
  it('pages only owned inbox references in stable cursor order', async () => {
    await friends()
    for (let index = 0; index < 52; index++) await share(a,{message:String(index)})
    const first = await rpc(b,'list_nom_shared_items'), last = first.at(-1)
    const second = await rpc(b,'list_nom_shared_items',[last.created_at,last.id])
    expect(first).toHaveLength(50); expect(second).toHaveLength(2)
    expect(new Set([...first,...second].map(row => row.id)).size).toBe(52)
    expect(await rpc(c,'list_nom_shared_items')).toEqual([])
  })
  it('account deletion cascades pending requests, friendships and both directions of shares without orphaning accounts', async () => {
    const uid = randomUUID(); await db.query('insert into auth.users(id) values($1)',[uid]); await rpc(uid,'register_nom_social_profile',['disposable','Disposable'])
    const r = await request(uid); await respond(b,r)
    await share(uid); await rpc(b,'send_nom_shared_item',[randomUUID(),'disposable','dish','lort-cha',null,'back'])
    await request(uid,'charlie'); await request(a,'disposable')
    await db.query('delete from auth.users where id=$1',[uid])
    for (const table of ['nom_friend_requests','nom_shared_items']) expect((await db.query(`select * from public.${table} where 'disposable' in (sender_handle,receiver_handle)`)).rows).toEqual([])
    expect((await db.query("select * from public.nom_friendships where 'disposable' in (user_a,user_b)")).rows).toEqual([])
    expect((await db.query("select * from public.nom_social_profiles where handle='disposable'")).rows).toEqual([])
    expect((await snapshot(b)).friends).toEqual([])
    await expect(rpc(uid,'get_nom_social')).rejects.toThrow(/Sign in/)
    expect((await db.query('select count(*)::int as count from auth.users where id=any($1::uuid[])',[ids])).rows[0].count).toBe(4)
  })
})
