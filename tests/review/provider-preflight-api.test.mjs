import test from 'node:test';
import assert from 'node:assert/strict';
import {sendOutboundSms} from '../../app/lib/outbound-sms.ts';
import {POST as sms} from '../../app/api/twilio/messages/route.ts';
import {POST as disposition} from '../../app/api/integrations/dispositions/route.ts';
process.env.TWILIO_ACCOUNT_SID='AC'+'a'.repeat(32);process.env.TWILIO_AUTH_TOKEN='test-only';
const req=body=>new Request('http://localhost/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('API returns CRM preflight error and does not create a Twilio message for recent 30003',async()=>{
 const methods=[];globalThis.fetch=async(url,init)=>{methods.push(init.method||'GET');return Response.json({messages:[{status:'undelivered',error_code:30003,date_created:new Date(Date.now()-3600000).toISOString()}]})};
 const response=await sms(req({to:'8185550100',body:'Personal reply'}));
 assert.equal(response.status,422);assert.equal((await response.json()).submitted,false);assert.deepEqual(methods,['GET']);
});
test('unknown delivery history fails closed and a clean history sends with STOP and HELP',async()=>{
 const methods=[];globalThis.fetch=async()=>Response.json({error:'unavailable'},{status:503});
 await assert.rejects(()=>sendOutboundSms({workspaceId:'test',to:'8185550100',body:'Hello'}),/history could not be checked/);
 globalThis.fetch=async(url,init)=>{methods.push(init.method||'GET');if(init.method==='POST'){const form=new URLSearchParams(init.body);assert.match(form.get('Body'),/Reply STOP.*Reply HELP/);return Response.json({sid:'SM-test',status:'queued'})}return Response.json({messages:[]})};
 await sendOutboundSms({workspaceId:'test',to:'8185550100',body:'Hello',automated:true});assert.deepEqual(methods,['GET','POST']);
});
test('SmartFinancial receives only provider ID and Attempted Contact after a call',async()=>{
 process.env.SMARTFINANCIAL_STATUS_URL='https://example.test/status';process.env.SMARTFINANCIAL_API_KEY='test-only';
 const payloads=[];globalThis.fetch=async(url,init)=>{payloads.push(JSON.parse(init.body));return Response.json({ok:true})};
 const base={source:'Smart Financial · Home',vendorId:'sf-123',disposition:'Contacted',notes:'Private CRM notes',crmStage:'Follow-up'};
 assert.equal((await disposition(req({...base,event:'contact-saved'}))).status,200);assert.equal(payloads.length,0);
 const response=await disposition(req({...base,event:'call-ended'}));assert.equal((await response.json()).synced,true);
 assert.deepEqual(payloads,[{lead_id:'sf-123',disposition:'Attempted Contact'}]);
 delete process.env.SMARTFINANCIAL_STATUS_URL;delete process.env.SMARTFINANCIAL_API_KEY;
});
test('missing SmartFinancial connector is reported as not connected without external requests',async()=>{
 globalThis.fetch=async()=>{throw Error('Unexpected external request')};
 const response=await disposition(req({source:'SmartFinancial',vendorId:'sf-1',event:'call-ended',disposition:'Attempted Contact'}));assert.equal((await response.json()).synced,false);
});

test('provider rejection uses Pacifica guidance and keeps the failure truthful',async()=>{
 globalThis.fetch=async(url,init)=>init.method==='POST'?Response.json({code:21610,message:'Twilio opted out'},{status:400}):Response.json({messages:[]});
 const response=await sms(req({to:'8185550100',body:'Personal reply'}));
 assert.equal(response.status,500);
 const data=await response.json();assert.match(data.error,/Pacifica CRM:.*opted out/);assert.doesNotMatch(data.error,/Twilio|21610/);assert.equal(data.message,undefined);
});
