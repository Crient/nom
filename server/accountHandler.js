import { createClient } from '@supabase/supabase-js'

const NOM_URL = 'https://iwamwxsosrhxsdcsuoiu.supabase.co'

export function createAccountHandler({ getConfig = () => ({ url: process.env.VITE_SUPABASE_URL, secret: process.env.SUPABASE_SECRET_KEY }), clientFactory = createClient } = {}) {
  return async function accountHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    const reply = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)) }
    const config = getConfig()
    const configured = config?.url?.replace(/\/$/, '') === NOM_URL && typeof config?.secret === 'string' && config.secret.startsWith('sb_secret_')
    if (req.method === 'GET') return reply(200, { deletionConfigured: configured })
    if (req.method !== 'DELETE') { res.setHeader('Allow', 'GET, DELETE'); return reply(405, { error: 'Method not allowed' }) }
    if (!configured) return reply(503, { error: 'Account deletion is not configured' })
    // No user_id, query, or body target is accepted. Resolve the caller remotely.
    const header = req.headers?.authorization
    const token = typeof header === 'string' ? /^Bearer ([^\s]{1,8192})$/.exec(header)?.[1] : null
    if (!token) return reply(401, { error: 'Sign in required' })
    try {
      const client = clientFactory(NOM_URL, config.secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
      const { data, error } = await client.auth.getUser(token)
      if (error || !data?.user?.id) return reply(401, { error: 'Sign in required' })
      const result = await client.auth.admin.deleteUser(data.user.id)
      if (result.error) return reply(502, { error: 'Account deletion could not complete' })
      return reply(200, { deleted: true })
    } catch { return reply(502, { error: 'Account deletion could not complete' }) }
  }
}
