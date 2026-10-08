import { describe, expect, it, vi } from 'vitest'
import { createSocialRepository, socialError } from './socialRepository'
import { normalizeSharedContent, sharedItemDestination } from './sharedContent'
function client() { return { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'current' } } } }) }, rpc: vi.fn().mockResolvedValue({data:[]}) } }
describe('social repository: safe references, caller checks and RPC boundary', () => {
  it.each(['dish','recommendation','restaurant'])('sends %s reference without accepting a spoofed sender', async type => {
    const sdk = client(), repo = createSocialRepository(sdk,'current')
    const content = { type, id: type === 'restaurant' ? 'google:place' : 'lort-cha', ...(type === 'restaurant' ? {dishId:'lort-cha'} : {}), coordinates:{latitude:1,longitude:2}, profile:{email:'private'}, title:'not stored' }
    await repo.send({id:'request',receiver:'friend',content,message:'A note',sender:'forged'})
    expect(sdk.rpc).toHaveBeenCalledWith('send_nom_shared_item',{p_id:'request',p_receiver:'friend',p_content_type:type,p_content_id:content.id,p_dish_id:content.dishId??null,p_message:'A note'})
    expect(JSON.stringify(sdk.rpc.mock.calls)).not.toMatch(/email|coordinates|forged|not stored/)
  })
  it('rejects an overlong note or malformed reference before a network mutation', async () => {
    const sdk = client(), repo = createSocialRepository(sdk,'current')
    expect(() => repo.send({content:{type:'dish',id:'lort-cha'},message:'x'.repeat(281)})).toThrow(/280/)
    expect(() => repo.send({content:{type:'restaurant',id:'https://evil.invalid'}})).toThrow(/valid item/)
    expect(sdk.rpc).not.toHaveBeenCalled()
  })
  it('rejects identity changes before sending and discards responses after switching accounts', async () => {
    const sdk = client(), repo = createSocialRepository(sdk,'other')
    await expect(repo.search('name')).rejects.toThrow(/account changed/); expect(sdk.rpc).not.toHaveBeenCalled()
    const own = createSocialRepository(sdk,'current')
    sdk.auth.getSession.mockResolvedValueOnce({data:{session:{user:{id:'current'}}}}).mockResolvedValueOnce({data:{session:{user:{id:'next'}}}})
    await expect(own.search('name')).rejects.toThrow(/account changed/)
  })
  it('reports unapplied schema honestly and never exposes backend errors', async () => {
    const sdk = client(), repo = createSocialRepository(sdk,'current')
    sdk.rpc.mockResolvedValue({error:{code:'PGRST202',message:'raw backend details'}})
    await expect(repo.load()).rejects.toThrow(/Friends setup is not available/)
    expect(socialError({code:'23505'})).toContain('handle is taken')
    expect(socialError({code:'42501'})).not.toContain('raw')
  })
  it('loads the authenticated snapshot and pages inbox without querying private profiles', async () => {
    const sdk = client(), repo = createSocialRepository(sdk,'current')
    sdk.rpc.mockResolvedValueOnce({data:{profile:{handle:'me',display_name:'Me'},friends:[],unread:51}}).mockResolvedValueOnce({data:Array.from({length:50},(_,i)=>({id:i}))})
    const snapshot = await repo.load(); expect(snapshot.hasMore).toBe(true); expect(snapshot.unread).toBe(51)
    await repo.older({created_at:'2026-10-08T00:00:00Z',id:'id'})
    expect(sdk.rpc).toHaveBeenLastCalledWith('list_nom_shared_items',{p_before:'2026-10-08T00:00:00Z',p_before_id:'id'})
  })
  it.each([['dish','lort-cha',null,'/recommendations/lort-cha?shared=1'],['recommendation','lort-cha',null,'/recommendations/lort-cha?shared=1'],['restaurant','google:venue','lort-cha','/recommendations/lort-cha/nearby/google%3Avenue?shared=1']])('opens a canonical %s reference safely', (content_type,content_id,dish_id,destination) => {
    expect(sharedItemDestination({content_type,content_id,dish_id})).toBe(destination)
  })
  it.each([{content_type:'dish',content_id:'missing-catalog-dish'},{content_type:'restaurant',content_id:'https://evil.invalid',dish_id:'lort-cha'},{content_type:'chat',content_id:'lort-cha'},{content_type:'dish',content_id:'../account'}])('rejects unavailable/unsafe reference %#',item => expect(sharedItemDestination(item)).toBeNull())
  it('strips extra payload fields and requires dish context for restaurant references', () => {
    expect(normalizeSharedContent({type:'dish',id:'lort-cha',reward:true,email:'hidden'})).toEqual({type:'dish',id:'lort-cha'})
    expect(normalizeSharedContent({type:'restaurant',id:'google:venue'})).toBeNull()
  })
})
