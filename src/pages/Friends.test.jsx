// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import Friends from './Friends'
import SharedInbox from './SharedInbox'
import FriendPicker from '../components/social/FriendPicker'
import RestaurantActions from '../components/restaurants/RestaurantActions'
import { emptySocial } from '../data/socialRepository'
const state = vi.hoisted(() => ({auth:null,social:null}))
vi.mock('../context/Auth',() => ({useAuth:()=>state.auth}))
vi.mock('../context/Friends',() => ({useFriends:()=>state.social}))
vi.mock('../context/Activity',() => ({useActivity:()=>({displayName:'Explorer'})}))
vi.mock('../data/placeExtrasService',() => ({placeDetailsService:{load:vi.fn()}}))
let root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.getElementById('root'))
  state.auth = {isAuthenticated:true}
  state.social = {...emptySocial(),profile:{handle:'me',display_name:'Me'},status:'ready',error:'',refresh:vi.fn(),search:vi.fn().mockResolvedValue([]),register:vi.fn().mockResolvedValue(),request:vi.fn().mockResolvedValue(),respond:vi.fn().mockResolvedValue(),cancel:vi.fn().mockResolvedValue(),remove:vi.fn().mockResolvedValue(),send:vi.fn().mockResolvedValue(),open:vi.fn().mockResolvedValue(),loadMore:vi.fn()}
})
afterEach(async () => {await act(()=>root.unmount());vi.restoreAllMocks()})
const render = page => act(()=>root.render(<MemoryRouter initialEntries={['/recommendations/lort-cha?shared=1']}>{page}</MemoryRouter>))
const button = label => [...document.querySelectorAll('button')].find(node=>node.textContent.trim()===label)
const click = label => act(()=>button(label).click())
const set = (node,value) => act(()=>{const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node),'value').set;setter.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}))})
const submit = node => act(()=>node.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
describe('Friends UI and separate in-app sharing',()=>{
  it('guests get account-required states and no social mutation while native Share works',async()=>{
    state.auth.isAuthenticated=false
    const share=vi.fn().mockResolvedValue();Object.defineProperty(navigator,'share',{configurable:true,value:share})
    await render(<RestaurantActions restaurant={{id:'google:venue',name:'Venue',placeId:'venue'}} dishId="lort-cha" />)
    await click('Send to a friend')
    expect(document.body.textContent).toContain('Sign in to send this to friends on Nom.')
    expect(document.querySelector('[role="dialog"] a').getAttribute('href')).toContain('returnTo=')
    expect(share).not.toHaveBeenCalled();expect(state.social.send).not.toHaveBeenCalled()
    await click('Cancel');await click('Share');expect(share).toHaveBeenCalledTimes(1)
    delete navigator.share
  })
  it('picker lists accepted friends only, searches them, requires one selection and sends an optional note',async()=>{
    state.social.friends=[{handle:'david',display_name:'David'},{handle:'ryza',display_name:'Ryza'}]
    state.social.incoming=[{handle:'pending',display_name:'Pending'}]
    await render(<FriendPicker content={{type:'dish',id:'lort-cha'}} onClose={()=>{}} />)
    expect(document.body.textContent).not.toContain('Pending');expect(button('Send').disabled).toBe(true)
    await set(document.querySelector('input'),'david');expect(document.querySelectorAll('.social-picker-list button')).toHaveLength(1)
    await act(()=>document.querySelector('.social-picker-list button').click());await set(document.querySelector('textarea'),'Want to try this?')
    await submit(document.querySelector('form'))
    expect(state.social.send).toHaveBeenCalledWith(expect.objectContaining({receiver:'david',content:{type:'dish',id:'lort-cha'},message:'Want to try this?'}))
    expect(document.body.textContent).toContain('Sent to David');expect(document.querySelectorAll('textarea')).toHaveLength(0)
  })
  it('retries with the same share ID and prevents notes over 280 characters',async()=>{
    state.social.friends=[{handle:'friend',display_name:'Friend'}]
    state.social.send.mockRejectedValueOnce(new Error('Network unavailable'))
    await render(<FriendPicker content={{type:'restaurant',id:'google:venue',dishId:'lort-cha'}} onClose={()=>{}} />)
    await act(()=>document.querySelector('.social-picker-list button').click())
    await set(document.querySelector('textarea'),'x'.repeat(281));expect(document.querySelector('textarea').value).toBe('')
    await submit(document.querySelector('form'));expect(document.querySelector('[role="alert"]').textContent).toContain('Network')
    await submit(document.querySelector('form'))
    expect(state.social.send.mock.calls[0][0].id).toBe(state.social.send.mock.calls[1][0].id)
  })
  it('requires a fresh visible selection after changing friend search',async()=>{
    state.social.friends=[{handle:'alpha',display_name:'Alpha'},{handle:'bravo',display_name:'Bravo'}]
    await render(<FriendPicker content={{type:'dish',id:'lort-cha'}} onClose={()=>{}} />)
    await act(()=>document.querySelector('.social-picker-list button').click());expect(button('Send').disabled).toBe(false)
    await set(document.querySelector('input'),'bravo');expect(button('Send').disabled).toBe(true)
    expect(state.social.send).not.toHaveBeenCalled()
  })
  it('unconfigured backend never offers fake friends or fake sent states',async()=>{
    state.social={...state.social,profile:null,status:'error',error:'Friends setup is not available yet.'}
    await render(<Friends />);expect(document.body.textContent).toContain('Friends setup is not available')
    expect(document.querySelectorAll('.social-person')).toHaveLength(0)
    expect(button('Create friend identity')).toBeUndefined()
  })
  it('searches safe identities and sends a friend request without rendering UUID/email/provider fields',async()=>{
    state.social.search.mockResolvedValue([{handle:'charlie',display_name:'Charlie',email:'private@example.invalid',user_id:'internal-id',provider:'google'}])
    await render(<Friends />);await set(document.querySelector('.social-search input'),'ch');await submit(document.querySelector('.social-search'))
    expect(state.social.search).toHaveBeenCalledWith('ch');await click('Send friend request')
    expect(state.social.request).toHaveBeenCalledWith('charlie')
    expect(document.body.textContent).not.toMatch(/private@example|internal-id|google/)
  })
  it('offers receiver accept/decline, outgoing cancel and confirms bilateral removal',async()=>{
    state.social.incoming=[{id:'incoming',handle:'bravo',display_name:'Bravo'}];state.social.outgoing=[{id:'outgoing',handle:'charlie',display_name:'Charlie'}];state.social.friends=[{handle:'delta',display_name:'Delta'}]
    await render(<Friends />);await click('Accept');expect(state.social.respond).toHaveBeenCalledWith('incoming',true)
    await click('Decline');expect(state.social.respond).toHaveBeenCalledWith('incoming',false)
    await click('Cancel request');expect(state.social.cancel).toHaveBeenCalledWith('outgoing')
    await click('Remove friend');expect(state.social.remove).not.toHaveBeenCalled();await click('Confirm removal');expect(state.social.remove).toHaveBeenCalledWith('delta')
  })
  it('shows an explicit opt-in public identity form, not automatically uploaded private account fields',async()=>{
    state.social.profile=null
    await render(<Friends />);expect(document.body.textContent).toContain('will be searchable')
    expect(state.social.register).not.toHaveBeenCalled()
    await set(document.querySelector('.social-identity input'),'explorer');await submit(document.querySelector('.social-identity'))
    expect(state.social.register).toHaveBeenCalledWith('explorer','Explorer')
  })
  it('shows inbox unread/read state and canonical titles, renders notes as text and paginates',async()=>{
    state.social.inbox=[{id:'share',sender_handle:'bravo',sender_name:'Bravo',content_type:'dish',content_id:'lort-cha',message:'<script>alert(1)</script>',created_at:'2026-10-08T01:00:00Z',opened_at:null}];state.social.hasMore=true
    await render(<SharedInbox />)
    expect(document.querySelector('.social-share-card').dataset.unread).toBe('true');expect(document.body.textContent).toContain('Lort Cha')
    expect(document.querySelector('blockquote').textContent).toBe('<script>alert(1)</script>');expect(document.querySelector('script')).toBeNull()
    await click('Load older shares');expect(state.social.loadMore).toHaveBeenCalledTimes(1)
    await click('Open');expect(state.social.open).toHaveBeenCalledWith('share')
  })
  it('shows unavailable content gracefully and permits recipient to mark it as read',async()=>{
    state.social.inbox=[{id:'share',sender_handle:'bravo',sender_name:'Bravo',content_type:'dish',content_id:'removed-dish',message:'',created_at:'2026-10-08T01:00:00Z',opened_at:null}]
    await render(<SharedInbox />);expect(document.body.textContent).toContain('no longer available')
    expect(button('Open')).toBeUndefined();await click('Mark as read');expect(state.social.open).toHaveBeenCalledWith('share')
  })
})
