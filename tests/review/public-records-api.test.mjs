import test from 'node:test';import assert from 'node:assert/strict';
import {POST} from '../../app/api/miner/public-records/route.ts';
const request=(body,origin='https://pacifica.test')=>new Request('https://pacifica.test/api/miner/public-records',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body)});
const input={action:'import',zip:'91401',page:0,accounts:['A-123']};
test('route rejects unauthorized users, cross-origin writes and agent imports',async()=>{
 globalThis.recordsAccess={allowed:false};assert.equal((await POST(request(input))).status,401);
 globalThis.recordsAccess={allowed:true,userId:'owner',role:'owner'};assert.equal((await POST(request(input,'https://other.test'))).status,403);
 globalThis.recordsAccess={allowed:true,userId:'agent',role:'agent'};assert.equal((await POST(request(input))).status,403);
 globalThis.recordsAccess={allowed:true,userId:'owner',role:'owner'};assert.equal((await POST(request({...input,accounts:Array(51).fill('A')}))).status,400);
});
test('import re-reads source facts, persists research-only records and tolerates retries',async()=>{
 globalThis.recordsAccess={allowed:true,userId:'owner',role:'owner'};globalThis.recordsWorkspace={leads:[]};
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json([{location_account:'A-123',business_name:'Source Name',street_address:'123 Main Street',city:'Van Nuys',zip_code:'91401'}]);
 try{
  const first=await POST(request({...input,name:'Forged Name',smsConsent:true,phone:'8185551234'}));assert.equal(first.status,200);
  const data=await first.json();assert.equal(data.added,1);const lead=recordsWorkspace.leads[0];
  assert.equal(lead.name,'Source Name');assert.equal(lead.phone,'');assert.equal(lead.automationEnabled,false);assert.equal(lead.smsConsent,false);assert.equal(lead.queueOverride,false);
  lead.notes='Keep these';lead.doNotCall=true;
  const second=await (await POST(request(input))).json();assert.equal(second.added,0);assert.equal(recordsWorkspace.leads.length,1);assert.equal(recordsWorkspace.leads[0].notes,'Keep these');assert.equal(recordsWorkspace.leads[0].doNotCall,true);
 }finally{globalThis.fetch=original;}
});
test('AI prospect research is read-only and rejects invented evidence',async()=>{
 globalThis.recordsAccess={allowed:true,userId:'owner',role:'owner'};globalThis.recordsWorkspace={leads:[{id:1,name:'Existing',notes:'Keep'}]};
 globalThis.researchInsights=[{account:'A-123',opportunity:'Discuss business coverage',nextStep:'Ask about operations',evidence:'Plumbing'},{account:'A-123',opportunity:'Invented',nextStep:'Call owner',evidence:'Owner is Bob'}];
 const before=structuredClone(recordsWorkspace),original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json([{location_account:'A-123',business_name:'Example',street_address:'123 Main',city:'Van Nuys',zip_code:'91401',primary_naics_description:'Plumbing'}]);
 try{const response=await POST(request({...input,action:'analyze'}));assert.equal(response.status,200);assert.equal((await response.json()).insights.length,1);assert.deepEqual(recordsWorkspace,before);}
 finally{globalThis.fetch=original;}
});
