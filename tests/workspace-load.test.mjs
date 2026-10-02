import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchWorkspaceSnapshot,readWorkspaceResponse,WorkspaceLoadError} from '../app/lib/workspace-load.ts';
import {normalizeContactRecord} from '../app/lib/contact-record.ts';
import {deduplicateCsvLeads} from '../app/lib/csv-lead-merge.ts';
import {readStoredWorkspace,workspaceRedisConfig,workspaceRedis} from '../app/lib/workspace-storage.ts';
import {loadWorkspaceSnapshot} from '../app/lib/workspace-snapshot.ts';

const workspace={found:true,leads:[{id:1,name:'Example',phone:'8185550100'}],callLogs:[],profile:{}};
test('HTML, partial JSON, and invalid contacts never become an empty loaded workspace',async()=>{
  for(const body of ['<html>Sign in</html>','{}',JSON.stringify({...workspace,leads:[null]})]){
    await assert.rejects(readWorkspaceResponse(new Response(body)),{code:'WORKSPACE_DATA_INVALID'});
  }
  assert.deepEqual(await readWorkspaceResponse(Response.json(workspace)),workspace);
  assert.equal((await readWorkspaceResponse(Response.json({...workspace,found:false,leads:[]}))).found,false);
});

test('load errors distinguish account, storage, rate limit, and response size without exposing raw provider text',async()=>{
  for(const [status,code,retryable] of [[401,'SIGN_IN_REQUIRED',false],[403,'ACCESS_REQUIRED',false],[413,'WORKSPACE_TOO_LARGE',false],[429,'STORAGE_LIMIT',false],[503,'WORKSPACE_UNAVAILABLE',true]]){
    await assert.rejects(readWorkspaceResponse(Response.json({error:'secret upstream details'},{status})),error=>{
      assert.equal(error.code,code);assert.equal(error.retryable,retryable);assert.doesNotMatch(error.message,/secret/);return true;
    });
  }
  await assert.rejects(readWorkspaceResponse(Response.json({code:'STORAGE_NOT_CONFIGURED',requestId:'test-reference'},{status:503})),error=>error.code==='STORAGE_NOT_CONFIGURED'&&!error.retryable&&error.requestId==='test-reference');
  await assert.rejects(readWorkspaceResponse(Response.json({code:'STORAGE_AUTH_FAILED'},{status:503})),{retryable:false});
});

test('network failures retry but request cancellation stays canceled',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new TypeError('Network disconnected')});
  await assert.rejects(fetchWorkspaceSnapshot(),{code:'WORKSPACE_NETWORK',retryable:true});
  const controller=new AbortController();controller.abort();
  await assert.rejects(fetchWorkspaceSnapshot({signal:controller.signal}),error=>!(error instanceof WorkspaceLoadError));
});

test('numeric imported phone, source and metadata do not break deduplication or lose details',()=>{
  const first={id:1,name:'Example',phone:8185550100,email:'',source:123,vendorId:99,stage:'Follow-up',outcome:'Completed',status:'Ready',sourceDisposition:'',importedFields:{Zip:91342,Drivers:2},extraFields:{Carrier:{name:'Example carrier'}},notes:'Saved note'};
  const second={...first,id:2,phone:'8185550100',smsOptOut:true};
  assert.throws(()=>deduplicateCsvLeads([first,second]),TypeError,'reproduces the previous startup crash');
  const contacts=[first,second].map(normalizeContactRecord);
  const result=deduplicateCsvLeads(contacts);
  assert.equal(result.leads.length,1);assert.equal(result.leads[0].phone,'8185550100');
  assert.equal(result.leads[0].importedFields.Drivers,'2');assert.equal(result.leads[0].extraFields.Carrier,'{"name":"Example carrier"}');
  assert.equal(result.leads[0].notes,'Saved note');assert.equal(result.leads[0].smsOptOut,true);
  assert.equal(first.phone,8185550100,'source data is not mutated');
});

function storageEnv(t,values={}){
  const names=['KV_REST_API_URL','KV_REST_API_TOKEN','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','VERCEL'];
  const old=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  for(const name of names){if(values[name]===undefined)delete process.env[name];else process.env[name]=values[name];}
  t.after(()=>{for(const name of names){if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name];}});
}
test('partial cloud credentials cannot be mistaken for an empty workspace or mixed with another provider',async t=>{
  storageEnv(t,{KV_REST_API_URL:' https://kv.example.test ',UPSTASH_REDIS_REST_TOKEN:'different-token',VERCEL:'1'});
  t.mock.method(globalThis,'fetch',()=>assert.fail('must not send mismatched credentials'));
  assert.deepEqual(workspaceRedisConfig(),{url:'https://kv.example.test',token:''});
  await assert.rejects(readStoredWorkspace('tenant'),{code:'STORAGE_NOT_CONFIGURED'});
});
test('missing Vercel storage produces a useful setup error without importing Cloudflare runtime',async t=>{
  storageEnv(t,{VERCEL:'1'});
  await assert.rejects(readStoredWorkspace('tenant'),{code:'STORAGE_NOT_CONFIGURED'});
});
test('valid cloud credentials are trimmed and corrupt storage stays blocked',async t=>{
  storageEnv(t,{KV_REST_API_URL:' https://kv.example.test ',KV_REST_API_TOKEN:' token '});
  let raw='null';
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    assert.equal(url,'https://kv.example.test');assert.equal(init.headers.Authorization,'Bearer token');
    return Response.json({result:raw});
  });
  await assert.rejects(readStoredWorkspace('tenant'),{code:'WORKSPACE_DATA_INVALID'});
  raw=JSON.stringify(workspace);assert.equal((await readStoredWorkspace('tenant')).leads[0].name,'Example');
});
test('provider authentication and outages get safe errors and writes are never retried',async t=>{
  storageEnv(t,{UPSTASH_REDIS_REST_URL:'https://kv.example.test',UPSTASH_REDIS_REST_TOKEN:'token'});
  let calls=0,status=401;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({error:'secret upstream details'},{status})});
  await assert.rejects(workspaceRedis(['SET','key','value']),{code:'STORAGE_AUTH_FAILED'});
  assert.equal(calls,1);status=503;
  await assert.rejects(readStoredWorkspace('tenant'),{code:'STORAGE_UNAVAILABLE'});assert.equal(calls,2);
});
test('conditional refresh shares requests and never caches a malformed success response',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async(_url,options)=>{
    calls++;
    if(calls===1)return Response.json(workspace,{headers:{ETag:'"version1"'}});
    if(calls===2){assert.equal(options.headers['If-None-Match'],'"version1"');return new Response(null,{status:304});}
    if(calls===3)return Response.json({error:'not a workspace'});
    assert.equal(options.headers['If-None-Match'],undefined);return Response.json(workspace);
  });
  const [first,same]=await Promise.all([loadWorkspaceSnapshot('test-conditional'),loadWorkspaceSnapshot('test-conditional')]);
  assert.equal(first,same);assert.equal(calls,1);assert.equal(await loadWorkspaceSnapshot('test-conditional'),first);
  await assert.rejects(loadWorkspaceSnapshot('test-conditional'),{code:'WORKSPACE_DATA_INVALID'});
  assert.deepEqual(await loadWorkspaceSnapshot('test-conditional'),workspace);
});
