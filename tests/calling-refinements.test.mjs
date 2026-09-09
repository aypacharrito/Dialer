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
 const result=automationRunFeedback({ok:true,followUps});assert.match(result,/Checked 5 due/);assert.match(result,/2 sent/);assert.match(result,/1 task created/);assert.match(result,/1 failed/);assert.doesNotMatch(result,/undefined/);
});
test('an empty successful run is explicit and an incomplete payload never implies success',()=>{
 assert.match(automationRunFeedback({ok:true,followUps:{due:0,sent:0,tasksCreated:0,fallbacks:0,blocked:0,failed:0,deadLettered:0}}),/no follow-ups are due/);
 for(const bad of [{},{ok:true},{ok:true,followUps:{due:1}},null])assert.throws(()=>automationRunFeedback(bad),/incomplete status/);
});
test('quiet dialing defaults on for legacy profiles and persists an explicit opt-out',()=>{
 assert.equal(cleanWorkspaceProfile({}).quietDialing,true);assert.equal(cleanWorkspaceProfile({quietDialing:false}).quietDialing,false);
});
