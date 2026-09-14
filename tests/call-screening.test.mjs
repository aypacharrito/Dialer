import test from 'node:test';
import assert from 'node:assert/strict';
import {screeningDecision,createCallScreening} from '../app/lib/call-screening.ts';
import {rankDialerLeads,refreshDialerRun,isDialerEligibleLead} from '../app/lib/lead-priority.ts';
const sid='CA123';
test('only a matched ending-beep verdict can auto-skip voicemail',()=>{
 assert.equal(screeningDecision({callSid:sid,answeredBy:'machine_end_beep'},sid,false),'skip-voicemail');
 for(const by of ['human','unknown','fax','machine_start','machine_end_silence','machine_end_other'])assert.equal(screeningDecision({callSid:sid,answeredBy:by},sid,false),'connect');
 assert.equal(screeningDecision({callSid:sid,humanDetected:true,answeredBy:'machine_end_beep'},sid,false),'connect');
 assert.equal(screeningDecision({callSid:'other',answeredBy:'machine_end_beep'},sid,false),'wait');
 assert.equal(screeningDecision({callSid:sid,answeredBy:'machine_end_beep'},sid,true),'wait');
});
test('manual connect makes delayed voicemail detection unable to hang up',async()=>{
 let resolve;let connected=0,skipped=0;
 const screen=createCallScreening({callSid:()=>sid,read:()=>new Promise(r=>{resolve=r}),connect:()=>connected++,skip:()=>skipped++});
 try{const pending=screen.check();screen.connect();resolve({callSid:sid,answeredBy:'machine_end_beep'});await pending;assert.equal(connected,1);assert.equal(skipped,0);}finally{screen.dispose();}
});
test('screening timeout connects instead of hanging up and disposal ignores late results',async()=>{
 let connected=0,skipped=0;
 const screen=createCallScreening({callSid:()=>sid,read:async()=>null,connect:()=>connected++,skip:()=>skipped++,maxWaitMs:5});
 try{screen.accept();await new Promise(r=>setTimeout(r,20));assert.equal(connected,1);assert.equal(skipped,0);}finally{screen.dispose();}
 let resolve;const stale=createCallScreening({callSid:()=>sid,read:()=>new Promise(r=>{resolve=r}),connect:()=>connected++,skip:()=>skipped++});
 const pending=stale.check();stale.dispose();resolve({callSid:sid,answeredBy:'machine_end_beep'});await pending;assert.equal(skipped,0);
});
test('network no-answer and busy skip once; unknown never skips',async()=>{
 for(const status of ['no-answer','busy']){
 let skipped=0;const screen=createCallScreening({callSid:()=>sid,read:async()=>({callSid:sid,detectionStatus:status}),connect:()=>assert.fail('must not connect'),skip:()=>skipped++});
 try{await screen.check();await screen.check();assert.equal(skipped,1);}finally{screen.dispose();}
 }
});
test('new untouched leads outrank overdue follow-ups and enter an existing saved run',()=>{
 const base={stage:'New lead',outcome:'Not contacted',followUp:'',importedAt:'2026-09-14',lastContact:'Never',sourceDisposition:'New',doNotCall:false,attempts:0};
 const fresh={...base,id:1,received:'2026-09-14T12:00:00Z'};
 const retry={...base,id:2,outcome:'No answer',stage:'Follow-up',attempts:4,followUp:'2026-09-01'};
 assert.equal(isDialerEligibleLead(fresh),true);assert.deepEqual(rankDialerLeads([retry,fresh]).map(x=>x.id),[1,2]);assert.deepEqual(refreshDialerRun([2],[retry,fresh]).map(x=>x.id),[1,2]);
 assert.deepEqual(refreshDialerRun([],[retry]).map(x=>x.id),[]);
});
