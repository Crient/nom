import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(new URL('../supabase/migrations/202610060001_nom_accounts.sql', import.meta.url), 'utf8')
const tables = ['profiles','dish_favorites','restaurant_favorites','recent_dish_views','meal_logs','opened_boxes','collectible_favorites']
describe('migration contract (static; not a live PostgreSQL RLS execution)', () => {
  it('defines only the seven account tables and no destructive migration', () => {
    expect([...sql.matchAll(/create table public\.(\w+)/g)].map(match => match[1])).toEqual(tables)
    expect(sql).not.toMatch(/\bdrop\s+(table|schema|database|function)\b/i)
    expect(sql).toContain('iwamwxsosrhxsdcsuoiu')
  })
  it.each(tables)('enables RLS, cascading ownership, and own-row policies on %s', table => {
    expect(sql).toContain(`alter table public.${table} enable row level security`)
    const owner = table === 'profiles' ? 'id' : 'user_id'
    expect(sql).toContain(`create policy ${table}_select on public.${table} for select to authenticated using ((select auth.uid()) = ${owner})`)
    expect(sql).toContain(`create policy ${table}_insert on public.${table} for insert to authenticated with check ((select auth.uid()) = ${owner})`)
    const block = sql.slice(sql.indexOf(`create table public.${table}`)).split('\n);')[0]
    expect(block).toContain('references auth.users(id) on delete cascade')
  })
  it('revokes default access and grants immutable events only select/insert', () => {
    expect(sql).toContain('from public, anon, authenticated;')
    expect(sql).toContain('grant select, insert on public.meal_logs, public.opened_boxes to authenticated;')
    for (const table of ['meal_logs', 'opened_boxes']) expect(sql).not.toMatch(new RegExp(`create policy ${table}_(update|delete)`))
  })
  it('uses invoker functions with fixed search paths and atomic greatest timestamps', () => {
    expect(sql).not.toContain('security definer')
    expect([...sql.matchAll(/create function public\./g)]).toHaveLength(3)
    expect([...sql.matchAll(/security invoker set search_path = ''/g)]).toHaveLength(3)
    expect(sql).toContain('greatest(public.recent_dish_views.viewed_at, excluded.viewed_at)')
    expect(sql).toContain('clock_timestamp()')
  })
})
