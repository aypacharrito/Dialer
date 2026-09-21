import test from "node:test";
import assert from "node:assert/strict";
import {screeningDecision,createCallScreening} from "../app/lib/call-screening.ts";
import {rankDialerLeads,refreshDialerRun,isDialerEligibleLead} from "../app/lib/lead-priority.ts";
const sid="CA123";

test("HTTP can confirm no-answer but never classify voicemail or release audio",()=>{
  for(const status of ["in-progress","answered"])assert.equal(screeningDecision({callSid:sid,detectionStatus:status,answeredBy:"machine_end_beep"},sid),"wait");
  assert.equal(screeningDecision({callSid:sid,detectionStatus:"no-answer",answeredBy:"machine_end_beep"},sid),"skip-no-answer");
  for(const status of ["completed","ringing","busy","failed","canceled",""])assert.equal(screeningDecision({callSid:sid,detectionStatus:status,answeredBy:"machine_end_beep"},sid),"wait");
});

test("no-answer skips once; only SDK accept releases the conversation",async()=>{
  let skipped=0,connected=0;
  const noAnswer=createCallScreening({callSid:()=>sid,read:async()=>({callSid:sid,detectionStatus:"no-answer",answeredBy:"machine_end_beep"}),connect:()=>connected++,skip:()=>skipped++});
  try{await noAnswer.check();await noAnswer.check();assert.equal(skipped,1);assert.equal(connected,0)}finally{noAnswer.dispose()}
  const answered=createCallScreening({callSid:()=>sid,read:async()=>({callSid:sid,detectionStatus:"in-progress",answeredBy:"machine_end_beep"}),connect:()=>connected++,skip:()=>skipped++});
  try{await answered.check();await answered.check();assert.equal(connected,0);answered.accept();assert.equal(connected,1);assert.equal(skipped,1)}finally{answered.dispose()}
});

test("new untouched leads outrank overdue follow-ups and enter an existing saved run",()=>{
  const base={stage:"New lead",outcome:"Not contacted",followUp:"",importedAt:"2026-09-14",lastContact:"Never",sourceDisposition:"New",doNotCall:false,attempts:0};
  const fresh={...base,id:1,received:"2026-09-14T12:00:00Z"};
  const retry={...base,id:2,outcome:"No answer",stage:"Follow-up",attempts:4,followUp:"2026-09-01"};
  assert.equal(isDialerEligibleLead(fresh),true);
  assert.deepEqual(rankDialerLeads([retry,fresh]).map(x=>x.id),[1,2]);
  assert.deepEqual(refreshDialerRun([2],[retry,fresh]).map(x=>x.id),[1,2]);
  assert.deepEqual(refreshDialerRun([],[retry]).map(x=>x.id),[]);
});
test('a delayed no-answer result cannot skip a call answered or disposed while awaiting HTTP',async()=>{
 for(const action of ['accept','dispose']){
  let resolve,skipped=0,connected=0;
  const screen=createCallScreening({callSid:()=>sid,read:()=>new Promise(r=>{resolve=r}),connect:()=>connected++,skip:()=>skipped++});
  const check=screen.check();screen[action]();resolve({callSid:sid,detectionStatus:'no-answer'});await check;
  assert.equal(skipped,0);assert.equal(connected,action==='accept'?1:0);screen.dispose();
 }
});
