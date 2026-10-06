import test from "node:test";import assert from "node:assert/strict";
import {smsRecipients,blocksAiText,blocksAutomatedText} from "../app/lib/ai-sms-recipients.ts";
import {audienceMessageTargets,oneTimeMessageAudience,messageChannel} from "../app/lib/ai-message-plan.ts";
const base={phone:"8185550100",stage:"Follow-up",outcome:"Call back later"};
test("one-time and scheduled AI both select neutral follow-ups",()=>{
 const lead={id:1,...base};assert.equal(blocksAiText(lead),false);assert.equal(blocksAutomatedText(lead),false);assert.deepEqual(smsRecipients([lead]).map(x=>x.id),[1]);
});
test("STOP, DNC, deletion and closed records remain hard blocked",()=>{
 for(const patch of [{smsOptOut:true},{doNotCall:true},{deletedAt:"now"},{stage:"Closed"},{outcome:"Not interested"},{outcome:"Wrong number"}])assert.deepEqual(smsRecipients([{id:1,...base,...patch}]),[],JSON.stringify(patch));
});
test("all follow-ups means all open follow-up records, not a model-selected sample",()=>{
 const leads=[{id:1,name:"A",stage:"Follow-up"},{id:2,name:"B",stage:"New lead",attempts:2},{id:3,name:"C",stage:"New lead",outcome:"No answer"},{id:4,name:"D",stage:"New lead"}];
 assert.deepEqual(audienceMessageTargets("follow-ups",leads).map(x=>x.id),[1,2,3]);
});

test('natural plural texts and emails select the requested audience, while exclusions stay manual',()=>{
 for(const prompt of ['do texts for all followups','draft messages for all follow-ups','prepare emails for new leads'])assert.ok(oneTimeMessageAudience(prompt));
 assert.equal(oneTimeMessageAudience('do texts for all followups'),'follow-ups');
 assert.equal(messageChannel('do texts for all followups','email'),'sms');
 assert.equal(messageChannel('draft emails for all followups','sms'),'email');
 assert.equal(oneTimeMessageAudience('texts for all followups except Sam'),null);
 assert.equal(oneTimeMessageAudience('texts for all followups every day'),null);
});
