import test from 'node:test';import assert from 'node:assert/strict';
import {voiceCallingHours,voicePhone,voicePilotEligible,voicePilotPrompt} from '../app/lib/voice-pilot.ts';
import {createVoiceRouteToken,verifyVoiceRouteToken} from '../app/lib/voice-route-token.ts';
test('AI voice eligibility excludes stopped, closed, interested, paused and invalid contacts',()=>{
 const lead={id:1,phone:'8185550101',stage:'Follow-up',outcome:'Completed'};assert.equal(voicePilotEligible(lead),true);
 for(const patch of [{doNotCall:true},{smsOptOut:true},{deletedAt:'today'},{stage:'Closed'},{outcome:'Interested'},{automationEnabled:false},{phone:'555'}])assert.equal(voicePilotEligible({...lead,...patch}),false);
 assert.equal(voicePhone('+1 (818) 555-0101'),'+18185550101');assert.equal(voicePhone('+44 7911 123456'),'');
});
test('recipient calling hours use their declared zone and fail closed on invalid zones',()=>{
 assert.equal(voiceCallingHours('America/Los_Angeles',Date.parse('2026-10-06T16:00:00Z')),true);
 assert.equal(voiceCallingHours('America/Los_Angeles',Date.parse('2026-10-06T03:00:00Z')),false);
 assert.equal(voiceCallingHours('bad/zone'),false);
});
test('AI voice route claims bind the approved destination and expire after a short window',async()=>{
 const token=await createVoiceRouteToken({workspaceId:'one',identity:'one',phoneNumber:'+18185550999',purpose:'ai-call',destination:'+18185550101',runId:'r1'},'test',90);
 const claim=await verifyVoiceRouteToken(token,'test');assert.equal(claim.destination,'+18185550101');assert.equal(claim.runId,'r1');assert.ok(claim.expiresAt<=Date.now()/1000+90);
 assert.equal(await verifyVoiceRouteToken(token,'other'),null);
 assert.match(voicePilotPrompt('Agency','David'),/never claim to be human/i);assert.match(voicePilotPrompt('Agency','David'),/Wait silently/);
});
test('queue removes duplicate phones, opted-out duplicates, hot leads and recent attempts without rewriting contacts',async()=>{
 const {voiceQueue,callerOptOut}=await import('../app/lib/voice-pilot.ts');
 const leads=[{id:1,name:'Auto',phone:'8185550101',product:'Auto'},{id:2,name:'Duplicate',phone:'+18185550101'},{id:3,phone:'8185550102',product:'Home'},{id:4,phone:'8185550103',product:'Auto'},{id:5,phone:'8185550103',doNotCall:true},{id:6,phone:'8185550104',outcome:'Interested'}];const original=structuredClone(leads);
 const now=Date.now(),history=[{id:'call',leadId:3,phone:'+18185550102',startedAt:now-1000,outcome:'no-answer',summary:''}];
 assert.deepEqual(voiceQueue(leads,[],history).map(l=>l.id),[1]);assert.deepEqual(voiceQueue(leads,[],[],'home').map(l=>l.id),[3]);assert.deepEqual(leads,original);
 assert.equal(callerOptOut('No me llames otra vez'),true);assert.equal(callerOptOut('No me llamen'),true);assert.equal(callerOptOut('I have two cars'),false);
});
