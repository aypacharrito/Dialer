import assert from "node:assert/strict";
import test from "node:test";
import {postCallDraftForEnd,selectPostCallOutcome} from "../app/lib/post-call.ts";

const lead={stage:"New lead",outcome:"Not contacted",source:"SmartFinancial",sourceDisposition:"Received - not worked yet",followUp:"",notes:"Existing note"};
const now=new Date("2026-08-27T10:00:00");

test("connected calls start neutral instead of being marked interested",()=>{
  const draft=postCallDraftForEnd(lead,"Completed",true,now);
  assert.equal(draft.crmOutcome,"Completed");
  assert.equal(draft.crmStage,"Follow-up");
  assert.equal(draft.sourceDisposition,"Contacted");
  assert.equal(draft.notes,"Existing note");
});

test("unanswered calls get a retry without silently saving",()=>{
  const draft=postCallDraftForEnd(lead,"Timed out",false,now);
  assert.equal(draft.crmOutcome,"No answer");
  assert.equal(draft.sourceDisposition,"Attempted Contact");
  assert.equal(draft.appointmentAt,"2026-08-27T12:00");
});

test("interested and appointment outcomes map to active pipeline stages",()=>{
  const initial=postCallDraftForEnd(lead,"Completed",true,now);
  const interested=selectPostCallOutcome(initial,lead.source,"Interested",now);
  assert.equal(interested.crmStage,"Follow-up");
  assert.equal(interested.sourceDisposition,"Interested - Working");
  const appointment=selectPostCallOutcome(interested,lead.source,"Appointment set",now);
  assert.equal(appointment.crmStage,"Appointment");
});

test("closed outcomes clear follow-ups and stop active queueing",()=>{
  const initial={...postCallDraftForEnd(lead,"Completed",true,now),appointmentAt:"2026-08-30T09:00"};
  for(const outcome of ["Not interested","Wrong number","Sold / Won"]){
    const result=selectPostCallOutcome(initial,lead.source,outcome,now);
    assert.equal(result.crmStage,"Closed");
    assert.equal(result.appointmentAt,"");
  }
});
