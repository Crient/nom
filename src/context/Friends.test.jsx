// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { FriendsProvider, useFriends } from './Friends'
const state = vi.hoisted(()=>({auth:null}))
vi.mock('./Auth',()=>({useAuth:()=>state.auth}))
let root, latest
function Probe(){latest=useFriends();return <div>{latest.profile?.display_name??latest.status}</div>}
function client(id){return {auth:{getSession:vi.fn(async()=>({data:{session:{user:{id}}}}))},rpc:vi.fn(async name=>({data:name==='get_nom_social'?{profile:{handle:id,display_name:id},friends:[],incoming:[],outgoing:[],unread:0}:[]}))}}
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;document.body.innerHTML='<div id="root"></div>';root=createRoot(document.getElementById('root'));state.auth={client:null,user:null}})
afterEach(async()=>{await act(()=>root.unmount());vi.useRealTimers()})
const render = key => act(()=>root.render(<FriendsProvider key={key}><Probe/></FriendsProvider>))
describe('social account scope and in-app refresh',()=>{
  it('Guest never fetches, stores or creates a social identity',async()=>{
    const before=localStorage.length
    await render('guest');expect(latest.status).toBe('guest');expect(latest.profile).toBeNull()
    await expect(latest.request('friend')).rejects.toThrow(/Sign in/)
    expect(localStorage.length).toBe(before)
  })
  it('restores from the server on reload, with no private social cache',async()=>{
    const sdk=client('alpha');state.auth={client:sdk,user:{id:'alpha'}}
    await render('alpha');expect(document.body.textContent).toBe('alpha');expect(localStorage.length).toBe(0)
    await act(()=>root.unmount());root=createRoot(document.getElementById('root'));await render('alpha')
    expect(document.body.textContent).toBe('alpha');expect(sdk.rpc.mock.calls.filter(([name])=>name==='get_nom_social')).toHaveLength(2)
  })
  it('A → B → Guest scopes discard A data and late responses',async()=>{
    let resolveA;const first=client('alpha');first.rpc.mockImplementationOnce(()=>new Promise(resolve=>{resolveA=resolve}))
    state.auth={client:first,user:{id:'alpha'}};await render('alpha')
    const second=client('bravo');state.auth={client:second,user:{id:'bravo'}};await render('bravo')
    expect(document.body.textContent).toBe('bravo')
    await act(()=>resolveA({data:{profile:{handle:'alpha',display_name:'Private A'},unread:99}}))
    expect(document.body.textContent).not.toContain('Private A');expect(latest.unread).toBe(0)
    state.auth={client:null,user:null};await render('guest');expect(latest.profile).toBeNull();expect(latest.inbox).toEqual([])
  })
  it('focus refreshes in-app indicators and mutation uses the server followed by rehydration',async()=>{
    const sdk=client('alpha');state.auth={client:sdk,user:{id:'alpha'}};await render('alpha')
    await act(()=>window.dispatchEvent(new Event('focus')))
    expect(sdk.rpc.mock.calls.filter(([name])=>name==='get_nom_social')).toHaveLength(2)
    await act(()=>latest.respond('request',true))
    expect(sdk.rpc).toHaveBeenCalledWith('respond_nom_friend_request',{p_request_id:'request',p_accept:true})
    expect(sdk.rpc.mock.calls.filter(([name])=>name==='get_nom_social')).toHaveLength(3)
  })
  it('reports an unapplied backend without contaminating account/Guest journey state',async()=>{
    const sdk=client('alpha');sdk.rpc.mockResolvedValue({error:{code:'PGRST202'}});state.auth={client:sdk,user:{id:'alpha'}}
    localStorage.setItem('nom.existing','preserve');await render('alpha')
    expect(latest.status).toBe('error');expect(latest.error).toContain('Friends setup is not available')
    expect(latest.friends).toEqual([]);expect(localStorage.getItem('nom.existing')).toBe('preserve')
  })
})
