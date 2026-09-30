import test from "node:test";import assert from "node:assert/strict";
import {smsRecipients,blocksAiText,blocksAutomatedText} from "../app/lib/ai-sms-recipients.ts";
import {audienceMessageTargets} from "../app/lib/ai-message-plan.ts";
const base={phone:"8185550100",stage:"Follow-up",outcome:"Call back later"};
test("one-time Pacifica AI can select open follow-ups while scheduled automation stays conservative",()=>{
 const lead={id:1,...base};assert.equal(blocksAiText(lead),false);assert.equal(blocksAutomatedText(lead),true);assert.deepEqual(smsRecipients([lead]).map(x=>x.id),[1]);
});
test("STOP, DNC, deletion and closed records remain hard blocked",()=>{
 for(const patch of [{smsOptOut:true},{doNotCall:true},{deletedAt:"now"},{stage:"Closed"},{outcome:"Not interested"},{outcome:"Wrong number"}])assert.deepEqual(smsRecipients([{id:1,...base,...patch}]),[],JSON.stringify(patch));
});
test("all follow-ups means all open follow-up records, not a model-selected sample",()=>{
 const leads=[{id:1,name:"A",stage:"Follow-up"},{id:2,name:"B",stage:"New lead",attempts:2},{id:3,name:"C",stage:"New lead",outcome:"No answer"},{id:4,name:"D",stage:"New lead"}];
 assert.deepEqual(audienceMessageTargets("follow-ups",leads).map(x=>x.id),[1,2,3]);
});
