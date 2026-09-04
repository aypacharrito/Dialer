import assert from "node:assert/strict";
import test from "node:test";
import { mergeProviderLeads } from "../app/lib/provider-lead-merge.ts";

const baseLead={id:1,vendorId:"sf-1",source:"SmartFinancial",name:"Ana Test",phone:"(818) 555-0100",email:"ana@example.com",city:"Van Nuys",product:"Auto",line:"home-auto",sourceDisposition:"Received - not worked yet",stage:"New lead",outcome:"Not contacted",status:"Ready",leadCost:10,notes:"Keep this note",followUp:"2026-08-27T09:00",doNotCall:false,attempts:2,extraFields:{campaign:"A"}};
const provider={id:"delivery-1",vendorId:"sf-1",source:"SmartFinancial",name:"Ana Test",phone:"8185550100",email:"ana@example.com",city:"Van Nuys",product:"Auto",line:"home-auto",disposition:"Interested - Working",notes:"",cost:10,createdAt:"2026-08-26T17:00:00Z",extraFields:{tier:"Gold"}};

test("provider status updates merge without erasing salesperson work",()=>{
  const result=mergeProviderLeads([baseLead],[provider],()=>{throw new Error("should not create")},"2026-08-26T18:00:00Z");
  assert.equal(result.added,0);assert.equal(result.updated,1);
  assert.equal(result.leads[0].stage,"Follow-up");assert.equal(result.leads[0].outcome,"Interested");
  assert.equal(result.leads[0].notes,"Keep this note");assert.equal(result.leads[0].followUp,"2026-08-27T09:00");assert.equal(result.leads[0].attempts,2);
  assert.deepEqual(result.leads[0].extraFields,{campaign:"A",tier:"Gold"});
});

test("a stale received status cannot demote active local work",()=>{
  const active={...baseLead,stage:"Follow-up",outcome:"Interested",sourceDisposition:"Interested - Working"};
  const stale={...provider,disposition:"Received - not worked yet",email:"new-email@example.com",cost:0};
  const result=mergeProviderLeads([active],[stale],()=>{throw new Error("should not create")});
  assert.equal(result.leads[0].stage,"Follow-up");assert.equal(result.leads[0].outcome,"Interested");assert.equal(result.leads[0].sourceDisposition,"Interested - Working");assert.equal(result.leads[0].email,"new-email@example.com");assert.equal(result.leads[0].leadCost,10);
});

test("unchanged provider records keep the same array and do not trigger cloud writes",()=>{
  const current={...baseLead,sourceDisposition:"Interested - Working",stage:"Follow-up",outcome:"Interested",extraFields:{campaign:"A",tier:"Gold"}};
  const result=mergeProviderLeads([current],[provider],()=>{throw new Error("should not create")});
  assert.equal(result.updated,0);assert.equal(result.leads[0],current);assert.equal(result.leads.length,1);
});

test("provider sync cannot undo a manual queue change",()=>{
  const moved={...baseLead,line:"life",queueOverride:true};
  const changedProduct={...provider,product:"Home",line:"home-auto"};
  const result=mergeProviderLeads([moved],[changedProduct],()=>{throw new Error("should not create")});
  assert.equal(result.leads[0].line,"life");
  assert.equal(result.leads[0].queueOverride,true);
});
