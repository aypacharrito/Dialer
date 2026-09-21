import test from 'node:test';
import assert from 'node:assert/strict';
import {assertSmsDeliveryHistory} from '../app/lib/sms-preflight.ts';
const now=Date.parse('2026-09-21T20:00:00Z');
const record=(age,code=30003,status='undelivered')=>({date_created:new Date(now-age*3600000).toISOString(),error_code:code,status});
test('first attempt is allowed; a recent unreachable handset is blocked before submission',()=>{
 assert.doesNotThrow(()=>assertSmsDeliveryHistory([],now));
 assert.throws(()=>assertSmsDeliveryHistory([record(1)],now),/Pacifica blocked.*24 hours/);
});
test('repeated unreachable failures across days stay paused for a week',()=>{
 assert.throws(()=>assertSmsDeliveryHistory([record(48),record(96)],now),/7 days/);
 assert.doesNotThrow(()=>assertSmsDeliveryHistory([record(200),record(220)],now));
});
test('a newer delivery clears the temporary failure block; queued does not',()=>{
 assert.doesNotThrow(()=>assertSmsDeliveryHistory([record(2),record(1,null,'delivered')],now));
 assert.throws(()=>assertSmsDeliveryHistory([record(2),record(1,null,'queued')],now),/before sending/);
});
test('opt-out, invalid destination and filtering errors are held locally',()=>{
 for(const code of [21610,30005,30006,30007,30034])assert.throws(()=>assertSmsDeliveryHistory([record(1,code)],now),/before sending/);
});
