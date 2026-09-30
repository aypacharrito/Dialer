import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {POST as sms} from '../app/api/twilio/messages/route.ts';
import {POST as email} from '../app/api/email/messages/route.ts';
import {assertAutomatedContact} from '../app/lib/automated-contact.ts';
beforeEach(()=>{globalThis.testWorkspace={leads:[{id:1,name:'Test Person',phone:'8185550100',email:'test@example.com',stage:'New lead',outcome:'Not contacted',smsConsent:true,emailConsent:true}],profile:{businessAddress:'123 Test Street',emailConsentSources:[]}};globalThis.testDeliveries=[]});
const request=body=>new Request('http://localhost/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('one-time AI SMS can submit to open engaged follow-ups',async()=>{for(const patch of [{outcome:'Completed'},{stage:'Appointment'},{stage:'Quoted'},{outcome:'Call back later'}]){Object.assign(globalThis.testWorkspace.leads[0],{stage:'New lead',outcome:'Not contacted',...patch});const response=await sms(request({to:'8185550100',body:'Hi',sendMode:'ai',permissionDocumented:true}));assert.equal(response.status,200);globalThis.testDeliveries.length=0}});
test('AI SMS remains blocked for closed or terminal records',async()=>{for(const patch of [{outcome:'Interested'},{stage:'Closed'},{outcome:'Not interested'},{outcome:'Wrong number'}]){Object.assign(globalThis.testWorkspace.leads[0],{stage:'New lead',outcome:'Not contacted',...patch});const response=await sms(request({to:'8185550100',body:'Hi',sendMode:'ai',permissionDocumented:true}));assert.equal(response.status,403);assert.equal(globalThis.testDeliveries.length,0)}});
test('manual SMS still sends for Interested leads',async()=>{globalThis.testWorkspace.leads[0].outcome='Interested';const response=await sms(request({to:'8185550100',body:'My personal follow-up'}));assert.equal(response.status,200);assert.equal(globalThis.testDeliveries.length,1);assert.equal(globalThis.testDeliveries[0].automated,false)});
test('AI email submits subject and body for an eligible contact',async()=>{const response=await email(request({leadId:1,to:'test@example.com',subject:'Requested information',text:'Your information',sendMode:'ai'}));assert.equal(response.status,200);assert.equal(globalThis.testDeliveries[0].subject,'Requested information');assert.match(globalThis.testDeliveries[0].text,/Your information/)});
test('AI email keeps explicit interested guard',async()=>{globalThis.testWorkspace.leads[0].outcome='Interested';const response=await email(request({leadId:1,to:'test@example.com',subject:'Info',text:'Hello',sendMode:'ai'}));assert.notEqual(response.status,200);assert.equal(globalThis.testDeliveries.length,0)});
test('scheduled automation rereads state and catches a lead closed after planning',async()=>{await assertAutomatedContact('test','8185550100','sms');globalThis.testWorkspace.leads[0].stage='Closed';await assert.rejects(()=>assertAutomatedContact('test','8185550100','sms'),/paused/)});
test('a reply pauses scheduled automation while one-time owner-reviewed SMS remains available',async()=>{
 globalThis.testWorkspace.leads[0].lastInboundAt='2026-09-14T16:00:00Z';
 await assert.rejects(()=>assertAutomatedContact('test','8185550100','sms',true),/paused/);
 const oneTime=await sms(request({to:'8185550100',body:'Owner-reviewed follow-up',sendMode:'ai',permissionDocumented:true}));assert.equal(oneTime.status,200);assert.equal(globalThis.testDeliveries.length,1);
});
test('SMS without permission is blocked and documenting permission enables personal sending',async()=>{
 globalThis.testWorkspace.leads[0].smsConsent=false;
 const blocked=await sms(request({to:'8185550100',body:'Hello'}));assert.equal(blocked.status,403);assert.equal(globalThis.testDeliveries.length,0);
 const allowed=await sms(request({to:'8185550100',body:'Hello',permissionDocumented:true}));assert.equal(allowed.status,200);assert.equal(globalThis.testWorkspace.leads[0].smsConsent,true);
});
test('interested provider disposition blocks both scheduled and one-time AI',async()=>{
 globalThis.testWorkspace.leads[0].sourceDisposition='Interested - Working';
 assert.equal((await sms(request({to:'8185550100',body:'Hello',sendMode:'ai',permissionDocumented:true}))).status,403);
 await assert.rejects(()=>assertAutomatedContact('test','8185550100','sms',true),/paused/);
});

test('an AI request cannot fabricate SMS consent',async()=>{globalThis.testWorkspace.leads[0].smsConsent=false;const response=await sms(request({to:'8185550100',body:'Hello',sendMode:'ai',permissionDocumented:true}));assert.equal(response.status,403);assert.equal(globalThis.testWorkspace.leads[0].smsConsent,false)});
test('manual sends honor opt out on duplicate records',async()=>{globalThis.testWorkspace.leads.push({...globalThis.testWorkspace.leads[0],id:2,smsOptOut:true});assert.equal((await sms(request({to:'8185550100',body:'Hello'}))).status,403);assert.equal(globalThis.testDeliveries.length,0)});
