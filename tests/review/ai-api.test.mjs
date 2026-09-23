import test from 'node:test';
import assert from 'node:assert/strict';
import {GET as status,POST as connection} from '../../app/api/ai/connection/route.ts';
import {POST as draft} from '../../app/api/ai/message/route.ts';
import {POST as crm} from '../../app/api/ai/crm/route.ts';
const request=body=>new Request('https://example.test/api/ai/message',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});
const output=text=>Response.json({id:'resp_test',object:'response',created_at:1,status:'completed',model:'gpt-5-mini',output:[{type:'message',id:'msg_1',role:'assistant',status:'completed',content:[{type:'output_text',text,annotations:[]}]}]});

test('AI setup and a small paid check enforce workspace access and report real provider outcomes',async()=>{
 const previousKey=process.env.OPENAI_API_KEY,previousFetch=globalThis.fetch;let calls=0;let payload;
 process.env.OPENAI_API_KEY='test-placeholder-not-a-real-key';
 globalThis.fetch=async(url,options)=>{calls++;payload=JSON.parse(options.body);return output('Ready')};
 try{
  globalThis.pacificaTestAccess=false;assert.equal((await connection()).status,403);assert.equal(calls,0);
  globalThis.pacificaTestAccess=true;const config=await (await status()).json();assert.equal(config.configured,true);assert.equal(config.verified,false);assert.equal(calls,0);
  const checked=await (await connection()).json();assert.equal(checked.ok,true);assert.equal(calls,1);assert.equal(payload.store,false);assert.equal(payload.input,'Reply with the single word Ready.');
  delete process.env.OPENAI_API_KEY;assert.equal((await connection()).status,503);assert.equal(calls,1);
 }finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey}
});
test('quota failures make one provider request, explain billing and return a labelled local draft',async()=>{
 const previousKey=process.env.OPENAI_API_KEY,previousFetch=globalThis.fetch;let calls=0;
 process.env.OPENAI_API_KEY='test-placeholder-not-a-real-key';globalThis.pacificaTestAccess=true;
 globalThis.fetch=async()=>{calls++;return Response.json({error:{type:'insufficient_quota',code:'insufficient_quota',message:'Quota exhausted'}},{status:429})};
 try{
  const result=await (await draft(request({lead:{name:'Taylor',product:'Home'},channel:'sms'}))).json();
  assert.equal(calls,1);assert.equal(result.mode,'smart-fallback');assert.equal(result.providerCode,'billing_required');assert.match(result.notice,/credits/);assert.match(result.draft,/STOP/);
 }finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey}
});
test('CRM analysis uses a completed structured response and accepts a timed callback',async()=>{
 const previousKey=process.env.OPENAI_API_KEY,previousFetch=globalThis.fetch;
 process.env.OPENAI_API_KEY='test-placeholder-not-a-real-key';globalThis.pacificaTestAccess=true;
 const result={summary:'Call Taylor tomorrow.',priorities:[],actions:[{leadId:1,leadName:'Taylor',title:'Schedule callback',reason:'Requested',patch:{stage:'Follow-up',outcome:'Call back later',followUp:'2026-09-10T10:30',notesToAppend:null}}],draft:''};
 globalThis.fetch=async()=>output(JSON.stringify(result));
 try{
  const response=await crm(request({prompt:'Plan callback',leads:[{id:1,name:'Taylor',stage:'New lead',doNotCall:false}],includeNotes:false}));
  const data=await response.json();assert.equal(data.mode,'ai');assert.equal(data.actions[0].patch.followUp,'2026-09-10T10:30');assert.equal(data.actions[0].patch.outcome,'Call back later');
 }finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey}
});
test('document scan sends a validated PDF to AI, retains printed dates, and rejects invalid uploads',async()=>{
 const {POST:scan}=await import('../../app/api/ai/document-lead/route.ts');
 const previousKey=process.env.OPENAI_API_KEY,previousFetch=globalThis.fetch;let calls=0;let payload;
 process.env.OPENAI_API_KEY='test-placeholder-not-a-real-key';globalThis.pacificaTestAccess=true;
 globalThis.fetch=async(url,options)=>{calls++;payload=JSON.parse(options.body);return output(JSON.stringify({fullName:'Test Person',dateOfBirth:'1990-06-15',address:'123 Test Street',city:'Test City',state:'CA',zip:'90001',policyNumber:'TEST-1',policyExpirationDate:'2026-10-02',policyPremium:'838.58',documentType:'Policy declaration',otherFields:[{label:'Vehicle 2 VIN',value:'1HGCM82633A004352'}]}))};
 try{
  const pdf='data:application/pdf;base64,'+Buffer.from('%PDF-1.4\nmock document').toString('base64');
  const response=await scan(request({pdf}));assert.equal(response.status,200);const data=await response.json();assert.equal(data.extraction.policyExpirationDate,'2026-10-02');assert.equal(data.extraction.policyPremium,'838.58');assert.equal(calls,1);assert.equal(payload.store,false);assert.equal(payload.input[0].content[1].type,'input_file');assert.equal(payload.input[0].content[1].file_data,pdf);
  assert.equal((await scan(request({pdf:'data:application/pdf;base64,YmFk'}))).status,400);assert.equal(calls,1);
  globalThis.pacificaTestAccess=false;assert.equal((await scan(request({pdf}))).status,403);assert.equal(calls,1);
 }finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey}
});
