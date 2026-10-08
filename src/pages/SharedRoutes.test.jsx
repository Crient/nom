// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { placeDetailsService } from '../data/placeExtrasService'
import { STORAGE_KEYS } from '../data/localPersistence'
import { dishes } from '../data/dishes'
let root, transport
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>';root=createRoot(document.getElementById('root'))
  vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
  transport = vi.fn(async(url,options) => {
    if(url==='/api/place-details')return {ok:true,status:200,json:async()=>({placeId:JSON.parse(options.body).placeId,details:{name:'Current restaurant name',address:'Current address'},reviews:[],placeDetailsCalls:1})}
    return {ok:false,status:503,json:async()=>({error:'UNAVAILABLE'})}
  })
  vi.stubGlobal('fetch',transport);placeDetailsService.clear()
})
afterEach(async()=>{await act(()=>root.unmount());placeDetailsService.clear();vi.unstubAllGlobals();vi.restoreAllMocks()})
async function mount(path){window.history.replaceState({},'',path);await act(()=>root.render(<App supabaseClient={null}/>))}
const click = label => act(()=>[...document.querySelectorAll('button,a')].find(node=>node.textContent.trim()===label).click())
describe('shared reference routes use canonical content without a discovery session',()=>{
  it('opens/reloads a shared dish without fabricating matches or changing Guest preferences',async()=>{
    await mount('/recommendations/lort-cha?shared=1')
    expect(document.querySelector('h1').textContent).toContain('Lort Cha')
    expect(document.body.textContent).toContain('Shared by a friend')
    expect(document.body.textContent).not.toMatch(/NaN|Random surprise|Why this|\d+% match/)
    const before = localStorage.getItem(STORAGE_KEYS.discovery)
    await act(()=>root.unmount());root=createRoot(document.getElementById('root'))
    await mount('/recommendations/lort-cha?shared=1')
    expect(localStorage.getItem(STORAGE_KEYS.discovery)).toBe(before)
    expect(document.querySelector('h1').textContent).toContain('Lort Cha')
    expect(dishes).toHaveLength(201)
  })
  it('preserves canonical shared context on nearby navigation and Back',async()=>{
    await mount('/recommendations/lort-cha?shared=1');await click('See all')
    expect(window.location.pathname).toBe('/recommendations/lort-cha/nearby');expect(window.location.search).toBe('?shared=1')
    expect(document.querySelector('.nearby-match')).toBeNull()
    await act(()=>document.querySelector('[aria-label="Go back"]').click())
    expect(window.location.pathname).toBe('/recommendations/lort-cha')
    expect(document.body.textContent).toContain('Shared by a friend')
  })
  it('resolves current restaurant details by stable Place ID on a directly reopened shared URL',async()=>{
    await mount('/recommendations/lort-cha/nearby/google%3Ashared-place?shared=1')
    expect(window.location.pathname).toContain('/nearby/')
    expect(document.querySelector('h1').textContent).toBe('Current restaurant name')
    expect(transport).toHaveBeenCalledWith('/api/place-details',expect.objectContaining({body:JSON.stringify({placeId:'shared-place'})}))
    expect(document.body.textContent).toContain('Share')
    expect(document.body.textContent).toContain('Send to a friend')
    expect(document.querySelector('.restaurant-ate-swipe')).toBeNull() // Still needs fresh trusted coordinates for verification.
  })
  it('shows a graceful unavailable state when Google cannot resolve the shared restaurant',async()=>{
    transport.mockResolvedValue({ok:false,status:404,json:async()=>({error:'PLACE_NOT_FOUND',placeDetailsCalls:1})})
    await mount('/recommendations/lort-cha/nearby/google%3Aremoved-place?shared=1')
    expect(document.body.textContent).toContain('Shared restaurant unavailable')
    expect(document.body.textContent).toContain('current details')
  })
  it('handles a removed catalog reference instead of redirecting to a questionnaire',async()=>{
    await mount('/recommendations/removed-dish?shared=1')
    expect(document.body.textContent).toContain('no longer available')
    expect(window.location.pathname).toBe('/recommendations/removed-dish')
  })
  it('keeps Friends account-only and has no fabricated people or social writes in Guest mode',async()=>{
    await mount('/friends');expect(document.body.textContent).toContain('Sign in to find friends')
    expect(document.querySelectorAll('.social-person')).toHaveLength(0)
    expect(transport).not.toHaveBeenCalled()
  })
})
