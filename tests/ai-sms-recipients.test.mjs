import test from "node:test";import assert from "node:assert/strict";
import {smsRecipients} from "../app/lib/ai-sms-recipients.ts";
import {leadAiContext} from "../app/lib/business-context.ts";
test("SMS attestation supports unrecorded permission without overriding STOP, DNC or deletion",()=>{
 const contacts=[{id:1,phone:"8185550100"},{id:2,phone:"+1 (818) 555-0100"},{id:3,phone:"8185550101",smsOptOut:true},{id:4,phone:"8185550102",doNotCall:true},{id:5,phone:"8185550103",deletedAt:"today"},{id:6,phone:"123"}];
 assert.deepEqual(smsRecipients(contacts).map(x=>x.id),[1]);
});
test("AI receives actual phone and consent fields",()=>{
 const context=leadAiContext({id:1,phone:"8185550100",smsConsent:true,smsOptOut:false});
 assert.equal(context.phone,"8185550100");assert.equal(context.smsConsent,true);assert.equal(context.smsOptOut,false);
});
