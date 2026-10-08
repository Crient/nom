import { TABLES, cloudRowsToJourney, normalizeLegacyMealPayload } from './cloudState'

function checked(result) {
  if (result.error) {
    const error = new Error('Cloud request failed. Retry when your connection and account setup are ready.')
    error.code = /^[A-Za-z0-9_-]+$/.test(result.error.code ?? '') ? result.error.code : 'CLOUD_REQUEST_FAILED'
    throw error
  }
  return result.data
}

export function createCloudRepository(client, userId, avatarUrl = null) {
  const avatar = typeof avatarUrl === 'string' && /^https:\/\//.test(avatarUrl) && avatarUrl.length <= 2048 ? avatarUrl : null
  async function assertIdentity() {
    const response = await client.auth.getSession()
    if (response.error || response.data.session?.user?.id !== userId) {
      const error = new Error('Account identity changed. Pending changes stay in their original account cache.')
      error.code = 'IDENTITY_CHANGED'; throw error
    }
  }
  async function readTable(table) {
    const rows = [], owner = table === 'profiles' ? 'id' : 'user_id'
    const order = { profiles: 'id', dish_favorites: 'dish_id', restaurant_favorites: 'restaurant_id', recent_dish_views: 'dish_id',
      meal_logs: 'id', opened_boxes: 'box_id', collectible_favorites: 'country_id' }[table]
    for (let start = 0; start < 100000; start += 500) {
      let request = client.from(table).select('*').eq(owner, userId).order(order)
      if (table === 'collectible_favorites') request = request.order('collectible_id')
      const page = checked(await request.range(start, start + 499)) ?? []
      rows.push(...page)
      if (page.length < 500) return rows
    }
    throw new Error('Account history is too large to load in one session.')
  }
  return {
    async loadCloudUserState() {
      await assertIdentity()
      // This is application-driven automatic profile creation, not a fragile
      // trigger on auth.users. Existing meaningful profiles are never replaced.
      checked(await client.from('profiles').upsert({ id: userId, display_name: 'Explorer', avatar_url: avatar }, { onConflict: 'id', ignoreDuplicates: true }))
      const entries = await Promise.all(TABLES.map(async table => [table, await readTable(table)]))
      await assertIdentity()
      const rows = Object.fromEntries(entries)
      return { data: cloudRowsToJourney(rows), profile: rows.profiles[0] ?? null }
    },
    async applyMutation(mutation) {
      await assertIdentity()
      const { kind, payload } = mutation
      if(kind==='meal'){
        const {verification_claim_token,...meal}=normalizeLegacyMealPayload(payload)
        if(meal.verified){
          if(!verification_claim_token)throw new Error('Verified meal requires its server-issued claim')
          checked(await client.rpc('record_nom_verified_meal',{p_meal:meal,p_claim_token:verification_claim_token}));return
        }
        checked(await client.from('meal_logs').upsert({...meal,user_id:userId},{onConflict:'user_id,id',ignoreDuplicates:true}));return
      }
      if (kind === 'dishView') {
        checked(await client.rpc('record_nom_dish_view', { p_dish_id: payload.dish_id, p_viewed_at: payload.viewed_at })); return
      }
      if (kind === 'profile') {
        checked(await client.from('profiles').upsert({ ...payload, id: userId }, { onConflict: 'id' })); return
      }
      const tables = { dishFavorite: ['dish_favorites', 'dish_id'], restaurantFavorite: ['restaurant_favorites', 'restaurant_id'],
        collectibleFavorite: ['collectible_favorites', 'country_id,collectible_id'], meal: ['meal_logs', 'id'], openedBox: ['opened_boxes', 'box_id'] }
      const spec = tables[kind]
      if (!spec) throw new Error('Unknown sync mutation')
      let row = { ...payload, user_id: userId }
      if (kind === 'collectibleFavorite') {
        const [country_id, collectible_id] = payload.collectible_key.split(':')
        row = { user_id: userId, country_id, collectible_id, is_active: payload.is_active }
      }
      checked(await client.from(spec[0]).upsert(row, { onConflict: `user_id,${spec[1]}`, ignoreDuplicates: kind === 'meal' || kind === 'openedBox' }))
    },
  }
}
