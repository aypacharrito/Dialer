import assert from "node:assert/strict";
import test from "node:test";
import { crmFieldsForDisposition, isDialerEligibleLead, leadPriority, rankLeads, sourceDispositionForOutcome, suggestedRetryAt } from "../app/lib/lead-priority.ts";

const now=Date.parse("2026-08-26T18:00:00Z");

function lead(overrides={}){
  return {
    id:1,
    stage:"New lead",
    outcome:"Not contacted",
    followUp:"",
    importedAt:"2026-08-20T18:00:00Z",
    lastContact:"Never",
    sourceDisposition:"Received - not worked yet",
    doNotCall:false,
    attempts:0,
    ...overrides,
  };
}

test("fresh untouched leads rise above older untouched leads",()=>{
  const fresh=lead({id:2,received:"2026-08-26T17:58:00Z"});
  const stale=lead({id:1,received:"2026-08-20T18:00:00Z"});
  assert.equal(rankLeads([stale,fresh],now)[0].id,fresh.id);
  assert.equal(leadPriority(fresh,now).reason,"Just arrived");
});

test("a spreadsheet imported today is not falsely treated as a newly received lead",()=>{
  const recentlyImported=lead({id:1,importedAt:"2026-08-26T17:58:00Z"});
  const trulyFresh=lead({id:2,received:"2026-08-26T17:58:00Z",importedAt:"2026-08-26T17:58:00Z"});
  assert.equal(rankLeads([recentlyImported,trulyFresh],now)[0].id,trulyFresh.id);
  assert.equal(leadPriority(recentlyImported,now).reason,"Recently imported");
});

test("interest and due follow-ups affect the next-best order",()=>{
  const ordinary=lead({id:1});
  const interested=lead({id:2,outcome:"Interested",stage:"Follow-up"});
  const overdue=lead({id:3,outcome:"No answer",stage:"Follow-up",followUp:"2026-08-24T18:00:00Z",attempts:1});
  assert.deepEqual(rankLeads([ordinary,interested,overdue],now).map(item=>item.id),[interested.id,overdue.id,ordinary.id]);
  assert.equal(leadPriority(overdue,now).reason,"Overdue follow-up");
});

test("manual priority can promote a salesperson-selected lead",()=>{
  const normal=lead({id:1,received:"2026-08-26T16:00:00Z"});
  const pinned=lead({id:2,priorityOverride:"high"});
  assert.equal(rankLeads([normal,pinned],now)[0].id,pinned.id);
  assert.equal(leadPriority(pinned,now).reason,"Pinned high priority");
});

test("closed and do-not-call records are excluded from active priority",()=>{
  assert.equal(leadPriority(lead({stage:"Closed"}),now).score,-1000);
  assert.equal(leadPriority(lead({doNotCall:true}),now).score,-1000);
});

test("automatic retry stays in business hours",()=>{
  const retry=suggestedRetryAt(new Date("2026-08-26T17:30:00"));
  assert.match(retry,/2026-08-27T09:00/);
});

test("not interested is never mistaken for interested",()=>{
  assert.deepEqual(crmFieldsForDisposition("Lost - Not Interested"),{stage:"Closed",outcome:"Not interested"});
  assert.equal(sourceDispositionForOutcome("SmartFinancial","Not interested",""),"Lost - Not Interested");
});

test("automatic dialing skips active policy work while retaining retryable leads",()=>{
  assert.equal(isDialerEligibleLead(lead({outcome:"Interested",stage:"Follow-up",sourceDisposition:"Interested - Working"})),false);
  assert.equal(isDialerEligibleLead(lead({outcome:"Appointment set",stage:"Appointment",sourceDisposition:"Interested - Working"})),false);
  assert.equal(isDialerEligibleLead(lead({outcome:"No answer",stage:"Follow-up",sourceDisposition:"Attempted Contact"})),true);
  assert.equal(isDialerEligibleLead(lead({doNotCall:true})),false);
});

test("SmartFinancial interest maps back to its working disposition",()=>{
  assert.equal(sourceDispositionForOutcome("SmartFinancial","Interested","Received - not worked yet"),"Interested - Working");
});
