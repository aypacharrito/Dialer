import test from 'node:test';
import assert from 'node:assert/strict';
import {automationRunFeedback} from '../app/lib/automation-feedback.ts';
import {postCallDraftForEnd,selectPostCallOutcome} from '../app/lib/post-call.ts';
import {isDialerEligibleLead} from '../app/lib/lead-priority.ts';
import {refreshAutomation} from '../app/lib/lead-automation.ts';
import {cleanWorkspaceProfile} from '../app/lib/workspace-profile.ts';
const now=new Date('2026-09-08T12:00:00');
const lead={id:1,stage:'New lead',outcome:'Not contacted',source:'SmartFinancial',sourceDisposition:'New',followUp:'',notes:'Existing notes',doNotCall:false,importedAt:now.toISOString()};
test('callback stays neutral and becomes eligible only at its scheduled time',()=>{
 const draft=selectPostCallOutcome(postCallDraftForEnd(lead,'Completed',true,now),lead.source,'Call back later',now);
 assert.equal(draft.crmStage,'Follow-up');assert.equal(draft.sourceDisposition,'Contacted');assert.equal(draft.appointmentAt,'2026-09-08T14:00');
 const callback={...lead,stage:draft.crmStage,outcome:draft.crmOutcome,sourceDisposition:draft.sourceDisposition,followUp:draft.appointmentAt};
 assert.equal(isDialerEligibleLead(callback,now.getTime()),false);
 assert.equal(isDialerEligibleLead(callback,new Date('2026-09-08T14:00').getTime()),true);
 assert.equal(isDialerEligibleLead({...callback,followUp:''},now.getTime()),false);
 const refreshed=refreshAutomation({...callback,automationEnabled:true},now.getTime());
 assert.equal(refreshed.automationNextAt,'');assert.equal(refreshed.automationStatus,'waiting for salesperson');
});
test('manual call wrap-up preserves closed contacts even after an unanswered retry',()=>{
 for(const connected of [true,false]){
  const closed={...lead,stage:'Closed',outcome:'Not interested',sourceDisposition:'Lost - Not Interested'};
  const draft=postCallDraftForEnd(closed,connected?'Completed':'No answer',connected,now);
  assert.equal(draft.crmStage,'Closed');assert.equal(draft.crmOutcome,'Not interested');
  const retry=selectPostCallOutcome(draft,lead.source,'No answer',now,true);
  assert.equal(retry.crmStage,'Closed');assert.equal(retry.appointmentAt,'');assert.equal(retry.sourceDisposition,'Lost - Not Interested');
  assert.equal(isDialerEligibleLead(closed,now.getTime()),false);
 }
});
test('changing a mistaken closed result on an open contact still permits a correction',()=>{
 const initial=postCallDraftForEnd(lead,'Completed',true,now);
 const closed=selectPostCallOutcome(initial,lead.source,'Not interested',now);
 assert.equal(selectPostCallOutcome(closed,lead.source,'Call back later',now).crmStage,'Follow-up');
});
test('automation feedback reads nested counts, including task creation and failures',()=>{
 const followUps={due:5,sent:2,tasksCreated:1,fallbacks:1,blocked:1,failed:1,deadLettered:0};
 const result=automationRunFeedback({ok:true,followUps});assert.match(result,/Checked 5 automated steps/);assert.match(result,/2 sent/);assert.match(result,/1 task created/);assert.match(result,/1 failed/);assert.doesNotMatch(result,/undefined/);
});
test('an empty successful run is explicit and an incomplete payload never implies success',()=>{
 assert.match(automationRunFeedback({ok:true,followUps:{due:0,sent:0,tasksCreated:0,fallbacks:0,blocked:0,failed:0,deadLettered:0}}),/no automated sequence steps are due/);
 for(const bad of [{},{ok:true},{ok:true,followUps:{due:1}},null])assert.throws(()=>automationRunFeedback(bad),/incomplete status/);
});
test('quiet dialing defaults on for legacy profiles and persists an explicit opt-out',()=>{
 assert.equal(cleanWorkspaceProfile({}).quietDialing,true);assert.equal(cleanWorkspaceProfile({quietDialing:false}).quietDialing,false);
});

