import assert from "node:assert/strict";
import test from "node:test";
import {prepareAutomationLead} from "../app/lib/follow-up-engine.ts";
import {mergeStoredWorkspace} from "../app/lib/workspace-storage.ts";
import {defaultWorkspaceProfile} from "../app/lib/workspace-profile.ts";

const profile={...defaultWorkspaceProfile,serverAutomationEnabled:true};
const lead=(patch={})=>({id:1,name:"Taylor",phone:"+18185550123",email:"taylor@example.com",city:"Van Nuys",product:"Estimate",stage:"New lead",outcome:"Not contacted",doNotCall:false,received:"2026-08-27T18:00:00Z",...patch});

test("production automation schedules a fresh lead five minutes after arrival",()=>{
  const result=prepareAutomationLead(lead(),profile,Date.parse("2026-08-27T18:01:00Z"));
  assert.equal(result.automationSequenceId,"speed-to-lead");
  assert.equal(result.automationNextAt,"2026-08-27T18:05:00.000Z");
  assert.equal(result.automationStatus,"scheduled");
});

test("human replies, appointments, and dead letters never silently restart",()=>{
  assert.equal(prepareAutomationLead(lead({outcome:"Interested"}),profile).automationNextAt,"");
  assert.equal(prepareAutomationLead(lead({stage:"Appointment",outcome:"Appointment set"}),profile).automationNextAt,"");
  const dead=prepareAutomationLead(lead({automationStatus:"needs attention",automationNextAt:"2026-08-27T17:00:00Z"}),profile);
  assert.equal(dead.automationStatus,"needs attention");
  assert.equal(dead.automationNextAt,"");
});

test("server replies and automation progress survive a stale browser save",()=>{
  const serverLead=lead({lastInboundAt:"2026-08-27T18:10:00Z",automationUpdatedAt:"2026-08-27T18:10:00Z",automationStep:2,automationStatus:"replied",automationNextAt:"",communications:[{id:"reply-1",channel:"email",direction:"inbound",body:"Call tomorrow",status:"received",sentAt:"2026-08-27T18:10:00Z",provider:"resend"}]});
  const clientLead=lead({automationUpdatedAt:"2026-08-27T18:00:00Z",automationStep:0,automationStatus:"scheduled",automationNextAt:"2026-08-27T18:05:00Z",communications:[]});
  const merged=mergeStoredWorkspace({leads:[serverLead],callLogs:[],profile},{leads:[clientLead],callLogs:[],profile});
  const result=merged.leads[0];
  assert.equal(result.automationStatus,"replied");
  assert.equal(result.automationStep,2);
  assert.equal(result.communications.length,1);
});

test("recording intelligence merges into the browser call log by Call SID",()=>{
  const serverLog={id:"recording-CA123",callSid:"CA123",recordingSid:"RE123",transcript:"Customer wants Tuesday",aiSummary:"Tuesday follow-up"};
  const clientLog={id:"browser-log",callSid:"CA123",name:"Taylor",status:"Completed"};
  const merged=mergeStoredWorkspace({leads:[],callLogs:[serverLog],profile},{leads:[],callLogs:[clientLog],profile});
  assert.equal(merged.callLogs.length,1);
  assert.equal(merged.callLogs[0].id,"browser-log");
  assert.equal(merged.callLogs[0].recordingSid,"RE123");
  assert.equal(merged.callLogs[0].transcript,"Customer wants Tuesday");
});
