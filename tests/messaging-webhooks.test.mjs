import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {POST as inbound} from '../app/api/twilio/inbound/route.ts';
import {POST as delivery} from '../app/api/twilio/messages/status/route.ts';
process.env.TWILIO_AUTH_TOKEN='test-secret';
process.env.TWILIO_WEBHOOK_BASE_URL='https://pacificacrm.com';

function request(path,fields){
  const url='https://pacificacrm.com'+path;
  const payload=Object.keys(fields).sort().reduce((text,key)=>text+key+fields[key],url);
  return new Request(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Twilio-Signature':createHmac('sha1','test-secret').update(payload).digest('base64')},body:new URLSearchParams(fields)});
}

test('a signed STOP closes every duplicate contact and a retry appends nothing',async()=>{
  globalThis.testWorkspace={leads:[1,2].map(id=>({id,phone:'8185550100',stage:'New lead',communications:[]})),callLogs:[],profile:{}};
  const fields={MessageSid:'SM-one',From:'+18185550100',To:'+18185550199',Body:'STOP'};
  assert.equal((await inbound(request('/api/twilio/inbound',fields))).status,200);
  assert.equal((await inbound(request('/api/twilio/inbound',fields))).status,200);
  for(const lead of globalThis.testWorkspace.leads){assert.equal(lead.smsOptOut,true);assert.equal(lead.doNotCall,true);assert.equal(lead.automationEnabled,false);assert.equal(lead.communications.length,1);}
});

test('delivery callbacks preserve delivered status and queue overflow does not opt contacts out',async()=>{
  globalThis.testWorkspace={leads:[{id:1,communications:[{id:'message',providerId:'SM-one',status:'delivered'}]}],callLogs:[],profile:{}};
  const fields={MessageSid:'SM-one',MessageStatus:'queued'};
  assert.equal((await delivery(request('/api/twilio/messages/status?workspace=test',fields))).status,200);
  assert.equal(globalThis.testWorkspace.leads[0].communications[0].status,'delivered');
  await delivery(request('/api/twilio/messages/status?workspace=test',{...fields,MessageStatus:'failed',ErrorCode:'21611'}));
  assert.equal(globalThis.testWorkspace.leads[0].smsOptOut,undefined);
  await delivery(request('/api/twilio/messages/status?workspace=test',{...fields,MessageStatus:'failed',ErrorCode:'21610'}));
  assert.equal(globalThis.testWorkspace.leads[0].smsOptOut,true);
});
