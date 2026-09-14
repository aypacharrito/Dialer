import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {POST} from '../app/api/twilio/status/route.ts';
process.env.TWILIO_AUTH_TOKEN='test-secret';
process.env.TWILIO_WEBHOOK_BASE_URL='https://pacificacrm.com';
const url='https://pacificacrm.com/api/twilio/status?workspaceId=test&phone=%2B18185550100&startedAt=2026-09-14T12%3A00%3A00Z&parentCallSid=CA'+'2'.repeat(32);
function request(signed){const fields={CallSid:'CA'+'1'.repeat(32),AnsweredBy:'machine_start'};const payload=Object.keys(fields).sort().reduce((s,k)=>s+k+fields[k],url);return new Request(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',...(signed?{'X-Twilio-Signature':createHmac('sha1','test-secret').update(payload).digest('base64')}:{})},body:new URLSearchParams(fields)});}
test('signed AMD callback persists a voicemail and rejects an unsigned callback',async()=>{
 globalThis.testWorkspace={leads:[{id:1,phone:'8185550100',name:'Test',stage:'New lead'}],callLogs:[],profile:{}};
 const rejected=await POST(request(false));assert.equal(rejected.status,403);assert.equal(globalThis.testWorkspace.callLogs.length,0);
 const accepted=await POST(request(true));assert.equal(accepted.status,204);assert.equal(globalThis.testWorkspace.callLogs[0].detectedResult,'Voicemail');assert.equal(globalThis.testWorkspace.leads[0].lastCallResult,'Voicemail');
});
