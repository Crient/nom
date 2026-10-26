import test from 'node:test'
import assert from 'node:assert/strict'
import {handleNode} from './node-handler.js'

test('preserves streaming JSON bodies, duplicate query values, cookies, and trusted host/IP',async()=>{
 const request=new Request('https://nom-preview.pages.dev/api/example?id=a&id=b',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'192.0.2.1','x-forwarded-for':'attacker'},body:'{"dishId":"test"}'})
 const response=await handleNode(request,async(req,res)=>{let text='';for await(const chunk of req)text+=chunk;assert.deepEqual(JSON.parse(text),{dishId:'test'});assert.deepEqual(req.query.id,['a','b']);assert.equal(req.headers.host,'nom-preview.pages.dev');assert.equal(req.headers['x-forwarded-for'],'192.0.2.1');res.setHeader('Set-Cookie',['a=1; HttpOnly','b=2; Secure']);res.statusCode=201;res.end('created')})
 assert.equal(response.status,201);assert.equal(await response.text(),'created');assert.equal(response.headers.getSetCookie().length,2)
})
test('forwards abort to existing Node response close listeners',async()=>{
 const controller=new AbortController();let closed=false
 const result=handleNode(new Request('https://nom-preview.pages.dev/api/example',{signal:controller.signal}),async(req,res)=>{await new Promise(resolve=>res.once('close',()=>{closed=true;resolve()}))})
 controller.abort();assert.equal((await result).status,499);assert.equal(closed,true)
})
test('does not expose exception or binding secrets to clients',async()=>{
 const response=await handleNode(new Request('https://example.test/api'),()=>{throw Error('private-service-key')},{SUPABASE_SECRET_KEY:'private-service-key'})
 assert.equal(response.status,500);assert.equal((await response.text()).includes('private-service-key'),false)
})
