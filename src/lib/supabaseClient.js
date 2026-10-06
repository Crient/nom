export const NOM_SUPABASE_REF = 'iwamwxsosrhxsdcsuoiu'
const AUTH_STORAGE_KEY = 'nom.auth.supabase'
let clientPromise

export function supabaseConfiguration(env = import.meta.env) {
  const url = (env.VITE_SUPABASE_URL ?? '').trim()
  const publishableKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
  if (!url || !publishableKey) return null
  let parsed
  try { parsed = new URL(url) } catch { return null }
  if (parsed.username || parsed.password) return null
  const productionProject = parsed.origin === `https://${NOM_SUPABASE_REF}.supabase.co`
  const localProject = env.DEV && ['http:', 'https:'].includes(parsed.protocol) && ['localhost', '127.0.0.1'].includes(parsed.hostname)
  if ((!productionProject && !localProject) || !publishableKey.startsWith('sb_publishable_')) return null
  return { url: parsed.origin, publishableKey }
}

export function removeProviderTokens(session) {
  if (!session || typeof session !== 'object') return session
  const { provider_token, provider_refresh_token, ...nomSession } = session
  return nomSession
}

const authStorage = {
  getItem(key) { try { return globalThis.localStorage?.getItem(key) ?? null } catch { return null } },
  setItem(key, value) {
    try {
      let clean = value
      try { clean = JSON.stringify(removeProviderTokens(JSON.parse(value))) } catch { /* PKCE verifier is a string. */ }
      globalThis.localStorage?.setItem(key, clean)
    } catch { /* SDK can still use the current session in memory. */ }
  },
  removeItem(key) { try { globalThis.localStorage?.removeItem(key) } catch { /* Storage unavailable. */ } },
}

export function clearNomAuthStorage() {
  authStorage.removeItem(AUTH_STORAGE_KEY)
  authStorage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`)
}

export async function createNomSupabaseClient(config) {
  if (!config) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(config.url, config.publishableKey, {
    auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true,
      autoRefreshToken: true, storageKey: AUTH_STORAGE_KEY, storage: authStorage },
  })
}

export function getSupabaseClient() {
  clientPromise ??= createNomSupabaseClient(supabaseConfiguration())
  return clientPromise
}
