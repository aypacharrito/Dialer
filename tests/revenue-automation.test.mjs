import assert from "node:assert/strict";
import test from "node:test";
import { nextAutomationAfterAttempt, refreshAutomation } from "../app/lib/lead-automation.ts";
import { revenueSummary } from "../app/lib/revenue.ts";

test("revenue totals and ROI are computed by source",()=>{
  const result=revenueSummary([
    {source:"Google",leadCost:100,stage:"Closed",outcome:"Sold / Won",estimatedValue:1000,closedRevenue:1200},
    {source:"Google",leadCost:50,stage:"Follow-up",outcome:"Interested",estimatedValue:800},
    {source:"Referral",leadCost:0,stage:"Appointment",outcome:"Appointment set",estimatedValue:500},
  ]);
  assert.equal(result.totals.spend,150);
  assert.equal(result.totals.revenue,1200);
  assert.equal(result.totals.pipeline,1300);
  assert.equal(result.sources.find(row=>row.source==="Google")?.roi,700);
});

test("automation creates a five-minute speed-to-lead action",()=>{
  const now=Date.parse("2026-08-26T18:00:00Z");
  const lead=refreshAutomation({id:1,stage:"New lead",outcome:"Not contacted",doNotCall:false,importedAt:"2026-08-26T17:58:00Z",received:"2026-08-26T17:58:00Z"},now);
  assert.equal(lead.automationStatus,"scheduled");
  assert.equal(lead.automationNextAt,"2026-08-26T18:03:00.000Z");
});

test("automation pauses closed records and spaces retry attempts",()=>{
  const now=Date.parse("2026-08-26T18:00:00Z");
  const closed=refreshAutomation({id:2,stage:"Closed",outcome:"Not interested",doNotCall:false,importedAt:"2026-08-20T18:00:00Z",automationEnabled:true,automationNextAt:"2026-08-26T17:00:00Z",automationStatus:"scheduled"},now);
  assert.equal(closed.automationStatus,"paused");
  assert.equal(nextAutomationAfterAttempt(1,now),"2026-08-26T20:00:00.000Z");
  assert.equal(nextAutomationAfterAttempt(4,now),"");
});
