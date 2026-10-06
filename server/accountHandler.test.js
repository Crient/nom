import { describe, expect, it, vi } from 'vitest'
import { createAccountHandler } from './accountHandler.js'

const config = { url: 'https://iwamwxsosrhxsdcsuoiu.supabase.co', secret: 'sb_secret_test' }
async function request(handler, method, headers = {}, url = '/api/account') {
  const res = { setHeader: vi.fn(), end: vi.fn() }; await handler({ method, headers, url }, res)
  return { status: res.statusCode, body: JSON.parse(res.end.mock.calls[0][0]), headers: res.setHeader.mock.calls }
}
function fixture() {
  const sdk = { auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'caller-A' } } })), admin: { deleteUser: vi.fn(async () => ({ error: null })) } } }
  return { sdk, handler: createAccountHandler({ getConfig: () => config, clientFactory: vi.fn(() => sdk) }) }
}
describe('server-only caller account deletion', () => {
  it('reports unconfigured honestly and disables deletion', async () => {
    const handler = createAccountHandler({ getConfig: () => ({}) })
    expect((await request(handler, 'GET')).body).toEqual({ deletionConfigured: false }); expect((await request(handler, 'DELETE')).status).toBe(503)
  })
  it('refuses a different Supabase project or public key', async () => {
    for (const value of [{ ...config, url: 'https://other.supabase.co' }, { ...config, secret: 'sb_publishable_mock' }]) expect((await request(createAccountHandler({ getConfig: () => value }), 'GET')).body.deletionConfigured).toBe(false)
  })
  it.each([{}, { authorization: 'token' }, { authorization: 'Bearer a b' }])('rejects missing or malformed bearer tokens', async headers => {
    const { handler, sdk } = fixture(); expect((await request(handler, 'DELETE', headers)).status).toBe(401); expect(sdk.auth.admin.deleteUser).not.toHaveBeenCalled()
  })
  it('validates token and deletes only the resolved caller, ignoring an arbitrary URL target', async () => {
    const { handler, sdk } = fixture(), result = await request(handler, 'DELETE', { authorization: 'Bearer test-token' }, '/api/account?user_id=UserB')
    expect(sdk.auth.getUser).toHaveBeenCalledWith('test-token'); expect(sdk.auth.admin.deleteUser).toHaveBeenCalledWith('caller-A')
    expect(result).toMatchObject({ status: 200, body: { deleted: true } }); expect(result.headers).toContainEqual(['Cache-Control', 'no-store'])
  })
  it('denies expired tokens and does not reveal auth errors', async () => {
    const { handler, sdk } = fixture(); sdk.auth.getUser.mockResolvedValue({ error: { message: 'private internal' }, data: {} })
    const result = await request(handler, 'DELETE', { authorization: 'Bearer expired' }); expect(result.status).toBe(401); expect(sdk.auth.admin.deleteUser).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toContain('private internal')
  })
  it('does not pretend deletion succeeded after an admin/network failure', async () => {
    const { handler, sdk } = fixture(); sdk.auth.admin.deleteUser.mockRejectedValue(new Error('internal'))
    expect((await request(handler, 'DELETE', { authorization: 'Bearer valid' })).status).toBe(502)
  })
  it('rejects unrelated methods', async () => { expect((await request(fixture().handler, 'POST')).status).toBe(405) })
})
