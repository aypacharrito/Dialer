import test from 'node:test';
import assert from 'node:assert/strict';
import {applyControlCommands,defaultRule,matchesOutreach,inOutreachWindow} from '../app/lib/ai-control.ts';
import {reconcileCallCalendar} from '../app/lib/call-calendar.ts';
const leads=[{id:1,name:'New',stage:'New lead',source:'Referral'},{id:2,name:'Follow',stage:'Follow-up',source:'Import'}];
test('saved audience switches and exclusions restrict eligible outreach by channel',()=>{
 const result=applyControlCommands({leads},[{kind:'outreach',channel:'sms',audience:'follow-ups',excludeSources:['Referral'],dailyAt:'09:00',timeZone:'America/Los_Angeles',salesEnabled:true}],'request-test-1234');
 const rule=result.workspace.aiControl.rules.sms;
 assert.equal(matchesOutreach(leads[0],rule),false);assert.equal(matchesOutreach(leads[1],rule),true);
 assert.equal(inOutreachWindow(rule,new Date('2026-09-25T16:30:00Z')),true);assert.equal(inOutreachWindow(rule,new Date('2026-09-25T17:00:00Z')),false);
 assert.equal(inOutreachWindow(rule,new Date('2026-12-25T17:30:00Z')),true);
 assert.equal(matchesOutreach(leads[1],{...defaultRule(),excludeIds:[2]}),false);
 assert.equal(matchesOutreach(leads[1],result.workspace.aiControl.rules.email),true);
 assert.throws(()=>applyControlCommands({leads},[{kind:'outreach',channel:'sms',audience:'selected',ids:[99]}],'request-test-1234'),/workspace/);
});
test('calendar command validation is atomic and cancels prior pending texts on edits',()=>{
 const original={leads,officeItems:[{id:'event',leadId:2,kind:'appointment',title:'Review',dueAt:'2026-09-26T16:00:00Z',status:'open',reminderState:'pending',reminderAt:'2026-09-26T15:00:00Z'}]};
 const saved=applyControlCommands(original,[{kind:'calendar',calendarAction:'edit',eventId:'event',dueAt:'2026-09-26T18:00:00Z'}],'request-test-1234');
 assert.equal(saved.workspace.officeItems[0].reminderState,'off');assert.equal(original.officeItems[0].reminderState,'pending');
 assert.throws(()=>applyControlCommands(original,[{kind:'outreach',channel:'sms',enabled:false},{kind:'calendar',calendarAction:'create',title:'Bad date',dueAt:'2026-09-26T09:00'}],'request-test-1234'),/time zone/);assert.equal(original.aiControl,undefined);
});
test('only explicit interested callbacks become persisted calendar events; completion and removal survive autosaves',()=>{
 const cold={id:2,name:'Person',stage:'Follow-up',outcome:'Call back later',followUp:'2026-09-26T09:00',followUpUtc:'2026-09-26T16:00:00Z'};
 assert.deepEqual(reconcileCallCalendar([], [cold], []),[]);
 const warm={...cold,outcome:'Interested'},events=reconcileCallCalendar([cold],[warm],[]);
 assert.equal(events.length,1);assert.equal(events[0].dueAt,'2026-09-26T16:00:00Z');assert.match(events[0].title,/Interested callback/);
 assert.deepEqual(reconcileCallCalendar([warm],[warm],[]),[]);
 assert.equal(reconcileCallCalendar([warm],[warm],[{...events[0],status:'done'}])[0].status,'done');
 assert.deepEqual(reconcileCallCalendar([warm],[cold],events),[]);
 assert.equal(reconcileCallCalendar([warm],[{...warm,followUpUtc:'2026-09-27T16:00:00Z'}],events)[0].id,events[0].id);
 assert.deepEqual(reconcileCallCalendar([warm],[{...warm,deletedAt:'now'}],events),[]);
});
