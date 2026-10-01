import test from 'node:test';import assert from 'node:assert/strict';
import {pendingReplyReview,reviewReply} from '../app/lib/reply-interest.ts';
import {mergeCloudContact} from '../app/lib/contact-sync.ts';
import {applyCandidates,thread} from '../app/lib/conversation-calendar.ts';
import {clearDetailOverlap,constrainPanel,overlaps} from '../app/lib/dialer-layout.ts';
const reply={id:'r1',providerId:'SM1',channel:'sms',direction:'inbound',body:'Yes',status:'received',sentAt:'2026-10-01T16:00:00Z',provider:'twilio'};
const lead={id:1,name:'Test Contact',phone:'8185550100',email:'example@example.test',outcome:'Completed',stage:'Follow-up',automationEnabled:true,communications:[reply]};
test('opening a new reply prompts once; Yes locks all copies of that contact',()=>{
 assert.equal(pendingReplyReview(lead,[reply],'sms'),reply);
 const [saved,duplicate]=reviewReply([lead,{...lead,id:2}],{leadId:1,channel:'sms',replyId:'SM1',interested:true},new Date('2026-10-01T17:00:00Z'));
 assert.equal(saved.outcome,'Interested');assert.equal(saved.automationEnabled,false);assert.equal(duplicate.automationEnabled,false);assert.equal(saved.automationNextAt,'');
 assert.equal(pendingReplyReview(saved,[reply],'sms'),null);
 const stale={...lead,workflowUpdatedAt:'2026-10-01T15:00:00Z'};
 assert.equal(mergeCloudContact(stale,saved).outcome,'Interested');assert.equal(mergeCloudContact(saved,stale).automationEnabled,false);
});
test('Not yet only records the review; the next reply prompts again',()=>{
 const [saved]=reviewReply([lead],{leadId:1,channel:'sms',replyId:'SM1',interested:false});
 assert.equal(saved.automationEnabled,true);assert.equal(saved.outcome,'Completed');assert.equal(pendingReplyReview(saved,[reply],'sms'),null);
 assert.ok(pendingReplyReview(saved,[{...reply,id:'r2',providerId:'SM2',sentAt:'2026-10-02T16:00:00Z'}],'sms'));
});
test('interest decisions never reopen closed, STOP, DNC, or deleted records',()=>{
 for(const patch of [{smsOptOut:true},{doNotCall:true},{stage:'Closed'},{deletedAt:'2026-10-01'}]){
  assert.equal(pendingReplyReview({...lead,...patch},[reply],'sms'),null);
  if(!patch.deletedAt){const [saved]=reviewReply([{...lead,...patch}],{leadId:1,channel:'sms',replyId:'SM1',interested:true});assert.notEqual(saved.outcome,'Interested');}
 }
 assert.throws(()=>reviewReply([lead],{leadId:1,channel:'sms',replyId:'invented',interested:true}),/syncing/);
});
test('email renewal dates become one all-day event, with exact inbound evidence',()=>{
 const now=Date.parse('2026-10-01T18:00:00Z'),message={...reply,channel:'email',body:'My policy renews November 12, 2026.'};
 const contact={...lead,communications:[message]},candidate={kind:'renewal',leadId:1,dueAt:'2026-11-12',scheduleId:'r1',scheduleQuote:message.body,interestId:'r1',interestQuote:message.body};
 assert.equal(thread(contact,now)[0].channel,'email');
 const result=applyCandidates([contact],[],[candidate],[],now);assert.equal(result.added,1);assert.equal(result.items[0].allDayDate,'2026-11-12');
 assert.equal(applyCandidates([contact],result.items,[candidate],[],now).added,0);
 assert.equal(applyCandidates([contact],[],[{...candidate,scheduleQuote:'invented'}],[],now).added,0);
 assert.equal(applyCandidates([contact],[],[{...candidate,dueAt:'2026-02-31'}],[],now).added,0);
 assert.equal(applyCandidates([{...contact,communications:[{...message,direction:'outbound'}]}],[],[candidate],[],now).added,0);
});
test('idle geometry stays within the viewport and call details move the keypad without mutating saved geometry',()=>{
 const bounded=constrainPanel({x:10000,y:8000,width:300,height:450},1000,250,440,600);assert.equal(bounded.y,150);
 const rects={keypad:{x:100,y:0,width:300,height:460},details:{x:0,y:0,width:500,height:400}};
 const next=clearDetailOverlap(rects,1000,true);assert.equal(overlaps(next.keypad,next.details),false);assert.equal(rects.keypad.x,100);
});
