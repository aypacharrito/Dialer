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
