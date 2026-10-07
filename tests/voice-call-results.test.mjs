import test from 'node:test';import assert from 'node:assert/strict';
import {recordVoiceResult,reconcileVoiceStatus} from '../app/lib/voice-call-results.ts';
const run={id:'run',leadId:1,phone:'+18185550101',startedAt:Date.now()-30000,callSid:'CA'+'1'.repeat(32),state:'calling'};
function workspace(){return {leads:[{id:1,name:'Ana',phone:'8185550101',stage:'Follow-up',notes:'Keep exactly'}],callLogs:[],voicePilotHistory:[{id:run.id,leadId:1,phone:run.phone,startedAt:run.startedAt,outcome:'started',summary:''}]}}
test('voicemail results are written to call logs and history without modifying contacts',()=>{
 const original=workspace(),before=structuredClone(original),result=recordVoiceResult(original,run,'voicemail','Recorded greeting; no message left.');assert.equal(result.workspace.callLogs[0].outcome,'Voicemail');assert.equal(result.workspace.voicePilotHistory[0].outcome,'voicemail');assert.deepEqual(result.workspace.leads,before.leads);assert.deepEqual(original,before);
 const after=reconcileVoiceStatus({...result.workspace,callLogs:[{...result.workspace.callLogs[0],detectionStatus:'completed',detectedResult:'Unknown'}]},'run',run.callSid,run.phone);assert.equal(after.callLogs[0].detectedResult,'Voicemail');assert.equal(after.voicePilotHistory[0].outcome,'voicemail');
});
test('no-answer provider callbacks reconcile correctly both before and after browser completion',()=>{
 for(const beforeEnd of [true,false]){let current=workspace();if(!beforeEnd)current=recordVoiceResult(current,run,'completed','').workspace;current={...current,callLogs:[{callSid:run.callSid,detectionStatus:'no-answer',detectedResult:'No answer'}]};current=reconcileVoiceStatus(current,'run',run.callSid,run.phone);if(beforeEnd)current=recordVoiceResult(current,run,'completed','').workspace;assert.equal(current.callLogs[0].outcome,'No answer');assert.equal(current.voicePilotHistory[0].outcome,'no-answer');assert.equal(current.callLogs.length,1);assert.deepEqual(current.leads,workspace().leads)}
});
test('unrelated callbacks and generic completed callbacks cannot overwrite an explicit AI result',()=>{
 const current=recordVoiceResult(workspace(),run,'opt-out','Stop calling.').workspace;
 assert.equal(reconcileVoiceStatus(current,'other-run',run.callSid,run.phone),current);assert.equal(reconcileVoiceStatus(current,'run',run.callSid,'+18185550102'),current);
 const after=reconcileVoiceStatus({...current,callLogs:[{...current.callLogs[0],detectionStatus:'no-answer'}]},'run',run.callSid,run.phone);assert.equal(after.voicePilotHistory[0].outcome,'opt-out');assert.equal(after.callLogs[0].outcome,'Do not call');
});