import {configureCallAudio,openCallMicrophone,callSetupMessage} from '../app/lib/call-audio-setup.ts';
import {defaultAudioPreferences} from '../app/audio-preferences.ts';
import {mergeIncomingContacts,contactMatches} from '../app/lib/contact-sync.ts';
import {hasContactPermission} from '../app/lib/contact-permission.ts';

test('missing saved output devices recover to the current default before dialing',async()=>{
 const chosen=[];const audio={availableInputDevices:new Map([['default',{}]]),availableOutputDevices:new Map([['default',{}],['usb',{}]]),isOutputSelectionSupported:true,setInputDevice:async id=>chosen.push(['input',id]),speakerDevices:{set:async id=>chosen.push(['speaker',id])},ringtoneDevices:{set:async id=>chosen.push(['ring',id])}};
 const patch=await configureCallAudio(audio,{...defaultAudioPreferences,speaker:'disconnected-airpods',ring:'old-device'});
 assert.deepEqual(chosen,[['input','default'],['speaker','default'],['ring','default']]);assert.deepEqual(patch,{speaker:'default',ring:'default'});
 chosen.length=0;assert.deepEqual(await configureCallAudio(audio,{...defaultAudioPreferences,speaker:'usb'}),{});assert.deepEqual(chosen[1],['speaker','usb']);
});
test('a missing microphone can fall back, but blocked permission is never retried',async()=>{
 const requests=[],stream={};const preferences={...defaultAudioPreferences,input:'old-mic'};
 const result=await openCallMicrophone(preferences,async request=>{requests.push(request);if(requests.length===1)throw {name:'NotFoundError'};return stream});
 assert.equal(result.input,'default');assert.equal(requests[1].audio.deviceId,undefined);
 let count=0;await assert.rejects(openCallMicrophone(preferences,async()=>{count++;throw new DOMException('blocked','NotAllowedError')}));assert.equal(count,1);
 assert.doesNotMatch(callSetupMessage(new Error('Devices not found: secret-device-id')),/secret-device-id/);
});
test('a real output error remains visible rather than silently dialing with no audio',async()=>{
 const audio={availableInputDevices:new Map([['default',{}]]),availableOutputDevices:new Map([['default',{}]]),isOutputSelectionSupported:true,setInputDevice:async()=>{},speakerDevices:{set:async()=>{throw new Error('Speaker hardware failed')}},ringtoneDevices:{set:async()=>{}}};
 await assert.rejects(configureCallAudio(audio,defaultAudioPreferences),/Speaker hardware failed/);
});
test('cloud inbound contacts appear without dropping local edits or duplicating phones',()=>{
 const local=[{id:1,phone:'8185550100',name:'Existing',notes:'Unsaved note'}],fresh={id:2,phone:'8185550101',name:'Website lead'};
 const merged=mergeIncomingContacts(local,[{...local[0],notes:'old'},fresh]);assert.equal(merged[0],fresh);assert.equal(merged[1],local[0]);
 assert.equal(mergeIncomingContacts(merged,[fresh]),merged);assert.equal(mergeIncomingContacts(local,[{id:3,phone:'+1 (818) 555-0100'}]),local);
 assert.equal(contactMatches(fresh,'website 818-555'),true);assert.equal(contactMatches(fresh,'other'),false);
});
test('source permission is channel-specific and opt-outs always win',()=>{
 const profile=cleanWorkspaceProfile({smsConsentSources:['SmartFinancial'],emailConsentSources:['Website']});
 assert.equal(hasContactPermission({source:'smartfinancial'},profile,'sms'),true);assert.equal(hasContactPermission({source:'SmartFinancial'},profile,'email'),false);
 assert.equal(hasContactPermission({source:'Unknown'},profile,'sms'),false);assert.equal(hasContactPermission({source:'SmartFinancial'},cleanWorkspaceProfile({}),'sms'),false);
 for(const blocked of [{smsOptOut:true},{doNotCall:true},{deletedAt:'2026-09-10'}])assert.equal(hasContactPermission({source:'SmartFinancial',smsConsent:true,...blocked},profile,'sms'),false);
});
