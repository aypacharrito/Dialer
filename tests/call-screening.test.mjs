import test from "node:test";
import assert from "node:assert/strict";
import {screeningDecision,createCallScreening} from "../app/lib/call-screening.ts";
import {rankDialerLeads,refreshDialerRun,isDialerEligibleLead} from "../app/lib/lead-priority.ts";
const sid="CA123";

test("screening uses network status only and never classifies voicemail",()=>{
  for(const status of ["in-progress","answered","completed"])assert.equal(screeningDecision({callSid:sid,detectionStatus:status,answeredBy:"machine_end_beep"},sid,false),"connect");
  assert.equal(screeningDecision({callSid:sid,detectionStatus:"no-answer",answeredBy:"machine_end_beep"},sid,false),"skip-no-answer");
  for(const status of ["ringing","busy","failed","canceled",""])assert.equal(screeningDecision({callSid:sid,detectionStatus:status,answeredBy:"machine_end_beep"},sid,false),"wait");
});

test("no-answer skips once and answered only connects",async()=>{
  let skipped=0,connected=0;
  const noAnswer=createCallScreening({callSid:()=>sid,read:async()=>({callSid:sid,detectionStatus:"no-answer",answeredBy:"machine_end_beep"}),connect:()=>connected++,skip:()=>skipped++});
  try{await noAnswer.check();await noAnswer.check();assert.equal(skipped,1);assert.equal(connected,0)}finally{noAnswer.dispose()}
  const answered=createCallScreening({callSid:()=>sid,read:async()=>({callSid:sid,detectionStatus:"in-progress",answeredBy:"machine_end_beep"}),connect:()=>connected++,skip:()=>skipped++});
  try{await answered.check();await answered.check();assert.equal(connected,1);assert.equal(skipped,1)}finally{answered.dispose()}
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
