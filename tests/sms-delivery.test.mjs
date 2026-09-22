import test from "node:test";
import assert from "node:assert/strict";
import {smsDeliveryLabel} from "../app/lib/sms-delivery.ts";
test("carrier acceptance is distinct from confirmed delivery",()=>{
 for(const status of ["accepted","queued","scheduled","sending"])assert.equal(smsDeliveryLabel(status),"Sending");
 assert.equal(smsDeliveryLabel("sent"),"Carrier accepted");
 assert.equal(smsDeliveryLabel("delivered"),"Delivered ✓");
 for(const status of ["failed","undelivered"])assert.equal(smsDeliveryLabel(status),"Delivery failed");
 assert.equal(smsDeliveryLabel("received"),"Received");
 assert.equal(smsDeliveryLabel(""),"Unknown");
});

test('delivery guidance explains errors without exposing provider codes',async()=>{
 const {smsFailureMessage}=await import('../app/lib/sms-delivery.ts');
 assert.match(smsFailureMessage(30003),/phone was unreachable/);
 assert.match(smsFailureMessage(21610),/opted out/);
 assert.match(smsFailureMessage(30005),/cannot receive texts/);
 assert.match(smsFailureMessage(30007),/network blocked/);
 for(const code of [30003,21610,30005,30007,30034,20003,undefined,99999]){
  assert.match(smsFailureMessage(code),/^Pacifica CRM:/);
  assert.doesNotMatch(smsFailureMessage(code),/Twilio|30003|99999/);
 }
});
