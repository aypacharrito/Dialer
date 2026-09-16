import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeNewProspects,runMinerAutoFeedForWorkspace,saveMinerRun} from '../app/lib/miner-auto-feed.ts';
import {defaultWorkspaceProfile} from '../app/lib/workspace-profile.ts';
const workspace=(leads=[])=>({leads,callLogs:[],profile:{...defaultWorkspaceProfile,mode:'insurance'}});
test('a full workspace retains all existing contacts and deletion records',()=>{
 const leads=Array.from({length:5000},(_,id)=>({id,phone:String(2000000000+id),deletedAt:id===4999?'2026-09-16':''}));
 const merged=mergeNewProspects(workspace(leads),[{id:99999,phone:'8185551234'}]);
 assert.equal(merged.accepted.length,0);assert.deepEqual(merged.workspace.leads,leads);
});
test('duplicates and deleted contacts are not reimported',()=>{
 const merged=mergeNewProspects(workspace([{id:1,phone:'+1 (818) 555-1234',deletedAt:'2026-09-16'}]),[{id:2,phone:'8185551234'},{id:3,phone:'8185559999'},{id:4,phone:'8185559999'}]);
 assert.deepEqual(merged.accepted.map(x=>x.id),[3]);
});
test('new records cannot reuse an existing contact ID',()=>{
 const merged=mergeNewProspects(workspace([{id:1,phone:'8185551111'}]),[{id:1,phone:'8185552222'}]);
 assert.equal(merged.accepted.length,1);assert.notEqual(merged.accepted[0].id,1);
});
test('disabled and non-insurance feeds do not contact providers',async()=>{
 const original=global.fetch;global.fetch=()=>{throw new Error('Unexpected provider request')};
 try{
  assert.equal((await runMinerAutoFeedForWorkspace('a',workspace())).result.added,0);
  const other=workspace();other.profile.mode='sales';
  assert.equal((await runMinerAutoFeedForWorkspace('a',other,{enabled:true,zipCodes:['91405']})).result.added,0);
 }finally{global.fetch=original}
});
test('provider records keep cold consent off and skip DNC/invalid numbers',async()=>{
 const original=global.fetch,old=process.env.DATA_AXLE_API_KEY;process.env.DATA_AXLE_API_KEY='test';
 global.fetch=async(url,options)=>{assert.equal(options.method,'GET');assert.equal(options.headers['X-AUTH-TOKEN'],'test');assert.equal(new URL(url).searchParams.get('offset'),'0');return Response.json({records:[{name:'Valid Business',phone:'8185552222',id:'a',zip:'91405'},{name:'DNC Business',phone:'8185553333',do_not_call:true,zip:'91405'},{name:'Invalid Business',phone:'123',zip:'91405'},{name:'Outside ZIP',phone:'8185554444',zip:'90001'}]})};
 try{
 const run=await runMinerAutoFeedForWorkspace('a',workspace(),{enabled:true,personalAuto:false,home:false,commercial:true,zipCodes:['91405']});
 assert.equal(run.result.added,1);const lead=run.workspace.leads[0];
 assert.equal(lead.smsConsent,false);assert.equal(lead.emailConsent,false);assert.equal(lead.automationEnabled,false);
 }finally{global.fetch=original;if(old===undefined)delete process.env.DATA_AXLE_API_KEY;else process.env.DATA_AXLE_API_KEY=old}
});
test('background save retries concurrent changes and preserves newest notes/profile',async()=>{
 const before=workspace([{id:1,phone:'8185551111',notes:'before'}]);
 const run={workspace:{...before,leads:[{id:2,phone:'8185552222',source:'Pacifica Miner · Commercial'},...before.leads]},result:{added:1,skipped:0,ranAt:new Date().toISOString(),message:'Added 1',commercial:1,home:0,personalAuto:0}};
 let current=JSON.stringify({...before,leads:[{...before.leads[0],notes:'edited'}]});let attempts=0;
 const original=global.fetch,oldUrl=process.env.KV_REST_API_URL,oldToken=process.env.KV_REST_API_TOKEN;
 process.env.KV_REST_API_URL='https://storage.invalid';process.env.KV_REST_API_TOKEN='test';
 global.fetch=async(_url,options)=>{
  const command=JSON.parse(options.body);
  if(command[0]==='GET')return Response.json({result:current});
  assert.equal(command[0],'EVAL');
  if(++attempts===1){const latest=JSON.parse(current);latest.profile.businessName='Updated name';current=JSON.stringify(latest);return Response.json({result:0})}
  assert.equal(command[4],current);current=command[5];return Response.json({result:1});
 };
 try{const saved=await saveMinerRun('a',before,run);assert.equal(attempts,2);assert.equal(saved.workspace.leads.find(x=>x.id===1).notes,'edited');assert.equal(saved.workspace.profile.businessName,'Updated name');assert.equal(saved.result.added,1)}
 finally{global.fetch=original;for(const [key,value] of [['KV_REST_API_URL',oldUrl],['KV_REST_API_TOKEN',oldToken]]){if(value===undefined)delete process.env[key];else process.env[key]=value}}
});
