import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {updateStoredWorkspace,cleanWorkspacePayload} from '../app/lib/workspace-storage.ts';

test('D1 updates retry on contention and create without replacing concurrent data',async t=>{
  const variables=['KV_REST_API_URL','KV_REST_API_TOKEN','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'];
  const saved=Object.fromEntries(variables.map(name=>[name,process.env[name]]));
  for(const name of variables)delete process.env[name];
  const hook=registerHooks({resolve(specifier,context,next){
    if(specifier==='../../db/index')return {url:'data:text/javascript,export function getD1(){return globalThis.testD1}',shortCircuit:true};
    return next(specifier,context);
  }});
  t.after(()=>{hook.deregister();delete globalThis.testD1;for(const name of variables){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name]}});
  let raw=null,conflict=true;
  globalThis.testD1={prepare(sql){let args=[];return {
    bind(...values){args=values;return this},
    async first(){return raw?{value:raw}:null},
    async run(){
      if(sql.startsWith('CREATE'))return {meta:{changes:0}};
      if(conflict){conflict=false;raw=JSON.stringify(cleanWorkspacePayload({leads:[{id:1,notes:'Concurrent edit'}]}));return {meta:{changes:0}};}
      if(sql.startsWith('INSERT')){if(raw)return {meta:{changes:0}};raw=args[1];return {meta:{changes:1}};}
      assert.equal(args[3],raw);raw=args[0];return {meta:{changes:1}};
    },
  }}};
  const created=await updateStoredWorkspace('d1-tenant',current=>({...current,callLogs:[{id:'call'}]}),{create:true});
  assert.equal(created.leads[0].notes,'Concurrent edit');assert.equal(created.callLogs[0].id,'call');
  conflict=true;
  const updated=await updateStoredWorkspace('d1-tenant',current=>({...current,leads:current.leads.map(lead=>({...lead,name:'Saved'}))}));
  assert.equal(updated.leads[0].notes,'Concurrent edit');assert.equal(updated.leads[0].name,'Saved');
});
